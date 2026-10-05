import fs from "fs";
import { DEFAULT_PREFS } from "../policy";
import type { Database } from "../types";
import { dataDir, dbFile } from "./paths";
import { createSeed } from "./seed";

const VERSION = 4;

const ARRAY_KEYS = [
  "users",
  "posts",
  "comments",
  "reactions",
  "reposts",
  "follows",
  "notifications",
  "messages",
  "reports",
  "blocks",
  "rsvps",
  "sessions",
  "events",
  "sponsors",
  "testimonials",
  "stories",
  "opportunities",
  "applications",
  "participations",
  "jams",
  "jamMembers",
  "media",
] as const;

let memory: Database | null = null;
let queue: Promise<void> = Promise.resolve();

function migrate(raw: Partial<Database>): Database {
  const db = raw as Database;
  const bag = db as unknown as Record<string, unknown>;
  for (const key of ARRAY_KEYS) {
    if (!Array.isArray(bag[key])) bag[key] = [];
  }
  for (const user of db.users) {
    user.kind ??= user.role === "moderator" ? "publico" : "artista";
    user.city ??= "Vitória, ES";
    user.links ??= [];
    user.avatarId ??= null;
    user.coverId ??= null;
    user.prefs = { ...DEFAULT_PREFS, ...(user.prefs ?? {}) };
    user.niches ??= [];
    user.edital ??= null;
    delete (user as { achievements?: number }).achievements;
  }
  for (const post of db.posts) {
    post.imageId ??= null;
    post.music ??= null;
    post.feat ??= null;
    post.featStatus ??= null;
  }
  for (const event of db.events) {
    event.startsAt ??= null;
    event.createdBy ??= null;
    event.description ??= "";
  }
  for (const item of db.testimonials) {
    item.authorHandle ??= null;
    item.createdAt ??= new Date().toISOString();
  }
  for (const report of db.reports) {
    report.snapshot ??= "";
  }

  const version = db.version ?? 1;
  if (version < 2) {
    const seed = createSeed();
    for (const seedUser of seed.users) {
      const existing = db.users.find((item) => item.handle === seedUser.handle);
      if (!existing) {
        db.users.push(seedUser);
        continue;
      }
      existing.kind = seedUser.kind;
      existing.prefs = seedUser.prefs;
      existing.city = seedUser.city;
      existing.tags = seedUser.tags;
    }
    const mergeById = <T extends { id: string }>(target: T[], source: T[]) => {
      for (const item of source) {
        if (!target.some((current) => current.id === item.id)) target.push(item);
      }
    };
    mergeById(db.posts, seed.posts);
    mergeById(db.stories, seed.stories);
    mergeById(db.opportunities, seed.opportunities);
    mergeById(db.applications, seed.applications);
    for (const event of seed.events) {
      const existing = db.events.find((item) => item.id === event.id);
      if (existing) existing.createdBy ??= event.createdBy;
      else db.events.push(event);
    }
    for (const item of seed.testimonials) {
      const existing = db.testimonials.find((current) => current.id === item.id);
      if (existing) existing.authorHandle = item.authorHandle;
      else db.testimonials.push(item);
    }
    for (const reaction of seed.reactions) {
      const exists = db.reactions.some(
        (item) => item.postId === reaction.postId && item.userHandle === reaction.userHandle && item.type === reaction.type
      );
      if (!exists) db.reactions.push(reaction);
    }
    for (const follow of seed.follows) {
      const exists = db.follows.some(
        (item) => item.follower === follow.follower && item.following === follow.following
      );
      if (!exists) db.follows.push(follow);
    }
    for (const rsvp of seed.rsvps) {
      const exists = db.rsvps.some((item) => item.eventId === rsvp.eventId && item.userHandle === rsvp.userHandle);
      if (!exists) db.rsvps.push(rsvp);
    }
  }
  if (version < 3) {
    const seed = createSeed();
    for (const seedUser of seed.users) {
      const existing = db.users.find((item) => item.handle === seedUser.handle);
      if (existing && existing.niches.length === 0) existing.niches = seedUser.niches;
    }
    for (const item of seed.participations) {
      const owner = db.users.some((user) => user.handle === item.userHandle);
      if (owner && !db.participations.some((current) => current.id === item.id)) db.participations.push(item);
    }
    for (const item of seed.notifications) {
      if (!db.notifications.some((current) => current.id === item.id)) db.notifications.unshift(item);
    }
  }
  db.version = VERSION;
  return db;
}

function load(): Database {
  if (memory) return memory;
  if (fs.existsSync(dbFile)) {
    memory = migrate(JSON.parse(fs.readFileSync(dbFile, "utf8")) as Partial<Database>);
    persist(memory);
    return memory;
  }
  memory = createSeed();
  persist(memory);
  return memory;
}

function persist(db: Database) {
  fs.mkdirSync(dataDir, { recursive: true });
  const temp = `${dbFile}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(db, null, 2));
  fs.renameSync(temp, dbFile);
}

export function withDb<T>(fn: (db: Database) => T): Promise<T> {
  let result!: T;
  const run = queue.then(() => {
    const db = load();
    const snapshot = JSON.parse(JSON.stringify(db)) as Database;
    try {
      result = fn(db);
      persist(db);
    } catch (error) {
      memory = snapshot;
      throw error;
    }
  });
  queue = run.then(
    () => undefined,
    () => undefined
  );
  return run.then(() => result);
}

export async function readDb<T>(fn: (db: Database) => T): Promise<T> {
  await queue;
  return fn(load());
}
