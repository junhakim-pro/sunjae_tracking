import { NextRequest, NextResponse } from "next/server";
import { createLog, getDashboardSnapshot, getTodayImageUsage } from "@/lib/data";
import { parseImageBatchWithAI, parseImageWithAI, parseTextWithAI } from "@/lib/ai";
import { validateParsedLog } from "@/lib/parsing";
import {
  getTelegramFileDataUrl,
  resolveTelegramCaregiver,
  sendTelegramMessage
} from "@/lib/telegram";

interface TelegramWebhookPayload {
  message?: {
    text?: string;
    caption?: string;
    photo?: Array<{ file_id: string }>;
    from?: { id: number; first_name?: string };
    date?: number;
    chat?: { id: number };
  };
}

function verifySecretToken(request: NextRequest) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!expected) {
    return true;
  }

  return request.headers.get("x-telegram-bot-api-secret-token") === expected;
}

function buildMockParserResult(payload: TelegramWebhookPayload) {
  const text = payload.message?.text ?? "";

  if (text.includes("분유")) {
    return validateParsedLog({
      type: "intake",
      occurredAt: new Date().toISOString(),
      intakeType: "formula",
      amountMl: 180,
      confidence: 0.84
    });
  }

  if (text.includes("낮잠") || text.includes("잠")) {
    const now = new Date();
    return validateParsedLog({
      type: "sleep",
      sleepStartAt: new Date(now.getTime() - 75 * 60 * 1000).toISOString(),
      sleepEndAt: now.toISOString(),
      confidence: 0.72,
      followUpQuestion: "기상 시간을 확인하면 수면 길이를 더 정확히 저장할 수 있어요."
    });
  }

  return validateParsedLog({
    type: "note",
    occurredAt: new Date().toISOString(),
    noteCategory: "general",
    note: text || "이미지 업로드 기록",
    confidence: 0.61,
    followUpQuestion: "섭취 기록인지 메모인지 한 번만 더 알려주시면 정확히 저장할게요."
  });
}

async function parseTelegramPayload(payload: TelegramWebhookPayload) {
  const nowIso = new Date().toISOString();
  const text = payload.message?.text?.trim();
  const photo = payload.message?.photo?.at(-1);
  const caption = payload.message?.caption?.trim();

  try {
    if (photo) {
      const imageDataUrl = await getTelegramFileDataUrl(photo.file_id);
      const parsed = await parseImageWithAI({
        imageDataUrl,
        caption,
        nowIso
      });

      if (parsed) {
        return parsed;
      }
    }

    if (text) {
      const parsed = await parseTextWithAI({
        text,
        nowIso
      });

      if (parsed) {
        return parsed;
      }
    }
  } catch (error) {
    console.error("OpenAI parse failed, falling back to heuristic parser.", error);
  }

  return buildMockParserResult(payload);
}

async function saveParsedLog(params: {
  parsed: ReturnType<typeof validateParsedLog>;
  createdBy: string;
  isImage: boolean;
  rawText?: string;
  rawImageUrl?: string;
}) {
  const { parsed, createdBy, isImage, rawText, rawImageUrl } = params;

  if (parsed.type === "intake") {
    await createLog({
      type: "intake",
      occurredAt: parsed.occurredAt ?? new Date().toISOString(),
      intakeType: parsed.intakeType ?? "formula",
      amountMl: parsed.amountMl,
      amountG: parsed.amountG,
      foodName: parsed.note,
      createdBy,
      sourceType: isImage ? "chat_image" : "chat_text",
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
      createdBy,
      sourceType: isImage ? "chat_image" : "chat_text",
      rawText,
      rawImageUrl
    });
    return;
  }

  await createLog({
    type: "note",
    occurredAt: parsed.occurredAt ?? new Date().toISOString(),
    noteCategory: parsed.noteCategory ?? "general",
    note: parsed.note ?? rawText ?? "이미지 업로드 기록",
    createdBy,
    sourceType: isImage ? "chat_image" : "chat_text",
    rawText,
    rawImageUrl
  });
}

async function buildReplyText() {
  const snapshot = await getDashboardSnapshot();
  const formulaPercent = Math.round(
    (snapshot.summary.formulaMl / snapshot.summary.formulaGoalMl) * 100 || 0
  );
  const solidPercent = Math.round(
    (snapshot.summary.solidFoodG / snapshot.summary.solidFoodGoalG) * 100 || 0
  );

  return [
    "기록했어요.",
    `오늘 분유 ${snapshot.summary.formulaMl}ml (${formulaPercent}%)`,
    `오늘 이유식 ${snapshot.summary.solidFoodG}g (${solidPercent}%)`,
    `다음 식사 추천 ${new Intl.DateTimeFormat("ko-KR", {
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date(snapshot.summary.suggestedNextFeedAt))}`
  ].join("\n");
}

export async function POST(request: NextRequest) {
  if (!verifySecretToken(request)) {
    return NextResponse.json({ ok: false, error: "invalid secret" }, { status: 401 });
  }

  const payload = (await request.json()) as TelegramWebhookPayload;
  const chatId = payload.message?.chat?.id;
  const createdBy = resolveTelegramCaregiver(payload.message?.from);
  const isImage = Boolean(payload.message?.photo?.length);
  const lastPhotoId = payload.message?.photo?.at(-1)?.file_id;
  const rawText = payload.message?.text ?? payload.message?.caption;

  if (!chatId) {
    return NextResponse.json({ ok: false, error: "chat id missing" }, { status: 400 });
  }

  if (isImage) {
    const imageUsesToday = await getTodayImageUsage();

    if (imageUsesToday >= 2) {
      await sendTelegramMessage(
        chatId,
        "오늘 사진 인식은 2회까지예요. 지금은 텍스트로 남겨주시면 바로 기록해둘게요."
      );

      return NextResponse.json({
        ok: true,
        limited: true
      });
    }
  }

  if (isImage && lastPhotoId) {
    try {
      const imageDataUrl = await getTelegramFileDataUrl(lastPhotoId);
      const batch = await parseImageBatchWithAI({
        imageDataUrl,
        caption: payload.message?.caption,
        nowIso: new Date().toISOString()
      });

      if (batch && batch.length > 1) {
        for (const entry of batch) {
          await saveParsedLog({
            parsed: entry,
            createdBy,
            isImage: true,
            rawText,
            rawImageUrl: lastPhotoId
          });
        }

        const summary = await getDashboardSnapshot();
        const batchReply = [
          `${batch.length}건을 한 번에 기록했어요.`,
          `오늘 분유 ${summary.summary.formulaMl}ml`,
          `오늘 이유식 ${summary.summary.solidFoodG}g`,
          `다음 식사 추천 ${new Intl.DateTimeFormat("ko-KR", {
            hour: "numeric",
            minute: "2-digit"
          }).format(new Date(summary.summary.suggestedNextFeedAt))}`
        ].join("\n");

        await sendTelegramMessage(chatId, batchReply);

        return NextResponse.json({
          ok: true,
          parsedBatch: batch,
          replyText: batchReply
        });
      }
    } catch (error) {
      console.error("Batch image parse failed, continuing with single parse.", error);
    }
  }

  const parsed = await parseTelegramPayload(payload);
  await saveParsedLog({
    parsed,
    createdBy,
    isImage,
    rawText,
    rawImageUrl: isImage ? lastPhotoId : undefined
  });

  const replyText =
    parsed.confidence < 0.7 && parsed.followUpQuestion
      ? `기록은 우선 남겼어요.\n${parsed.followUpQuestion}`
      : await buildReplyText();

  await sendTelegramMessage(chatId, replyText);

  return NextResponse.json({
    ok: true,
    parsed,
    replyText
  });
}
