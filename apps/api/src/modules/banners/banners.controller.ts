import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe,
  Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InternalRole } from '@prisma/client';
import { BannersService } from './banners.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { ListBannersQueryDto } from './dto/list-banners-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';

@ApiTags('Banners')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  // ── Public-ish: any authed user → the banners they should see ──
  // The user's "primary zone" is resolved from farm/buyer-branch on the
  // client side; we accept it as a query param so the same user can see
  // different banners depending on the zone they're shopping for.
  @Get('marketplace')
  @ApiOperation({ summary: 'Banners visible to the current user (zone-filtered, date-windowed)' })
  visibleBanners(@Query('zoneId') zoneId?: string) {
    return this.bannersService.findVisible(zoneId);
  }

  // ── Admin endpoints ────────────────────────────────────────────
  @Get()
  @UseGuards(RolesGuard)
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER, InternalRole.OPS_SPECIALIST)
  @ApiOperation({ summary: 'List all banners (admin)' })
  findAll(@Query() query: ListBannersQueryDto) {
    return this.bannersService.findAll(query);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER, InternalRole.OPS_SPECIALIST)
  @ApiOperation({ summary: 'Get a banner by id (admin)' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.bannersService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a banner (admin)' })
  create(@Body() dto: CreateBannerDto, @CurrentUser() user: AuthenticatedUser) {
    return this.bannersService.create(dto, user?.id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.SUPER_ADMIN, InternalRole.OPS_MANAGER)
  @ApiOperation({ summary: 'Update a banner (admin)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBannerDto) {
    return this.bannersService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(InternalRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Delete a banner (super admin only)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.bannersService.remove(id);
  }
}
