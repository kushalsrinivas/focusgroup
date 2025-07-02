import { z } from "zod";
import { eq, desc, and, sql, gte, lte, count } from "drizzle-orm";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { 
  focusSessions, 
  userStats, 
  categories, 
  achievements, 
  userAchievements,
  todos,
  users 
} from "@/server/db/schema";

export const focusRouter = createTRPCRouter({
  // Get user dashboard data
  getDashboard: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    
    // Get or create user stats
    let stats = await ctx.db.query.userStats.findFirst({
      where: eq(userStats.userId, userId),
    });

    if (!stats) {
      await ctx.db.insert(userStats).values({
        userId,
        level: 1,
        totalXp: 0,
        currentStreak: 0,
        longestStreak: 0,
        totalFocusTime: 0,
        totalSessions: 0,
      });
      
      stats = await ctx.db.query.userStats.findFirst({
        where: eq(userStats.userId, userId),
      });
    }

    // Get today's focus time
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaysSessions = await ctx.db.query.focusSessions.findMany({
      where: and(
        eq(focusSessions.userId, userId),
        gte(focusSessions.startedAt, today),
        lte(focusSessions.startedAt, tomorrow),
        eq(focusSessions.isCompleted, true)
      ),
    });

    const todaysFocusTime = todaysSessions.reduce((total, session) => 
      total + (session.actualDuration || 0), 0
    );

    // Get user achievements
    const userAchievementsList = await ctx.db.query.userAchievements.findMany({
      where: eq(userAchievements.userId, userId),
      with: {
        achievement: true,
      },
    });

    // Get all achievements for progress tracking
    const allAchievements = await ctx.db.query.achievements.findMany({
      where: eq(achievements.isActive, true),
    });

    return {
      stats,
      todaysFocusTime,
      achievements: userAchievementsList,
      allAchievements,
    };
  }),

  // Start a new focus session
  startSession: protectedProcedure
    .input(z.object({
      title: z.string().optional(),
      categoryId: z.number().optional(),
      plannedDuration: z.number().min(1).max(480), // 1 min to 8 hours
    }))
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.insert(focusSessions).values({
        userId: ctx.session.user.id,
        title: input.title,
        categoryId: input.categoryId,
        plannedDuration: input.plannedDuration,
        status: "active",
      }).returning();

      return session[0];
    }),

  // Complete a focus session
  completeSession: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      actualDuration: z.number().min(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      // Update the session
      await ctx.db.update(focusSessions)
        .set({
          actualDuration: input.actualDuration,
          completedAt: new Date(),
          status: "completed",
          isCompleted: true,
        })
        .where(and(
          eq(focusSessions.id, input.sessionId),
          eq(focusSessions.userId, userId)
        ));

      // Update user stats
      const xpGained = Math.floor(input.actualDuration * 2); // 2 XP per minute
      
      await ctx.db.update(userStats)
        .set({
          totalFocusTime: sql`${userStats.totalFocusTime} + ${input.actualDuration}`,
          totalSessions: sql`${userStats.totalSessions} + 1`,
          totalXp: sql`${userStats.totalXp} + ${xpGained}`,
          level: sql`FLOOR(${userStats.totalXp} / 1000) + 1`,
          lastActiveDate: new Date(),
        })
        .where(eq(userStats.userId, userId));

      return { xpGained };
    }),

  // Get active session
  getActiveSession: protectedProcedure.query(async ({ ctx }) => {
    const session = await ctx.db.query.focusSessions.findFirst({
      where: and(
        eq(focusSessions.userId, ctx.session.user.id),
        eq(focusSessions.status, "active")
      ),
      with: {
        category: true,
      },
    });

    return session;
  }),

  // Pause/resume session
  updateSessionStatus: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      status: z.enum(["active", "paused", "cancelled"]),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(focusSessions)
        .set({ status: input.status })
        .where(and(
          eq(focusSessions.id, input.sessionId),
          eq(focusSessions.userId, ctx.session.user.id)
        ));
    }),

  // Get categories
  getCategories: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.categories.findMany({
      orderBy: [categories.name],
    });
  }),

  // Get leaderboard
  getLeaderboard: publicProcedure
    .input(z.object({
      period: z.enum(["today", "week", "month"]).default("today"),
      limit: z.number().min(1).max(100).default(10),
    }))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      let startDate: Date;

      switch (input.period) {
        case "today":
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case "month":
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 30);
          break;
      }

      // Get user focus times for the period
      const leaderboard = await ctx.db
        .select({
          userId: users.id,
          userName: users.name,
          userImage: users.image,
          totalTime: sql<number>`COALESCE(SUM(${focusSessions.actualDuration}), 0)`,
          sessionCount: sql<number>`COUNT(${focusSessions.id})`,
        })
        .from(users)
        .leftJoin(focusSessions, and(
          eq(users.id, focusSessions.userId),
          gte(focusSessions.startedAt, startDate),
          eq(focusSessions.isCompleted, true)
        ))
        .groupBy(users.id, users.name, users.image)
        .orderBy(desc(sql`COALESCE(SUM(${focusSessions.actualDuration}), 0)`))
        .limit(input.limit);

      return leaderboard;
    }),

  // Get active sessions (for community feed)
  getActiveSessions: publicProcedure.query(async ({ ctx }) => {
    const activeSessions = await ctx.db.query.focusSessions.findMany({
      where: eq(focusSessions.status, "active"),
      with: {
        user: {
          columns: {
            name: true,
            image: true,
          },
        },
        category: true,
      },
      orderBy: [desc(focusSessions.startedAt)],
      limit: 20,
    });

    return activeSessions.map(session => ({
      id: session.id,
      userName: session.user.name,
      userImage: session.user.image,
      title: session.title,
      categoryName: session.category?.name,
      categoryColor: session.category?.color,
      plannedDuration: session.plannedDuration,
      startedAt: session.startedAt,
    }));
  }),

  // Get user rank
  getUserRank: protectedProcedure
    .input(z.object({
      period: z.enum(["today", "week", "month"]).default("today"),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const now = new Date();
      let startDate: Date;

      switch (input.period) {
        case "today":
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case "month":
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 30);
          break;
      }

      // Get user's total time for period
      const userTime = await ctx.db
        .select({
          totalTime: sql<number>`COALESCE(SUM(${focusSessions.actualDuration}), 0)`,
        })
        .from(focusSessions)
        .where(and(
          eq(focusSessions.userId, userId),
          gte(focusSessions.startedAt, startDate),
          eq(focusSessions.isCompleted, true)
        ));

      const userTotalTime = userTime[0]?.totalTime || 0;

      // Count users with more time
      const betterUsers = await ctx.db
        .select({
          count: sql<number>`COUNT(DISTINCT ${focusSessions.userId})`,
        })
        .from(focusSessions)
        .where(and(
          gte(focusSessions.startedAt, startDate),
          eq(focusSessions.isCompleted, true)
        ))
        .groupBy(focusSessions.userId)
        .having(sql`SUM(${focusSessions.actualDuration}) > ${userTotalTime}`);

      const rank = betterUsers.length + 1;

      // Get total active users for percentile
      const totalUsers = await ctx.db
        .select({
          count: sql<number>`COUNT(DISTINCT ${focusSessions.userId})`,
        })
        .from(focusSessions)
        .where(and(
          gte(focusSessions.startedAt, startDate),
          eq(focusSessions.isCompleted, true)
        ));

      const totalActiveUsers = totalUsers[0]?.count || 1;
      const percentile = Math.round(((totalActiveUsers - rank + 1) / totalActiveUsers) * 100);

      return {
        rank,
        totalTime: userTotalTime,
        percentile,
        totalActiveUsers,
      };
    }),

  // Get weekly analytics
  getWeeklyAnalytics: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);

    const weeklyData = await ctx.db.query.focusSessions.findMany({
      where: and(
        eq(focusSessions.userId, userId),
        gte(focusSessions.startedAt, weekAgo),
        eq(focusSessions.isCompleted, true)
      ),
      orderBy: [focusSessions.startedAt],
    });

    // Group by day
    const dailyStats = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekAgo);
      date.setDate(weekAgo.getDate() + i);
      const dayString = date.toISOString().split('T')[0];
      
      const dayData = weeklyData.filter(session => 
        session.startedAt.toISOString().split('T')[0] === dayString
      );

      return {
        date: dayString,
        totalTime: dayData.reduce((sum, session) => sum + (session.actualDuration || 0), 0),
        sessionCount: dayData.length,
      };
    });

    return dailyStats;
  }),
}); 