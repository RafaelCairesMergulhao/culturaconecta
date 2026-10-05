export type Role = "member" | "moderator";

export type AccountKind = "artista" | "produtora" | "estudio" | "empresa" | "espaco" | "publico";

export type Shape = "triangulo" | "hexagono" | "losango" | "circulo";

export type Prefs = {
  theme: "dark" | "light";
  accent: string;
  accent2: string;
  backgroundId: string | null;
  bgDim: number;
  bgBlur: number;
  glass: boolean;
  shape: Shape;
  fontScale: number;
};

export type ProfileLink = { label: string; url: string };

export type Niche =
  | "mc"
  | "dj"
  | "beatmaker"
  | "producao"
  | "breaking"
  | "dancas"
  | "graffiti"
  | "beatbox"
  | "poesia"
  | "realizacao"
  | "audiovisual"
  | "educacao"
  | "cenicas";

export type ParticipationRole =
  | "competidor"
  | "finalista"
  | "vice"
  | "campeao"
  | "atracao"
  | "jurado"
  | "apresentacao"
  | "organizacao"
  | "oficina"
  | "producao";

export type ParticipationStatus = "declarada" | "pendente" | "confirmada" | "recusada";

export type Participation = {
  id: string;
  userHandle: string;
  niche: Niche;
  role: ParticipationRole;
  eventId: string | null;
  eventTitle: string;
  date: string;
  city: string;
  organizerHandle: string | null;
  status: ParticipationStatus;
  note: string;
  createdAt: string;
  decidedAt: string | null;
};

export type CulturalMapChoice = {
  url: string;
  agentId: string;
  name: string;
  shortDescription: string;
  areas: string[];
  city: string;
  state: string;
};

export type CulturalMapSnapshot = {
  url: string;
  agentId: string;
  host: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  areas: string[];
  city: string;
  state: string;
  site: string;
  fetchedAt: string;
};

export type EditalProfile = {
  legalName: string;
  artisticName: string;
  city: string;
  segment: string;
  formation: string;
  awards: string;
  portfolio: string;
  mapa: CulturalMapSnapshot | null;
};

export type PublicUser = {
  id: string;
  handle: string;
  name: string;
  bio: string;
  tags: string[];
  avatarInitials: string;
  available: boolean;
  role: Role;
  kind: AccountKind;
  city: string;
  links: ProfileLink[];
  avatarId: string | null;
  coverId: string | null;
  prefs: Prefs;
  niches: Niche[];
  edital: EditalProfile | null;
  createdAt: string;
  limited: boolean;
};

export type UserRecord = PublicUser & { passwordHash: string };

export type FeatStatus = "pendente" | "aceito" | "recusado";

export type MusicProvider = "spotify" | "youtube";

export type MusicKind = "track" | "album" | "playlist" | "episode" | "show" | "video";

export type MusicLink = {
  provider: MusicProvider;
  kind: MusicKind;
  externalId: string;
  url: string;
  title: string;
  author: string;
};

export type Post = {
  id: string;
  authorHandle: string;
  category: string;
  text: string;
  imageId: string | null;
  music: MusicLink | null;
  feat: string | null;
  featStatus: FeatStatus | null;
  createdAt: string;
  hidden: boolean;
};

export type Comment = {
  id: string;
  postId: string;
  authorHandle: string;
  text: string;
  createdAt: string;
  hidden: boolean;
};

export type ReactionType = "like" | "fire" | "arrepio";

export type Reaction = { postId: string; userHandle: string; type: ReactionType };

export type Repost = { postId: string; userHandle: string; createdAt: string };

export type Follow = { follower: string; following: string };

export type NotificationType =
  | "like"
  | "fire"
  | "arrepio"
  | "comment"
  | "follow"
  | "repost"
  | "message"
  | "support"
  | "moderation"
  | "feat"
  | "application"
  | "event"
  | "testimonial"
  | "participation"
  | "achievement"
  | "jam";

export type Notification = {
  id: string;
  userHandle: string;
  type: NotificationType;
  actorHandle: string;
  text: string;
  href: string;
  targetId?: string;
  createdAt: string;
  read: boolean;
};

export type DirectMessage = {
  id: string;
  fromHandle: string;
  toHandle: string;
  text: string;
  createdAt: string;
  hidden: boolean;
};

export type Story = {
  id: string;
  authorHandle: string;
  text: string;
  imageId: string | null;
  bg: string;
  createdAt: string;
  hidden: boolean;
};

export type OpportunityType = "show" | "edital" | "gravacao" | "patrocinio" | "vaga" | "colab";

export type Opportunity = {
  id: string;
  authorHandle: string;
  type: OpportunityType;
  title: string;
  description: string;
  city: string;
  date: string;
  fee: string;
  tags: string[];
  createdAt: string;
  open: boolean;
  hidden: boolean;
};

export type ApplicationStatus = "enviada" | "selecionada" | "recusada";

export type Application = {
  id: string;
  opportunityId: string;
  applicantHandle: string;
  pitch: string;
  createdAt: string;
  status: ApplicationStatus;
};

export type Jam = {
  id: string;
  hostHandle: string;
  music: MusicLink;
  note: string;
  createdAt: string;
  closedAt: string | null;
  hidden: boolean;
};

export type JamMember = { jamId: string; userHandle: string; joinedAt: string };

export type Media = {
  id: string;
  ownerHandle: string;
  ext: "jpg" | "png" | "webp";
  createdAt: string;
};

export type ReportReason =
  | "spam"
  | "assedio"
  | "odio"
  | "sexual"
  | "violencia"
  | "ilegal"
  | "dados_pessoais"
  | "outro";

export type ReportTarget = "post" | "comment" | "user" | "message" | "story" | "opportunity";

export type ReportStatus = "aberta" | "oculta" | "mantida";

export type Report = {
  id: string;
  reporterHandle: string;
  targetType: ReportTarget;
  targetId: string;
  reason: ReportReason;
  details: string;
  snapshot: string;
  createdAt: string;
  status: ReportStatus;
};

export type Block = { blocker: string; blocked: string };

export type Rsvp = { eventId: string; userHandle: string };

export type Session = { token: string; userId: string; createdAt: string };

export type Evento = {
  id: string;
  title: string;
  date: string;
  startsAt: string | null;
  location: string;
  category: string;
  free: boolean;
  price?: string;
  artistHandles: string[];
  createdBy: string | null;
  description: string;
};

export type Sponsor = {
  id: string;
  name: string;
  category: string;
  description: string;
  projectsSupported: number;
};

export type Testimonial = {
  id: string;
  artistHandle: string;
  author: string;
  authorHandle: string | null;
  text: string;
  createdAt: string;
};

export type Database = {
  version: number;
  users: UserRecord[];
  posts: Post[];
  comments: Comment[];
  reactions: Reaction[];
  reposts: Repost[];
  follows: Follow[];
  notifications: Notification[];
  messages: DirectMessage[];
  reports: Report[];
  blocks: Block[];
  rsvps: Rsvp[];
  sessions: Session[];
  events: Evento[];
  sponsors: Sponsor[];
  testimonials: Testimonial[];
  stories: Story[];
  opportunities: Opportunity[];
  applications: Application[];
  participations: Participation[];
  jams: Jam[];
  jamMembers: JamMember[];
  media: Media[];
};

export type Stats = {
  users: number;
  posts: number;
  events: number;
  opportunities: number;
  stories: number;
};

export type ClientState = {
  me: PublicUser | null;
  users: PublicUser[];
  posts: Post[];
  comments: Comment[];
  reactions: Reaction[];
  reposts: Repost[];
  follows: Follow[];
  notifications: Notification[];
  messages: DirectMessage[];
  reports: Report[];
  blocks: Block[];
  rsvps: Rsvp[];
  events: Evento[];
  sponsors: Sponsor[];
  testimonials: Testimonial[];
  stories: Story[];
  opportunities: Opportunity[];
  applications: Application[];
  participations: Participation[];
  jams: Jam[];
  jamMembers: JamMember[];
  stats: Stats;
};
