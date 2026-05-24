import {
  boolean,
  char,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const links = pgTable("links", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  destinationUrl: text("destination_url").notNull(),
  title: text("title"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  id: text("id").primaryKey(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  payload: jsonb("payload"),
  ip: text("ip"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const clicks = pgTable(
  "clicks",
  {
    id: text("id").primaryKey(),
    linkId: text("link_id")
      .notNull()
      .references(() => links.id, { onDelete: "cascade" }),
    clickedAt: timestamp("clicked_at", { withTimezone: true }).notNull(),
    referrer: text("referrer"),
    country: char("country", { length: 2 }),
    uaHash: text("ua_hash"),
  },
  (t) => [
    index("clicks_link_id_idx").on(t.linkId),
    index("clicks_clicked_at_idx").on(t.clickedAt),
    index("clicks_link_id_clicked_at_idx").on(t.linkId, t.clickedAt),
  ],
);
