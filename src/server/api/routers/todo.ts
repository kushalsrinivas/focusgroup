import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";

import {
  createTRPCRouter,
  protectedProcedure,
} from "@/server/api/trpc";
import { todos } from "@/server/db/schema";

export const todoRouter = createTRPCRouter({
  // Get all todos for the user
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.todos.findMany({
      where: eq(todos.userId, ctx.session.user.id),
      with: {
        category: true,
      },
      orderBy: [desc(todos.createdAt)],
    });
  }),

  // Create a new todo
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(200),
      description: z.string().optional(),
      categoryId: z.number().optional(),
      priority: z.enum(["low", "medium", "high"]).default("medium"),
      dueDate: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const todo = await ctx.db.insert(todos).values({
        userId: ctx.session.user.id,
        title: input.title,
        description: input.description,
        categoryId: input.categoryId,
        priority: input.priority,
        dueDate: input.dueDate,
      }).returning();

      return todo[0];
    }),

  // Update a todo
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).max(200).optional(),
      description: z.string().optional(),
      categoryId: z.number().optional(),
      priority: z.enum(["low", "medium", "high"]).optional(),
      dueDate: z.date().optional(),
      isCompleted: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      
      if (input.isCompleted) {
        updateData.completedAt = new Date();
      }

      await ctx.db.update(todos)
        .set(updateData)
        .where(and(
          eq(todos.id, id),
          eq(todos.userId, ctx.session.user.id)
        ));
    }),

  // Delete a todo
  delete: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(todos)
        .where(and(
          eq(todos.id, input.id),
          eq(todos.userId, ctx.session.user.id)
        ));
    }),

  // Toggle todo completion
  toggle: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const todo = await ctx.db.query.todos.findFirst({
        where: and(
          eq(todos.id, input.id),
          eq(todos.userId, ctx.session.user.id)
        ),
      });

      if (!todo) {
        throw new Error("Todo not found");
      }

      await ctx.db.update(todos)
        .set({
          isCompleted: !todo.isCompleted,
          completedAt: !todo.isCompleted ? new Date() : null,
        })
        .where(eq(todos.id, input.id));
    }),
}); 