import { sql } from "drizzle-orm";
import { pgTable } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const Post = pgTable("post", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  title: t.varchar({ length: 256 }).notNull(),
  content: t.text().notNull(),
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t
    .timestamp({ mode: "date", withTimezone: true })
    .$onUpdateFn(() => sql`now()`),
}));

// Note: We'll use the existing Supabase 'messages' table instead of creating new ones
// The existing table structure:
// - id: uuid PRIMARY KEY
// - chat_id: uuid (we'll use this as sessionId)
// - user_id: uuid (maps to our userId)
// - content: text (message content)
// - role: 'user' | 'assistant' (maps to our sender field)
// - created_at: timestamp

// If we need additional fields, we can extend the existing table
// For now, we'll work with the current structure

export const CreatePostSchema = createInsertSchema(Post, {
  title: z.string().max(256),
  content: z.string().max(256),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// User Databases table - tracks per-user Neo4j database connections
export const UserDatabase = pgTable("user_databases", (t) => ({
  id: t.uuid().notNull().primaryKey().defaultRandom(),
  userId: t.uuid().notNull().unique(),  // Supabase auth.users.id
  neo4jUri: t.text().notNull(),         // https://xxx.databases.neo4j.io
  neo4jUser: t.text().notNull(),
  neo4jPassword: t.text().notNull(),    // Encrypted in production
  databaseName: t.text().notNull(),     // e.g., "omnii-user-{userId}"
  auraInstanceId: t.text(),             // Aura instance ID for status tracking
  status: t.varchar({ length: 20 }).notNull().default('pending'), // pending, ready, failed
  createdAt: t.timestamp().defaultNow().notNull(),
  updatedAt: t.timestamp({ mode: "date", withTimezone: true }).$onUpdateFn(() => sql`now()`),
}));

export const CreateUserDatabaseSchema = createInsertSchema(UserDatabase).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export * from "./auth-schema";
