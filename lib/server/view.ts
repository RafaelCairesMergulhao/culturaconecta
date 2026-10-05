import { jamOpen } from "../music";
import type { ClientState, Database, PublicUser, Stats, UserRecord } from "../types";

const DAY = 24 * 60 * 60 * 1000;

function toPublic(user: UserRecord, viewer: UserRecord): PublicUser {
  const { passwordHash: _password, edital, ...rest } = user;
  const own = viewer.id === user.id;
  if (!own && viewer.role !== "moderator") return { ...rest, edital: null, limited: false };
  return { ...rest, edital: own ? edital ?? null : null };
}

function blockedWith(viewer: UserRecord, handle: string, blocks: Database["blocks"]) {
  return blocks.some(
    (block) =>
      (block.blocker === viewer.handle && block.blocked === handle) ||
      (block.blocked === viewer.handle && block.blocker === handle)
  );
}

export function userFromToken(db: Database, token: string | null): UserRecord | null {
  if (!token) return null;
  const session = db.sessions.find((item) => item.token === token);
  if (!session) return null;
  return db.users.find((user) => user.id === session.userId) ?? null;
}

function stats(db: Database): Stats {
  const cutoff = Date.now() - DAY;
  return {
    users: db.users.filter((user) => user.role === "member").length,
    posts: db.posts.filter((post) => !post.hidden).length,
    events: db.events.length,
    opportunities: db.opportunities.filter((item) => item.open && !item.hidden).length,
    stories: db.stories.filter((item) => !item.hidden && new Date(item.createdAt).getTime() > cutoff).length,
  };
}

export function toClient(db: Database, viewer: UserRecord | null): ClientState {
  if (!viewer) {
    return {
      me: null,
      users: [],
      posts: [],
      comments: [],
      reactions: [],
      reposts: [],
      follows: [],
      notifications: [],
      messages: [],
      reports: [],
      blocks: [],
      rsvps: [],
      events: [],
      sponsors: [],
      testimonials: [],
      stories: [],
      opportunities: [],
      applications: [],
      participations: [],
      jams: [],
      jamMembers: [],
      stats: stats(db),
    };
  }

  const moderator = viewer.role === "moderator";
  const hide = (handle: string) => blockedWith(viewer, handle, db.blocks);

  const posts = db.posts.filter((post) => (moderator || !post.hidden) && !hide(post.authorHandle));
  const postIds = new Set(posts.map((post) => post.id));
  const comments = db.comments.filter(
    (comment) => postIds.has(comment.postId) && (moderator || !comment.hidden) && !hide(comment.authorHandle)
  );
  const cutoff = Date.now() - DAY;
  const stories = db.stories.filter(
    (story) => !story.hidden && new Date(story.createdAt).getTime() > cutoff && !hide(story.authorHandle)
  );
  const opportunities = db.opportunities.filter(
    (item) => (moderator || !item.hidden) && !hide(item.authorHandle)
  );
  const mineOpps = new Set(
    db.opportunities.filter((item) => item.authorHandle === viewer.handle).map((item) => item.id)
  );

  return {
    me: toPublic(viewer, viewer),
    users: db.users.map((user) => toPublic(user, viewer)),
    posts,
    comments,
    reactions: db.reactions.filter((item) => postIds.has(item.postId)),
    reposts: db.reposts.filter((item) => postIds.has(item.postId)),
    follows: db.follows,
    notifications: db.notifications.filter((item) => item.userHandle === viewer.handle).slice(0, 120),
    messages: db.messages.filter(
      (item) =>
        (item.fromHandle === viewer.handle || item.toHandle === viewer.handle) && (moderator || !item.hidden)
    ),
    reports: db.reports.filter((item) => moderator || item.reporterHandle === viewer.handle),
    blocks: db.blocks.filter((item) => item.blocker === viewer.handle),
    rsvps: db.rsvps,
    events: db.events,
    sponsors: db.sponsors,
    testimonials: db.testimonials.filter((item) => !item.authorHandle || !hide(item.authorHandle)),
    stories,
    opportunities,
    applications: db.applications.filter(
      (item) => item.applicantHandle === viewer.handle || mineOpps.has(item.opportunityId)
    ),
    participations: db.participations.filter((item) => {
      if (hide(item.userHandle)) return false;
      if (item.status === "declarada" || item.status === "confirmada") return true;
      return moderator || item.userHandle === viewer.handle || item.organizerHandle === viewer.handle;
    }),
    jams: db.jams.filter((jam) => jamOpen(jam) && !hide(jam.hostHandle)),
    jamMembers: db.jamMembers.filter((member) => !hide(member.userHandle)),
    stats: stats(db),
  };
}
