import { Controller, Get, Post, Param, Query, Body, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { InternalRole } from '@prisma/client';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER)
  @ApiOperation({ summary: 'List internal users' })
  @ApiQuery({ name: 'role', enum: InternalRole, required: false })
  async findAll(
    @Query() pagination: PaginationDto,
    @Query('role') role?: InternalRole,
  ) {
    return this.usersService.findAll(pagination, { role });
  }

  @Get(':id')
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER)
  @ApiOperation({ summary: 'Get internal user detail' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles(InternalRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create internal user' })
  async create(
    @Body() dto: {
      email: string;
      password: string;
      fullName: string;
      role: InternalRole;
      department?: string;
      employeeId?: string;
    },
  ) {
    return this.usersService.create(dto);
  }
}
