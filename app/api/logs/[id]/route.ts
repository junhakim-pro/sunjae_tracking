import { NextRequest, NextResponse } from "next/server";
import { deleteTimelineEntry, updateTimelineEntry } from "@/lib/data";
import { z } from "zod";

const updateSchema = z.union([
  z.object({
    kind: z.literal("intake"),
    occurredAt: z.string().min(1),
    createdBy: z.string().min(1),
    intakeType: z.enum(["formula", "solid_food", "water", "snack"]),
    amountMl: z.number().int().positive().optional(),
    amountG: z.number().int().positive().optional(),
    foodName: z.string().optional(),
    notes: z.string().optional()
  }),
  z.object({
    kind: z.literal("sleep"),
    startedAt: z.string().min(1),
    endedAt: z.string().min(1),
    createdBy: z.string().min(1)
  }),
  z.object({
    kind: z.literal("note"),
    occurredAt: z.string().min(1),
    createdBy: z.string().min(1),
    noteCategory: z.enum(["condition", "symptom", "general"]),
    note: z.string().min(1)
  })
]);

const deleteSchema = z.object({
  kind: z.enum(["intake", "sleep", "note"])
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "수정 형식이 올바르지 않아요." }, { status: 400 });
  }

  const { id } = await params;
  const item = await updateTimelineEntry({
    id,
    ...parsed.data
  });

  return NextResponse.json({ item });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const body = await request.json();
  const parsed = deleteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "삭제 형식이 올바르지 않아요." }, { status: 400 });
  }

  const { id } = await params;
  await deleteTimelineEntry({
    id,
    kind: parsed.data.kind
  });

  return NextResponse.json({ ok: true });
}
