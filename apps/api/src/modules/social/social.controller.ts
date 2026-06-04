import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe,
  Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { SocialAuthorType } from '@prisma/client';
import { SocialService } from './social.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';

@ApiTags('Social')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('social')
export class SocialController {
  constructor(private readonly social: SocialService) {}

  // ── Feed (followed farms + own posts) ──────────────────────────
  @Get('feed')
  @ApiOperation({ summary: 'Follower feed for the current user' })
  @ApiQuery({ name: 'as', enum: ['FARMER', 'BUYER'], required: false })
  feed(
    @CurrentUser() user: AuthenticatedUser,
    @Query('as') as?: 'FARMER' | 'BUYER',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const author = this.social.resolveAuthor(user, as);
    return this.social.getFeed(author, page ? +page : 1, limit ? +limit : 20);
  }

  // ── Profile wall ───────────────────────────────────────────────
  @Get('wall/:authorType/:authorId')
  @ApiOperation({ summary: "A profile's wall (public, any authed viewer)" })
  wall(
    @CurrentUser() user: AuthenticatedUser,
    @Param('authorType') authorType: SocialAuthorType,
    @Param('authorId', ParseUUIDPipe) authorId: string,
    @Query('as') as?: 'FARMER' | 'BUYER',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // viewer is optional context (for reactedByMe) — resolve leniently
    let viewer;
    try { viewer = this.social.resolveAuthor(user, as); } catch { viewer = undefined; }
    return this.social.getWall(authorType, authorId, viewer, page ? +page : 1, limit ? +limit : 20);
  }

  // ── Posts ──────────────────────────────────────────────────────
  @Post('posts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a post as the current user' })
  createPost(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePostDto,
    @Query('as') as?: 'FARMER' | 'BUYER',
  ) {
    const author = this.social.resolveAuthor(user, as);
    return this.social.createPost(author, dto);
  }

  @Delete('posts/:id')
  @ApiOperation({ summary: 'Delete one of my posts' })
  deletePost(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('as') as?: 'FARMER' | 'BUYER',
  ) {
    const author = this.social.resolveAuthor(user, as);
    return this.social.deletePost(author, id);
  }

  // ── Comments ───────────────────────────────────────────────────
  @Get('posts/:id/comments')
  @ApiOperation({ summary: 'List comments (nested) for a post' })
  getComments(@Param('id', ParseUUIDPipe) id: string) {
    return this.social.getComments(id);
  }

  @Post('posts/:id/comments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a comment or reply to a post' })
  addComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCommentDto,
    @Query('as') as?: 'FARMER' | 'BUYER',
  ) {
    const author = this.social.resolveAuthor(user, as);
    return this.social.addComment(author, id, dto);
  }

  @Delete('comments/:id')
  @ApiOperation({ summary: 'Delete one of my comments' })
  deleteComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('as') as?: 'FARMER' | 'BUYER',
  ) {
    const author = this.social.resolveAuthor(user, as);
    return this.social.deleteComment(author, id);
  }

  // ── Reactions ──────────────────────────────────────────────────
  @Post('posts/:id/like')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle like on a post' })
  toggleLike(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('as') as?: 'FARMER' | 'BUYER',
  ) {
    const author = this.social.resolveAuthor(user, as);
    return this.social.toggleReaction(author, id);
  }
}
