import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ── Leads ────────────────────────────────────────────────────────────────────
// Businesses discovered via Google Maps Places API
export const leads = sqliteTable("leads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  placeId: text("place_id").notNull().unique(),
  businessName: text("business_name").notNull(),
  niche: text("niche").notNull(), // e.g. "plumber", "hvac", "cleaning"
  city: text("city").notNull(),
  phone: text("phone"),
  website: text("website"),
  address: text("address"),
  rating: real("rating"),
  reviewCount: integer("review_count"),
  status: text("status").notNull().default("discovered"),
  // discovered → matched → monitoring → draft_ready → engaged → rejected
  emailDay: integer("email_day").notNull().default(0), // 0 = not started, 1–14 = sequence day sent
  lastEmailedAt: text("last_emailed_at"), // ISO datetime of last send
  emailAddress: text("email_address"), // scraped contact email
  // ── Call tracking ─────────────────────────────────────────────────────────
  callStatus: text("call_status").default("not_called"),
  // not_called | called_no_answer | called_vm | booked | not_interested | dnc
  calledAt: text("called_at"), // ISO datetime of last call attempt
  callNotes: text("call_notes"), // Jason's notes from the call
  // ── Reply tracking ────────────────────────────────────────────────────────
  repliedAt: text("replied_at"),      // ISO datetime of first reply detection
  replySnippet: text("reply_snippet"), // First 200 chars of the reply
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

// ── Social Profiles ───────────────────────────────────────────────────────────
// LinkedIn / Facebook pages matched to a lead
export const socialProfiles = sqliteTable("social_profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  leadId: integer("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(), // "linkedin" | "facebook"
  profileUrl: text("profile_url").notNull().unique(),
  profileName: text("profile_name"),
  matchMethod: text("match_method"), // "site_link" | "google_search" | "manual"
  lastCheckedAt: text("last_checked_at"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

// ── Posts ─────────────────────────────────────────────────────────────────────
// Individual posts found on a social profile
export const posts = sqliteTable("posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  socialProfileId: integer("social_profile_id")
    .notNull()
    .references(() => socialProfiles.id, { onDelete: "cascade" }),
  postUrl: text("post_url").notNull().unique(),
  postText: text("post_text"),
  postedAt: text("posted_at"),
  discoveredAt: text("discovered_at").notNull().default(sql`(datetime('now'))`),
});

// ── Comments ──────────────────────────────────────────────────────────────────
// Claude-drafted comments in the review queue
export const comments = sqliteTable("comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  postId: integer("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  draft: text("draft").notNull(),
  editedDraft: text("edited_draft"), // Jason's edits before posting
  status: text("status").notNull().default("pending"),
  // pending → approved | rejected | posted
  promptVersion: text("prompt_version"), // track which prompt generated this
  postedAt: text("posted_at"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

// ── Clients ───────────────────────────────────────────────────────────────────
// Active, churned, and prospect clients
export const clients = sqliteTable("clients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  contact: text("contact"),                                          // primary contact name
  email: text("email"),
  status: text("status").notNull().default("active"),                // active | churned | prospect
  mrr: real("mrr").notNull().default(0),                             // monthly recurring revenue
  notes: text("notes"),
  lastTouchAt: text("last_touch_at"),                                // ISO date of last interaction
  nextAction: text("next_action"),                                    // what to do next
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

// ── Deals ─────────────────────────────────────────────────────────────────────
// Individual revenue events (one-time + recurring)
export const deals = sqliteTable("deals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").references(() => clients.id),
  type: text("type").notNull(),             // starter_site | growth_retainer | claude_consulting | guide
  amount: real("amount").notNull(),
  billingType: text("billing_type").notNull().default("one_time"),   // one_time | monthly
  status: text("status").notNull().default("active"),                // active | completed | cancelled
  closedAt: text("closed_at"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

// ── Type exports ──────────────────────────────────────────────────────────────
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type SocialProfile = typeof socialProfiles.$inferSelect;
export type NewSocialProfile = typeof socialProfiles.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type Deal = typeof deals.$inferSelect;
export type NewDeal = typeof deals.$inferInsert;
