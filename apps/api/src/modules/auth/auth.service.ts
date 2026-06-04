import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { UserType, UserStatus } from '@prisma/client';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async validateUser(email: string, password: string) {
    // SECURITY: collapse every auth-failure branch into ONE generic message so
    // an attacker cannot distinguish "email does not exist" from "password is
    // wrong" / "account suspended" — i.e. no user enumeration. We still run a
    // bcrypt compare against a dummy hash when the user is missing, so the
    // response time is constant-ish (no timing oracle either).
    const GENERIC = 'Invalid credentials';
    const DUMMY_HASH = '$2a$12$CwTycUXWue0Thq9StjUM0uJ8E1xgK4Q5kZdQ3wQpQX3p3wQpQX3pO';

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        internalUser: true,
        farmer: true,
        buyer: true,
        driver: true,
        shippingCompany: true,
      },
    });

    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH); // burn time
      throw new UnauthorizedException(GENERIC);
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) throw new UnauthorizedException(GENERIC);
    if (user.deletedAt) throw new UnauthorizedException(GENERIC);
    if (user.status === UserStatus.SUSPENDED) throw new UnauthorizedException(GENERIC);
    if (user.status === UserStatus.DEACTIVATED) throw new UnauthorizedException(GENERIC);

    return user;
  }

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    const tokens = await this.generateTokens(user);

    // Store refresh token
    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        refreshToken: await bcrypt.hash(tokens.refreshToken, 10),
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Emit login event for audit
    this.eventEmitter.emit('auth.login', {
      userId: user.id,
      userType: user.userType,
      ipAddress,
    });

    const userResult: Record<string, any> = { ...user };
    delete userResult['passwordHash'];
    return { user: userResult, ...tokens };
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });
    if (existingUser) throw new ConflictException('Email already registered');

    if (registerDto.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: registerDto.phone },
      });
      if (existingPhone) throw new ConflictException('Phone already registered');
    }

    const bcryptRounds = this.config.get<number>('auth.bcryptRounds', 12);
    const passwordHash = await bcrypt.hash(registerDto.password, bcryptRounds);

    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        phone: registerDto.phone,
        passwordHash,
        userType: registerDto.userType,
        status: UserStatus.PENDING_VERIFICATION,
      },
    });

    this.eventEmitter.emit('auth.register', { userId: user.id, userType: user.userType });

    const userResult: Record<string, any> = { ...user };
    delete userResult['passwordHash'];
    return userResult;
  }

  async refreshToken(dto: RefreshTokenDto) {
    // SECURITY: derive userId from the SIGNED refresh JWT, never trust the
    // client-supplied dto.userId. Without this, anyone who steals (or guesses)
    // any refresh token could pair it with a different userId in the body.
    let userIdFromToken: string;
    try {
      const payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: this.config.get('auth.jwtRefreshSecret'),
      });
      userIdFromToken = payload?.sub;
      if (!userIdFromToken) throw new Error('no sub');
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    // If a userId is also provided in the body, it must match — defence in depth.
    if (dto.userId && dto.userId !== userIdFromToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const sessions = await this.prisma.userSession.findMany({
      where: { userId: userIdFromToken, expiresAt: { gt: new Date() } },
      include: { user: { include: { internalUser: true, farmer: true, buyer: true, driver: true } } },
    });

    let validSession: typeof sessions[0] | null = null;
    for (const session of sessions) {
      const isValid = await bcrypt.compare(dto.refreshToken, session.refreshToken);
      if (isValid) {
        validSession = session;
        break;
      }
    }

    if (!validSession) throw new UnauthorizedException('Invalid refresh token');

    const tokens = await this.generateTokens(validSession.user as any);

    // Rotate refresh token
    await this.prisma.userSession.update({
      where: { id: validSession.id },
      data: {
        refreshToken: await bcrypt.hash(tokens.refreshToken, 10),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return tokens;
  }

  async logout(userId: string, refreshToken: string) {
    const sessions = await this.prisma.userSession.findMany({ where: { userId } });

    for (const session of sessions) {
      const isMatch = await bcrypt.compare(refreshToken, session.refreshToken);
      if (isMatch) {
        await this.prisma.userSession.delete({ where: { id: session.id } });
        break;
      }
    }
  }

  async logoutAll(userId: string) {
    await this.prisma.userSession.deleteMany({ where: { userId } });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        internalUser: true,
        farmer: { include: { farms: true } },
        buyer: { include: { branches: true } },
        driver: { include: { zoneAssignments: { include: { zone: true } } } },
        shippingCompany: true,
      },
    });
    if (!user) throw new UnauthorizedException('User not found');
    const { passwordHash, ...result } = user;
    return result;
  }

  private async generateTokens(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      userType: user.userType,
      role: user.internalUser?.role || null,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get('auth.jwtAccessSecret'),
        expiresIn: this.config.get('auth.jwtAccessExpiresIn'),
      }),
      this.jwtService.signAsync(
        { sub: user.id },
        {
          secret: this.config.get('auth.jwtRefreshSecret'),
          expiresIn: this.config.get('auth.jwtRefreshExpiresIn'),
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }
}
