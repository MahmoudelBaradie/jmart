import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma, SocialAuthorType, PostMediaType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user';

/** Resolved identity of the acting social author (farmer or buyer). */
interface Author {
  type: SocialAuthorType;
  id: string;
  name: string;
}

@Injectable()
export class SocialService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve the social author from the authenticated user, honoring an
   * optional explicit role (dual-role demo accounts). Falls back to
   * farmer-first, then buyer.
   */
  resolveAuthor(user: AuthenticatedUser, preferred?: 'FARMER' | 'BUYER'): Author {
    if (preferred === 'BUYER' && user.buyer?.id) {
      return { type: 'BUYER', id: user.buyer.id, name: user.buyer.businessName || 'مشترٍ' };
    }
    if (preferred === 'FARMER' && user.farmer?.id) {
      return { type: 'FARMER', id: user.farmer.id, name: user.farmer.businessName || 'مزرعة' };
    }
    if (user.farmer?.id) {
      return { type: 'FARMER', id: user.farmer.id, name: user.farmer.businessName || 'مزرعة' };
    }
    if (user.buyer?.id) {
      return { type: 'BUYER', id: user.buyer.id, name: user.buyer.businessName || 'مشترٍ' };
    }
    throw new ForbiddenException('User has no farmer or buyer profile to act as');
  }

  // ─── Posts ──────────────────────────────────────────────────────
  async createPost(author: Author, dto: {
    content: string; mediaUrls?: string[]; mediaType?: PostMediaType;
  }) {
    return this.prisma.socialPost.create({
      data: {
        authorType: author.type,
        authorId: author.id,
        authorName: author.name,
        content: dto.content,
        mediaUrls: dto.mediaUrls ?? [],
        mediaType: dto.mediaType ?? (dto.mediaUrls?.length ? PostMediaType.IMAGE : PostMediaType.NONE),
      },
    });
  }

  async deletePost(author: Author, postId: string) {
    const post = await this.prisma.socialPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorType !== author.type || post.authorId !== author.id) {
      throw new ForbiddenException('You can only delete your own posts');
    }
    await this.prisma.socialPost.delete({ where: { id: postId } });
    return { id: postId, deleted: true };
  }

  /**
   * A profile "wall" — all posts authored by a given (type,id), newest first,
   * with comment/reaction counts and whether the viewer reacted.
   */
  async getWall(targetType: SocialAuthorType, targetId: string, viewer?: Author, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [posts, total] = await Promise.all([
      this.prisma.socialPost.findMany({
        where: { authorType: targetType, authorId: targetId },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
        include: {
          _count: { select: { comments: true, reactions: true } },
        },
      }),
      this.prisma.socialPost.count({ where: { authorType: targetType, authorId: targetId } }),
    ]);
    return this.decorate(posts, viewer, total, page, limit);
  }

  /**
   * The follower feed — posts from farms the buyer follows (FarmFollow),
   * plus the viewer's own posts. Newest first.
   */
  async getFeed(viewer: Author, page = 1, limit = 20) {
    // farms the viewer follows → their farmerIds
    const follows = await this.prisma.farmFollow.findMany({
      where: { buyerId: viewer.type === 'BUYER' ? viewer.id : '00000000-0000-0000-0000-000000000000' },
      select: { farm: { select: { farmerId: true } } },
    });
    const followedFarmerIds = [...new Set(follows.map((f) => f.farm.farmerId))];

    const where: Prisma.SocialPostWhereInput = {
      OR: [
        // followed farmers' posts
        { authorType: 'FARMER', authorId: { in: followedFarmerIds.length ? followedFarmerIds : ['00000000-0000-0000-0000-000000000000'] } },
        // own posts
        { authorType: viewer.type, authorId: viewer.id },
      ],
    };

    const skip = (page - 1) * limit;
    const [posts, total] = await Promise.all([
      this.prisma.socialPost.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take: limit,
        include: { _count: { select: { comments: true, reactions: true } } },
      }),
      this.prisma.socialPost.count({ where }),
    ]);
    return this.decorate(posts, viewer, total, page, limit);
  }

  /** Attach `reactedByMe` + counts to a list of posts. */
  private async decorate(posts: any[], viewer: Author | undefined, total: number, page: number, limit: number) {
    let reactedIds = new Set<string>();
    if (viewer && posts.length) {
      const myReactions = await this.prisma.postReaction.findMany({
        where: {
          postId: { in: posts.map((p) => p.id) },
          authorType: viewer.type,
          authorId: viewer.id,
        },
        select: { postId: true },
      });
      reactedIds = new Set(myReactions.map((r) => r.postId));
    }
    const data = posts.map((p) => ({
      ...p,
      commentCount: p._count.comments,
      reactionCount: p._count.reactions,
      reactedByMe: reactedIds.has(p.id),
      _count: undefined,
    }));
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ─── Comments (with nested replies) ─────────────────────────────
  async getComments(postId: string) {
    const post = await this.prisma.socialPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    // Fetch all comments for the post, then nest replies under parents
    const all = await this.prisma.postComment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
    });
    const topLevel = all.filter((c) => !c.parentId);
    const repliesByParent = new Map<string, typeof all>();
    for (const c of all) {
      if (c.parentId) {
        const arr = repliesByParent.get(c.parentId) ?? [];
        arr.push(c);
        repliesByParent.set(c.parentId, arr);
      }
    }
    return topLevel.map((c) => ({ ...c, replies: repliesByParent.get(c.id) ?? [] }));
  }

  async addComment(author: Author, postId: string, dto: { content: string; parentId?: string }) {
    const post = await this.prisma.socialPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (dto.parentId) {
      const parent = await this.prisma.postComment.findUnique({ where: { id: dto.parentId } });
      if (!parent || parent.postId !== postId) throw new NotFoundException('Parent comment not found');
    }

    const comment = await this.prisma.postComment.create({
      data: {
        postId,
        parentId: dto.parentId ?? null,
        authorType: author.type,
        authorId: author.id,
        authorName: author.name,
        content: dto.content,
      },
    });

    // Notify the post owner (unless they commented on their own post)
    await this.notifyPostOwner(post, author, dto.parentId ? 'رد على منشورك' : 'علّق على منشورك');
    return comment;
  }

  async deleteComment(author: Author, commentId: string) {
    const comment = await this.prisma.postComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorType !== author.type || comment.authorId !== author.id) {
      throw new ForbiddenException('You can only delete your own comments');
    }
    await this.prisma.postComment.delete({ where: { id: commentId } });
    return { id: commentId, deleted: true };
  }

  // ─── Reactions (toggle like) ────────────────────────────────────
  async toggleReaction(author: Author, postId: string) {
    const post = await this.prisma.socialPost.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    const existing = await this.prisma.postReaction.findUnique({
      where: {
        postId_authorType_authorId: { postId, authorType: author.type, authorId: author.id },
      },
    });

    if (existing) {
      await this.prisma.postReaction.delete({ where: { id: existing.id } });
      const count = await this.prisma.postReaction.count({ where: { postId } });
      return { reacted: false, reactionCount: count };
    }

    await this.prisma.postReaction.create({
      data: { postId, authorType: author.type, authorId: author.id },
    });
    await this.notifyPostOwner(post, author, 'أعجب بمنشورك');
    const count = await this.prisma.postReaction.count({ where: { postId } });
    return { reacted: true, reactionCount: count };
  }

  /**
   * Best-effort notification to the post owner. Resolves the owner's userId
   * from their farmer/buyer profile and writes a Notification row.
   */
  private async notifyPostOwner(post: { authorType: SocialAuthorType; authorId: string }, actor: Author, verb: string) {
    // Don't notify yourself
    if (post.authorType === actor.type && post.authorId === actor.id) return;

    let userId: string | undefined;
    if (post.authorType === 'FARMER') {
      const f = await this.prisma.farmer.findUnique({ where: { id: post.authorId }, select: { userId: true } });
      userId = f?.userId;
    } else {
      const b = await this.prisma.buyer.findUnique({ where: { id: post.authorId }, select: { userId: true } });
      userId = b?.userId;
    }
    if (!userId) return;

    try {
      await this.prisma.notification.create({
        data: {
          recipientId: userId,
          recipientType: post.authorType, // 'FARMER' | 'BUYER'
          notificationType: 'SOCIAL_INTERACTION',
          title: 'تفاعل جديد',
          body: `${actor.name} ${verb}`,
          channels: ['IN_APP'],
          data: {},
        },
      });
    } catch {
      // Notification is best-effort; never block the social action on it.
    }
  }
}
