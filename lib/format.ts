import type { ClientState, Opportunity, Post, ReactionType, Shape } from "./types";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const SHAPE_CLIP: Record<Shape, string> = {
  triangulo: "polygon(50% 0%, 100% 100%, 0% 100%)",
  hexagono: "polygon(25% 4%, 75% 4%, 100% 50%, 75% 96%, 25% 96%, 0% 50%)",
  losango: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
  circulo: "circle(50% at 50% 50%)",
};

export const TRIANGLE = SHAPE_CLIP.triangulo;

export function mediaUrl(id?: string | null) {
  return id ? `/api/media/${id}` : null;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function userByHandle(state: ClientState, handle: string) {
  return state.users.find((user) => user.handle === handle);
}

export function reactionCount(state: ClientState, postId: string, type: ReactionType) {
  return state.reactions.filter((item) => item.postId === postId && item.type === type).length;
}

export function commentCount(state: ClientState, postId: string) {
  return state.comments.filter((item) => item.postId === postId && !item.hidden).length;
}

export function repostCount(state: ClientState, postId: string) {
  return state.reposts.filter((item) => item.postId === postId).length;
}

export function followerCount(state: ClientState, handle: string) {
  return state.follows.filter((item) => item.following === handle).length;
}

export function followingCount(state: ClientState, handle: string) {
  return state.follows.filter((item) => item.follower === handle).length;
}

export function isFollowing(state: ClientState, follower: string, following: string) {
  return state.follows.some((item) => item.follower === follower && item.following === following);
}

export function hasReaction(state: ClientState, postId: string, handle: string, type: ReactionType) {
  return state.reactions.some(
    (item) => item.postId === postId && item.userHandle === handle && item.type === type
  );
}

export function hasRepost(state: ClientState, postId: string, handle: string) {
  return state.reposts.some((item) => item.postId === postId && item.userHandle === handle);
}

export function isBlocked(state: ClientState, handle: string) {
  return state.blocks.some((item) => item.blocked === handle);
}

export function unreadCount(state: ClientState) {
  return state.notifications.filter((item) => !item.read).length;
}

export function activeStories(state: ClientState) {
  const cutoff = Date.now() - DAY;
  return state.stories
    .filter((story) => !story.hidden && new Date(story.createdAt).getTime() > cutoff)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function engagement(state: ClientState, postId: string) {
  const reactions = state.reactions.filter((item) => item.postId === postId).length;
  return reactions + 2 * commentCount(state, postId) + 1.5 * repostCount(state, postId);
}

export function interests(state: ClientState, handle: string) {
  const set = new Set<string>();
  const user = userByHandle(state, handle);
  for (const tag of user?.tags ?? []) set.add(tag.toLowerCase());
  for (const post of state.posts) {
    if (post.authorHandle === handle) set.add(post.category.toLowerCase());
  }
  set.delete("geral");
  set.delete("moderação");
  return set;
}

function eventsOf(state: ClientState, handle: string) {
  const ids = new Set(state.rsvps.filter((item) => item.userHandle === handle).map((item) => item.eventId));
  for (const event of state.events) {
    if (event.artistHandles.includes(handle) || event.createdBy === handle) ids.add(event.id);
  }
  return ids;
}

function interactionsBetween(state: ClientState, a: string, b: string) {
  const authorOf = new Map(state.posts.map((post) => [post.id, post.authorHandle]));
  let count = 0;
  for (const item of state.reactions) {
    const author = authorOf.get(item.postId);
    if ((item.userHandle === a && author === b) || (item.userHandle === b && author === a)) count += 1;
  }
  for (const item of state.comments) {
    const author = authorOf.get(item.postId);
    if ((item.authorHandle === a && author === b) || (item.authorHandle === b && author === a)) count += 2;
  }
  for (const post of state.posts) {
    const pair = [post.authorHandle, post.feat];
    if (post.featStatus === "aceito" && pair.includes(a) && pair.includes(b)) count += 4;
  }
  return count;
}

export type Tuning = { score: number; shared: string[] };

export function sintonia(state: ClientState, a: string, b: string): Tuning {
  if (a === b) return { score: 100, shared: [] };
  const mine = interests(state, a);
  const theirs = interests(state, b);
  const shared = [...mine].filter((item) => theirs.has(item));
  const union = new Set([...mine, ...theirs]);
  const tags = union.size ? shared.length / union.size : 0;
  const ab = isFollowing(state, a, b);
  const ba = isFollowing(state, b, a);
  const follow = ab && ba ? 1 : ab || ba ? 0.5 : 0;
  const evA = eventsOf(state, a);
  const sharedEvents = [...eventsOf(state, b)].filter((id) => evA.has(id)).length;
  const events = Math.min(1, sharedEvents / 2);
  const talk = Math.min(1, interactionsBetween(state, a, b) / 6);
  const score = Math.round(100 * (0.42 * tags + 0.2 * follow + 0.16 * events + 0.22 * talk));
  return { score: Math.min(99, score), shared };
}

export function opportunityMatch(state: ClientState, opp: Opportunity, handle: string) {
  if (!opp.tags.length) return 0;
  const mine = interests(state, handle);
  const hits = opp.tags.filter((tag) => mine.has(tag.toLowerCase())).length;
  return Math.round((100 * hits) / opp.tags.length);
}

export function bestOpportunity(state: ClientState, handle: string) {
  const applied = new Set(
    state.applications.filter((item) => item.applicantHandle === handle).map((item) => item.opportunityId)
  );
  let best: { opp: Opportunity; match: number } | null = null;
  for (const opp of state.opportunities) {
    if (!opp.open || opp.hidden || opp.authorHandle === handle || applied.has(opp.id)) continue;
    const match = opportunityMatch(state, opp, handle);
    if (match > 0 && (!best || match > best.match)) best = { opp, match };
  }
  return best;
}

export function forYouScore(state: ClientState, post: Post, me: string) {
  const hours = (Date.now() - new Date(post.createdAt).getTime()) / HOUR;
  const tune = post.authorHandle === me ? 40 : sintonia(state, me, post.authorHandle).score;
  return ((1 + engagement(state, post.id)) * (1 + tune / 60)) / Math.pow(hours + 2, 1.15);
}

export function pulse(state: ClientState, days = 7) {
  const since = Date.now() - days * DAY;
  const scores = new Map<string, { score: number; posts: number }>();
  for (const post of state.posts) {
    if (post.hidden || post.category === "Geral" || new Date(post.createdAt).getTime() < since) continue;
    const current = scores.get(post.category) ?? { score: 0, posts: 0 };
    current.score += 1 + engagement(state, post.id);
    current.posts += 1;
    scores.set(post.category, current);
  }
  return [...scores.entries()]
    .map(([category, value]) => ({ category, ...value }))
    .sort((a, b) => b.score - a.score);
}

export function rising(state: ClientState, days = 7) {
  const since = Date.now() - days * DAY;
  const scores = new Map<string, number>();
  for (const post of state.posts) {
    if (post.hidden || new Date(post.createdAt).getTime() < since) continue;
    const add = 1 + engagement(state, post.id);
    scores.set(post.authorHandle, (scores.get(post.authorHandle) ?? 0) + add);
    if (post.feat && post.featStatus === "aceito") {
      scores.set(post.feat, (scores.get(post.feat) ?? 0) + add / 2);
    }
  }
  return [...scores.entries()]
    .map(([handle, score]) => ({ handle, score: Math.round(score) }))
    .sort((a, b) => b.score - a.score);
}
