import { z } from "zod";

const intakeSchema = z.object({
  type: z.literal("intake"),
  occurredAt: z.string().min(1),
  intakeType: z.enum(["formula", "solid_food", "water", "snack"]),
  amountMl: z.number().int().positive().optional(),
  amountG: z.number().int().positive().optional(),
  foodName: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  createdBy: z.string().trim().min(1),
  sourceType: z.enum(["chat_text", "chat_image", "web_form"]).optional(),
  parseConfidence: z.number().min(0).max(1).optional(),
  rawText: z.string().optional(),
  rawImageUrl: z.string().optional()
});

const sleepSchema = z.object({
  type: z.literal("sleep"),
  startedAt: z.string().min(1),
  endedAt: z.string().min(1),
  createdBy: z.string().trim().min(1),
  sourceType: z.enum(["chat_text", "chat_image", "web_form"]).optional(),
  rawText: z.string().optional(),
  rawImageUrl: z.string().optional()
});

const noteSchema = z.object({
  type: z.literal("note"),
  occurredAt: z.string().min(1),
  noteCategory: z.enum(["condition", "symptom", "general"]),
  note: z.string().trim().min(1),
  createdBy: z.string().trim().min(1),
  sourceType: z.enum(["chat_text", "chat_image", "web_form"]).optional(),
  rawText: z.string().optional(),
  rawImageUrl: z.string().optional()
});

export const createLogSchema = z.union([intakeSchema, sleepSchema, noteSchema]);

export type CreateLogInput = z.infer<typeof createLogSchema>;
