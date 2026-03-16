import { NextRequest, NextResponse } from "next/server";
import { parseImageBatchWithAI, parseImageWithAI, parseTextWithAI } from "@/lib/ai";
import { buildHeuristicParsedLog } from "@/lib/chat-heuristics";
import {
  createGrowthMeasurement,
  createLog,
  getDashboardSnapshot,
  getTodayImageUsage
} from "@/lib/data";
import { ParsedChatLog } from "@/lib/types";
import { parseGrowthText } from "@/lib/growth";

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

function fileToDataUrl(file: File) {
  return file.arrayBuffer().then((buffer) => {
    const mimeType = file.type || "image/jpeg";
    return `data:${mimeType};base64,${Buffer.from(buffer).toString("base64")}`;
  });
}

async function parseQuickImage(file: File, caption?: string) {
  const imageDataUrl = await fileToDataUrl(file);
  const nowIso = new Date().toISOString();

  try {
    const batch = await parseImageBatchWithAI({
      imageDataUrl,
      caption,
      nowIso
    });

    if (batch?.length) {
      return {
        entries: batch,
        rawImageUrl: file.name
      };
    }

    const single = await parseImageWithAI({
      imageDataUrl,
      caption,
      nowIso
    });

    if (single) {
      return {
        entries: [single],
        rawImageUrl: file.name
      };
    }
  } catch (error) {
    console.error("Quick log image parse failed.", error);
  }

  if (caption?.trim()) {
    return {
      entries: [buildHeuristicParsedLog({ text: caption.trim() })],
      rawImageUrl: file.name
    };
  }

  return {
    entries: [
      buildHeuristicParsedLog({
        text: "사진 업로드 기록"
      })
    ],
    rawImageUrl: file.name
  };
}

async function saveQuickLog(
  parsed: ParsedChatLog,
  rawText: string,
  rawImageUrl?: string
) {
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
      rawText,
      rawImageUrl
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
      rawText,
      rawImageUrl
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
    rawText,
    rawImageUrl
  });
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  let parsedEntries: ParsedChatLog[] = [];
  let rawText = "";
  let rawImageUrl: string | undefined;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const text = String(formData.get("text") || "").trim();
    const file = formData.get("image");

    rawText = text;

    if (file instanceof File && file.size > 0) {
      const imageUsesToday = await getTodayImageUsage();

      if (imageUsesToday >= 2) {
        return NextResponse.json(
          { error: "오늘 사진 인식은 2회까지예요. 지금은 텍스트로 남겨주세요." },
          { status: 429 }
        );
      }

      rawImageUrl = file.name;
      const result = await parseQuickImage(file, text || undefined);

      if (result?.entries?.length) {
        parsedEntries = result.entries;
      }
    } else if (text) {
      parsedEntries = [await parseQuickText(text)];
    }
  } else {
    const body = (await request.json()) as { text?: string };
    const text = body.text?.trim();
    rawText = text ?? "";

    if (text) {
      parsedEntries = [await parseQuickText(text)];
    }
  }

  const growthUpdate = rawText ? parseGrowthText(rawText) : null;

  if (growthUpdate) {
    await createGrowthMeasurement({
      ...growthUpdate,
      createdBy: "웹 빠른 입력",
      sourceType: "web_form",
      rawText
    });

    return NextResponse.json({
      ok: true,
      message: `성장 기록을 업데이트했어요. 몸무게 ${growthUpdate.weightKg ?? "-"}kg / 키 ${growthUpdate.heightCm ?? "-"}cm`
    });
  }

  if (!parsedEntries.length) {
    return NextResponse.json({ error: "입력 문장이나 사진을 넣어주세요." }, { status: 400 });
  }

  for (const parsed of parsedEntries) {
    await saveQuickLog(parsed, rawText || parsed.note || "웹 사진 기록", rawImageUrl);
  }

  const snapshot = await getDashboardSnapshot();

  const formulaPercent = Math.round(
    (snapshot.summary.formulaMl / snapshot.summary.formulaGoalMl) * 100 || 0
  );
  const solidPercent = Math.round(
    (snapshot.summary.solidFoodG / snapshot.summary.solidFoodGoalG) * 100 || 0
  );

  const firstParsed = parsedEntries[0];
  const message =
    firstParsed.confidence < 0.7 && firstParsed.followUpQuestion
      ? `기록은 우선 남겼어요. ${firstParsed.followUpQuestion}`
      : parsedEntries.length > 1
        ? `${parsedEntries.length}건 기록했어요. 오늘 분유 ${snapshot.summary.formulaMl}ml (${formulaPercent}%), 이유식 ${snapshot.summary.solidFoodG}g (${solidPercent}%)`
        : `기록했어요. 오늘 분유 ${snapshot.summary.formulaMl}ml (${formulaPercent}%), 이유식 ${snapshot.summary.solidFoodG}g (${solidPercent}%)`;

  return NextResponse.json({
    ok: true,
    parsed: parsedEntries,
    message
  });
}
