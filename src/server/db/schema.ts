import { relations, sql } from "drizzle-orm";
import { index, pgTableCreator, primaryKey, integer, varchar, timestamp, boolean, text } from "drizzle-orm/pg-core";
import { type AdapterAccount } from "next-auth/adapters";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `focustimer_${name}`);

export const posts = createTable(
  "post",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    name: d.varchar({ length: 256 }),
    createdById: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("created_by_idx").on(t.createdById),
    index("name_idx").on(t.name),
  ]
);

// Focus Categories
export const categories = createTable(
  "category",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    name: d.varchar({ length: 100 }).notNull(),
    color: d.varchar({ length: 20 }).default("#3B82F6"), // Default blue color
    icon: d.varchar({ length: 50 }),
    isDefault: d.boolean().default(false),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  })
);

// Focus Sessions
export const focusSessions = createTable(
  "focus_session",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    categoryId: d
      .integer()
      .references(() => categories.id),
    title: d.varchar({ length: 200 }),
    plannedDuration: d.integer().notNull(), // in minutes
    actualDuration: d.integer(), // in minutes, null if session not completed
    startedAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    completedAt: d.timestamp({ withTimezone: true }),
    status: d.varchar({ length: 20 }).default("active"), // active, paused, completed, cancelled
    isCompleted: d.boolean().default(false),
  }),
  (t) => [
    index("session_user_idx").on(t.userId),
    index("session_date_idx").on(t.startedAt),
    index("session_status_idx").on(t.status),
  ]
);

// User Statistics
export const userStats = createTable(
  "user_stats",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id)
      .unique(),
    level: d.integer().default(1),
    totalXp: d.integer().default(0),
    currentStreak: d.integer().default(0),
    longestStreak: d.integer().default(0),
    totalFocusTime: d.integer().default(0), // in minutes
    totalSessions: d.integer().default(0),
    lastActiveDate: d.timestamp({ withTimezone: true }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("stats_user_idx").on(t.userId),
    index("stats_level_idx").on(t.level),
    index("stats_xp_idx").on(t.totalXp),
  ]
);

// Achievements
export const achievements = createTable(
  "achievement",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    name: d.varchar({ length: 100 }).notNull(),
    description: d.text().notNull(),
    icon: d.varchar({ length: 50 }),
    badgeColor: d.varchar({ length: 20 }).default("#10B981"), // Default green
    requirement: d.integer().notNull(), // The threshold to unlock
    type: d.varchar({ length: 50 }).notNull(), // streak, total_time, sessions, etc.
    xpReward: d.integer().default(0),
    isActive: d.boolean().default(true),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  })
);

// User Achievements (unlocked achievements)
export const userAchievements = createTable(
  "user_achievement",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    achievementId: d
      .integer()
      .notNull()
      .references(() => achievements.id),
    unlockedAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [
    index("user_achievement_user_idx").on(t.userId),
    index("user_achievement_achievement_idx").on(t.achievementId),
  ]
);

// To-Do Items
export const todos = createTable(
  "todo",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    categoryId: d
      .integer()
      .references(() => categories.id),
    title: d.varchar({ length: 200 }).notNull(),
    description: d.text(),
    isCompleted: d.boolean().default(false),
    priority: d.varchar({ length: 10 }).default("medium"), // low, medium, high
    dueDate: d.timestamp({ withTimezone: true }),
    completedAt: d.timestamp({ withTimezone: true }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("todo_user_idx").on(t.userId),
    index("todo_category_idx").on(t.categoryId),
    index("todo_completed_idx").on(t.isCompleted),
  ]
);

export const users = createTable("user", (d) => ({
  id: d
    .varchar({ length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: d.varchar({ length: 255 }),
  email: d.varchar({ length: 255 }).notNull(),
  emailVerified: d
    .timestamp({
      mode: "date",
      withTimezone: true,
    })
    .default(sql`CURRENT_TIMESTAMP`),
  image: d.varchar({ length: 255 }),
}));

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  accounts: many(accounts),
  focusSessions: many(focusSessions),
  userStats: one(userStats),
  userAchievements: many(userAchievements),
  todos: many(todos),
}));

export const focusSessionsRelations = relations(focusSessions, ({ one }) => ({
  user: one(users, { fields: [focusSessions.userId], references: [users.id] }),
  category: one(categories, { fields: [focusSessions.categoryId], references: [categories.id] }),
}));

export const userStatsRelations = relations(userStats, ({ one }) => ({
  user: one(users, { fields: [userStats.userId], references: [users.id] }),
}));

export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
  user: one(users, { fields: [userAchievements.userId], references: [users.id] }),
  achievement: one(achievements, { fields: [userAchievements.achievementId], references: [achievements.id] }),
}));

export const todosRelations = relations(todos, ({ one }) => ({
  user: one(users, { fields: [todos.userId], references: [users.id] }),
  category: one(categories, { fields: [todos.categoryId], references: [categories.id] }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  focusSessions: many(focusSessions),
  todos: many(todos),
}));

export const achievementsRelations = relations(achievements, ({ many }) => ({
  userAchievements: many(userAchievements),
}));

export const accounts = createTable(
  "account",
  (d) => ({
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    type: d.varchar({ length: 255 }).$type<AdapterAccount["type"]>().notNull(),
    provider: d.varchar({ length: 255 }).notNull(),
    providerAccountId: d.varchar({ length: 255 }).notNull(),
    refresh_token: d.text(),
    access_token: d.text(),
    expires_at: d.integer(),
    token_type: d.varchar({ length: 255 }),
    scope: d.varchar({ length: 255 }),
    id_token: d.text(),
    session_state: d.varchar({ length: 255 }),
  }),
  (t) => [
    primaryKey({ columns: [t.provider, t.providerAccountId] }),
    index("account_user_id_idx").on(t.userId),
  ]
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessions = createTable(
  "session",
  (d) => ({
    sessionToken: d.varchar({ length: 255 }).notNull().primaryKey(),
    userId: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => users.id),
    expires: d.timestamp({ mode: "date", withTimezone: true }).notNull(),
  }),
  (t) => [index("t_user_id_idx").on(t.userId)]
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const verificationTokens = createTable(
  "verification_token",
  (d) => ({
    identifier: d.varchar({ length: 255 }).notNull(),
    token: d.varchar({ length: 255 }).notNull(),
    expires: d.timestamp({ mode: "date", withTimezone: true }).notNull(),
  }),
  (t) => [primaryKey({ columns: [t.identifier, t.token] })]
);
