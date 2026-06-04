'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { socialApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, cn } from '@/lib/utils';
import {
  Heart, MessageCircle, Send, Image as ImageIcon, Video, Trash2, X,
  Users, CornerDownLeft,
} from 'lucide-react';

interface Post {
  id: string;
  authorType: 'FARMER' | 'BUYER';
  authorId: string;
  authorName: string;
  content: string;
  mediaUrls: string[];
  mediaType: 'NONE' | 'IMAGE' | 'VIDEO';
  createdAt: string;
  commentCount: number;
  reactionCount: number;
  reactedByMe: boolean;
}

export default function CommunityPage() {
  const { user, isFarmer } = useAuth();
  const roleParam = isFarmer ? 'FARMER' : 'BUYER';
  const myAuthorId = isFarmer ? (user as any)?.farmer?.id : (user as any)?.buyer?.id;
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['social-feed', roleParam],
    queryFn: () => socialApi.feed(roleParam).then((r) => r.data),
  });
  const posts: Post[] = data?.data ?? [];

  return (
    <div className="sm:p-6 max-w-2xl mx-auto space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        <Users size={20} className="text-brand-600" />
        <h1 className="text-lg font-bold text-gray-900">المجتمع</h1>
      </div>

      {/* Composer */}
      <PostComposer roleParam={roleParam} onPosted={() => qc.invalidateQueries({ queryKey: ['social-feed'] })} />

      {/* Feed */}
      {isLoading ? (
        <div className="py-12 text-center text-gray-400 text-sm">جارٍ التحميل…</div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm">
          <Users size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">لا توجد منشورات بعد</p>
          <p className="text-gray-400 text-sm mt-1">
            {isFarmer ? 'انشر أول منشور لتصل لمتابعيك' : 'تابع المزارع لترى منشوراتهم هنا، أو انشر منشورك'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} roleParam={roleParam} myAuthorId={myAuthorId} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Post composer ───────────────────────────────────────────────
function PostComposer({ roleParam, onPosted }: { roleParam: string; onPosted: () => void }) {
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'IMAGE' | 'VIDEO' | null>(null);
  const [showMedia, setShowMedia] = useState(false);

  const create = useMutation({
    mutationFn: () =>
      socialApi.createPost(
        {
          content: content.trim(),
          mediaUrls: mediaUrl.trim() ? [mediaUrl.trim()] : [],
          mediaType: mediaUrl.trim() ? (mediaType || 'IMAGE') : 'NONE',
        },
        roleParam,
      ),
    onSuccess: () => {
      setContent(''); setMediaUrl(''); setMediaType(null); setShowMedia(false);
      onPosted();
    },
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        placeholder="بماذا تفكر؟ شارك تحديثاتك ومنتجاتك…"
        className="w-full text-sm resize-none focus:outline-none placeholder:text-gray-400"
      />

      {showMedia && (
        <div className="flex items-center gap-2">
          <input
            type="url"
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="https://… رابط صورة أو فيديو"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          <select
            value={mediaType || 'IMAGE'}
            onChange={(e) => setMediaType(e.target.value as 'IMAGE' | 'VIDEO')}
            className="border border-gray-200 rounded-lg px-2 py-2 text-xs bg-white"
          >
            <option value="IMAGE">صورة</option>
            <option value="VIDEO">فيديو</option>
          </select>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-gray-100 pt-3">
        <button
          onClick={() => setShowMedia((s) => !s)}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-brand-600 transition-colors"
        >
          <ImageIcon size={15} /> / <Video size={15} />
          إضافة وسائط
        </button>
        <button
          onClick={() => create.mutate()}
          disabled={create.isPending || !content.trim()}
          className="flex items-center gap-1.5 bg-brand-600 text-white text-sm font-bold px-5 py-2 rounded-xl hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          <Send size={14} />
          {create.isPending ? 'جارٍ النشر…' : 'نشر'}
        </button>
      </div>
    </div>
  );
}

// ── Post card (with like + comments + replies) ──────────────────
function PostCard({ post, roleParam, myAuthorId }: { post: Post; roleParam: string; myAuthorId?: string | null }) {
  const qc = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [liked, setLiked] = useState(post.reactedByMe);
  const [likeCount, setLikeCount] = useState(post.reactionCount);
  const isMine = !!myAuthorId && post.authorId === myAuthorId;

  const like = useMutation({
    mutationFn: () => socialApi.toggleLike(post.id, roleParam),
    onMutate: () => {
      // optimistic
      setLiked((v) => !v);
      setLikeCount((c) => (liked ? c - 1 : c + 1));
    },
    onSuccess: (res: any) => {
      const d = res.data?.data ?? res.data;
      if (d) { setLiked(d.reacted); setLikeCount(d.reactionCount); }
    },
    onError: () => {
      // rollback
      setLiked((v) => !v);
      setLikeCount((c) => (liked ? c + 1 : c - 1));
    },
  });

  const del = useMutation({
    mutationFn: () => socialApi.deletePost(post.id, roleParam),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social-feed'] }),
  });

  const avatarLetter = post.authorName?.[0] || '؟';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 pb-2">
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0',
          post.authorType === 'FARMER' ? 'bg-brand-600' : 'bg-amber-500',
        )}>
          {avatarLetter}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900 truncate">{post.authorName}</p>
          <p className="text-xs text-gray-400">
            {post.authorType === 'FARMER' ? '🌾 مزرعة' : '🛒 مشترٍ'} · {formatDate(post.createdAt)}
          </p>
        </div>
        {isMine && (
          <button
            onClick={() => { if (confirm('حذف هذا المنشور؟ لا يمكن التراجع.')) del.mutate(); }}
            disabled={del.isPending}
            title="حذف المنشور"
            className="text-gray-300 hover:text-red-500 p-1.5 -mt-1 -ml-1 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Content */}
      {post.content && (
        <p className="px-4 pb-3 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{post.content}</p>
      )}

      {/* Media */}
      {post.mediaUrls?.length > 0 && (
        <div className="bg-gray-50">
          {post.mediaType === 'VIDEO' ? (
            <video src={post.mediaUrls[0]} controls className="w-full max-h-96 bg-black" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.mediaUrls[0]} alt="" className="w-full max-h-96 object-cover" />
          )}
        </div>
      )}

      {/* Counts */}
      <div className="px-4 py-2 flex items-center gap-4 text-xs text-gray-400 border-b border-gray-50">
        {likeCount > 0 && <span>{likeCount} إعجاب</span>}
        {post.commentCount > 0 && <span>{post.commentCount} تعليق</span>}
      </div>

      {/* Actions */}
      <div className="flex items-center divide-x divide-x-reverse divide-gray-100">
        <button
          onClick={() => like.mutate()}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors',
            liked ? 'text-red-600' : 'text-gray-500 hover:bg-gray-50',
          )}
        >
          <Heart size={16} className={liked ? 'fill-current' : ''} />
          إعجاب
        </button>
        <button
          onClick={() => setShowComments((s) => !s)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <MessageCircle size={16} />
          تعليق
        </button>
      </div>

      {showComments && <CommentThread postId={post.id} roleParam={roleParam} myAuthorId={myAuthorId} />}
    </div>
  );
}

// ── Comment thread (with nested replies) ────────────────────────
interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorType: 'FARMER' | 'BUYER';
  content: string;
  createdAt: string;
  parentId?: string | null;
  replies?: Comment[];
}

function CommentThread({ postId, roleParam, myAuthorId }: { postId: string; roleParam: string; myAuthorId?: string | null }) {
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['post-comments', postId],
    queryFn: () => socialApi.comments(postId).then((r) => r.data),
  });
  const comments: Comment[] = data?.data ?? data ?? [];

  const add = useMutation({
    mutationFn: () =>
      socialApi.addComment(postId, { content: text.trim(), parentId: replyTo?.id }, roleParam),
    onSuccess: () => {
      setText(''); setReplyTo(null);
      qc.invalidateQueries({ queryKey: ['post-comments', postId] });
      qc.invalidateQueries({ queryKey: ['social-feed'] });
    },
  });

  return (
    <div className="bg-gray-50 px-4 py-3 space-y-3">
      {/* Composer */}
      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && text.trim()) add.mutate(); }}
          placeholder={replyTo ? `الرد على ${replyTo.name}…` : 'اكتب تعليقاً…'}
          className="flex-1 bg-white border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
        {replyTo && (
          <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-red-400">
            <X size={16} />
          </button>
        )}
        <button
          onClick={() => add.mutate()}
          disabled={add.isPending || !text.trim()}
          className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 disabled:opacity-50"
        >
          <Send size={14} />
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-xs text-gray-400 text-center py-2">جارٍ تحميل التعليقات…</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-2">لا توجد تعليقات بعد — كن أول من يعلّق</p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="space-y-2">
              <CommentBubble
                comment={c}
                onReply={() => setReplyTo({ id: c.id, name: c.authorName })}
                onDelete={
                  myAuthorId && c.authorId === myAuthorId
                    ? () => {
                        if (confirm('حذف هذا التعليق؟')) {
                          socialApi.deleteComment(c.id, roleParam).then(() => {
                            qc.invalidateQueries({ queryKey: ['post-comments', postId] });
                            qc.invalidateQueries({ queryKey: ['social-feed'] });
                          });
                        }
                      }
                    : undefined
                }
              />
              {c.replies && c.replies.length > 0 && (
                <div className="mr-8 space-y-2">
                  {c.replies.map((r) => (
                    <CommentBubble
                      key={r.id}
                      comment={r}
                      compact
                      onDelete={
                        myAuthorId && r.authorId === myAuthorId
                          ? () => {
                              if (confirm('حذف هذا الرد؟')) {
                                socialApi.deleteComment(r.id, roleParam).then(() => {
                                  qc.invalidateQueries({ queryKey: ['post-comments', postId] });
                                });
                              }
                            }
                          : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CommentBubble({ comment, onReply, compact, onDelete }: { comment: Comment; onReply?: () => void; compact?: boolean; onDelete?: () => void }) {
  return (
    <div className="flex gap-2">
      <div className={cn(
        'rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0',
        compact ? 'w-6 h-6' : 'w-7 h-7',
        comment.authorType === 'FARMER' ? 'bg-brand-600' : 'bg-amber-500',
      )}>
        {comment.authorName?.[0] || '؟'}
      </div>
      <div className="min-w-0 flex-1">
        <div className="bg-white rounded-2xl px-3 py-2 inline-block">
          <p className="text-xs font-bold text-gray-900">{comment.authorName}</p>
          <p className="text-sm text-gray-700">{comment.content}</p>
        </div>
        <div className="flex items-center gap-3 mt-0.5 px-1">
          <span className="text-[10px] text-gray-400">{formatDate(comment.createdAt)}</span>
          {onReply && (
            <button onClick={onReply} className="text-[10px] text-gray-500 hover:text-brand-600 font-medium flex items-center gap-0.5">
              <CornerDownLeft size={9} /> رد
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="text-[10px] text-gray-400 hover:text-red-500 font-medium">
              حذف
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
