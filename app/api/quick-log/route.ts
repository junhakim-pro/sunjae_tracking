import { NextRequest, NextResponse } from "next/server";
import { parseTextWithAI } from "@/lib/ai";
import { buildHeuristicParsedLog } from "@/lib/chat-heuristics";
import { createLog, getDashboardSnapshot } from "@/lib/data";

async function parseQuickText(text: string) {
  const nowIso = new Date().toISOString();

  try {
    const parsed = await parseTextWithAI({
      text,
      nowIso
    });

    if (parsed) {
      return parsed;
    }
  } catch (error) {
    console.error("Quick log AI parse failed, falling back to heuristic parser.", error);
  }

  return buildHeuristicParsedLog({
    text
  });
}

async function saveQuickLog(parsed: Awaited<ReturnType<typeof parseQuickText>>, rawText: string) {
  if (parsed.type === "intake") {
    await createLog({
      type: "intake",
      occurredAt: parsed.occurredAt ?? new Date().toISOString(),
      intakeType: parsed.intakeType ?? "formula",
      amountMl: parsed.amountMl,
      amountG: parsed.amountG,
      foodName: parsed.note,
      createdBy: "웹 빠른 입력",
      sourceType: "web_form",
      parseConfidence: parsed.confidence,
      rawText
    });
    return;
  }

  if (parsed.type === "sleep" && parsed.sleepStartAt && parsed.sleepEndAt) {
    await createLog({
      type: "sleep",
      startedAt: parsed.sleepStartAt,
      endedAt: parsed.sleepEndAt,
      createdBy: "웹 빠른 입력",
      sourceType: "web_form",
      rawText
    });
    return;
  }

  await createLog({
    type: "note",
    occurredAt: parsed.occurredAt ?? new Date().toISOString(),
    noteCategory: parsed.noteCategory ?? "general",
    note: parsed.note ?? rawText,
    createdBy: "웹 빠른 입력",
    sourceType: "web_form",
    rawText
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { text?: string };
  const text = body.text?.trim();

  if (!text) {
    return NextResponse.json({ error: "입력 문장을 적어주세요." }, { status: 400 });
  }

  const parsed = await parseQuickText(text);
  await saveQuickLog(parsed, text);
  const snapshot = await getDashboardSnapshot();

  const formulaPercent = Math.round(
    (snapshot.summary.formulaMl / snapshot.summary.formulaGoalMl) * 100 || 0
  );
  const solidPercent = Math.round(
    (snapshot.summary.solidFoodG / snapshot.summary.solidFoodGoalG) * 100 || 0
  );

  const message =
    parsed.confidence < 0.7 && parsed.followUpQuestion
      ? `기록은 우선 남겼어요. ${parsed.followUpQuestion}`
      : `기록했어요. 오늘 분유 ${snapshot.summary.formulaMl}ml (${formulaPercent}%), 이유식 ${snapshot.summary.solidFoodG}g (${solidPercent}%)`;

  return NextResponse.json({
    ok: true,
    parsed,
    message
  });
}

