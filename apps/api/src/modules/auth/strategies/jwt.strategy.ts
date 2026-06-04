import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('auth.jwtAccessSecret'),
    });
  }

  async validate(payload: { sub: string; email: string; userType: string; role: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        internalUser: true,
        farmer: true,
        buyer: true,
        driver: true,
        shippingCompany: true,
      },
    });

    if (!user || user.deletedAt) throw new UnauthorizedException('User not found');
    if (user.status === 'SUSPENDED' || user.status === 'DEACTIVATED')
      throw new UnauthorizedException('Account is not active');

    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
