import { NextRequest, NextResponse } from "next/server";
import {
  createLog,
  createPendingConfirmation,
  deletePendingConfirmation,
  findSuspiciousIntake,
  getDashboardSnapshot,
  getPendingConfirmation,
  getTodayImageUsage
} from "@/lib/data";
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
    from?: { id: number; first_name?: string; username?: string };
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

function extractAmount(text: string) {
  const normalized = text.replace(/\s+/g, "");
  const mlMatch = normalized.match(/(\d{1,4})(?:ml|미리|밀리|cc)/i);

  if (mlMatch) {
    return { unit: "ml" as const, value: Number(mlMatch[1]) };
  }

  const gMatch = normalized.match(/(\d{1,4})(?:g|그램)/i);

  if (gMatch) {
    return { unit: "g" as const, value: Number(gMatch[1]) };
  }

  const bareMatch = normalized.match(/(\d{2,4})/);

  if (bareMatch) {
    return { unit: "ml" as const, value: Number(bareMatch[1]) };
  }

  return null;
}

function extractOccurredAt(text: string, fallbackEpochSeconds?: number) {
  const base = fallbackEpochSeconds ? new Date(fallbackEpochSeconds * 1000) : new Date();
  const colonMatch = text.match(/\b(\d{1,2})[:.](\d{1,2})\b/);

  if (colonMatch) {
    const occurredAt = new Date(base);
    occurredAt.setHours(Number(colonMatch[1]), Number(colonMatch[2]), 0, 0);
    return occurredAt.toISOString();
  }

  const koreanMatch = text.match(/(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분?)?/);

  if (koreanMatch) {
    const occurredAt = new Date(base);
    occurredAt.setHours(Number(koreanMatch[1]), Number(koreanMatch[2] ?? "0"), 0, 0);
    return occurredAt.toISOString();
  }

  return base.toISOString();
}

function buildMockParserResult(payload: TelegramWebhookPayload) {
  const text = (payload.message?.text ?? payload.message?.caption ?? "").trim();
  const amount = extractAmount(text);
  const occurredAt = extractOccurredAt(text, payload.message?.date);

  if (text.includes("분유")) {
    return validateParsedLog({
      type: "intake",
      occurredAt,
      intakeType: "formula",
      amountMl: amount?.unit === "ml" ? amount.value : undefined,
      confidence: amount?.unit === "ml" ? 0.91 : 0.72,
      followUpQuestion:
        amount?.unit === "ml" ? undefined : "분유 양을 ml로 한 번만 더 알려주시면 정확히 저장할게요."
    });
  }

  if (text.includes("이유식") || text.includes("죽") || text.includes("밥")) {
    return validateParsedLog({
      type: "intake",
      occurredAt,
      intakeType: "solid_food",
      amountG: amount?.unit === "g" ? amount.value : undefined,
      note: text,
      confidence: amount?.unit === "g" ? 0.88 : 0.68,
      followUpQuestion:
        amount?.unit === "g" ? undefined : "이유식 양을 g으로 한 번만 더 알려주시면 정확히 저장할게요."
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
    occurredAt,
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

function parseConfirmationIntent(text?: string) {
  const normalized = text?.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (
    normalized.includes("추가") ||
    normalized.includes("중복 아님") ||
    normalized.includes("중복아님") ||
    normalized.includes("맞아") ||
    normalized.includes("맞아요") ||
    normalized.includes("실제")
  ) {
    return "confirm";
  }

  if (
    normalized.includes("취소") ||
    normalized.includes("중복") ||
    normalized.includes("실수") ||
    normalized.includes("삭제")
  ) {
    return "cancel";
  }

  return null;
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

  const pending = await getPendingConfirmation(String(chatId));
  const confirmationIntent = parseConfirmationIntent(payload.message?.text);

  if (pending && confirmationIntent === "cancel") {
    await deletePendingConfirmation(pending.id);
    await sendTelegramMessage(chatId, "중복 기록으로 보고 저장하지 않았어요.");

    return NextResponse.json({
      ok: true,
      cancelled: true
    });
  }

  if (pending && confirmationIntent === "confirm") {
    await deletePendingConfirmation(pending.id);
    await createLog(pending.payload as unknown as Parameters<typeof createLog>[0]);
    const replyText = await buildReplyText();
    await sendTelegramMessage(chatId, `추가 섭취로 보고 저장했어요.\n${replyText}`);

    return NextResponse.json({
      ok: true,
      confirmed: true,
      replyText
    });
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

  if (parsed.type === "intake") {
    const candidatePayload = {
      type: "intake" as const,
      occurredAt: parsed.occurredAt ?? new Date().toISOString(),
      intakeType: parsed.intakeType ?? "formula",
      amountMl: parsed.amountMl,
      amountG: parsed.amountG,
      foodName: parsed.note,
      createdBy,
      sourceType: isImage ? ("chat_image" as const) : ("chat_text" as const),
      parseConfidence: parsed.confidence,
      rawText,
      rawImageUrl: isImage ? lastPhotoId : undefined
    };
    const suspicious = await findSuspiciousIntake(candidatePayload);

    if (suspicious.suspicious) {
      await createPendingConfirmation({
        chatId: String(chatId),
        kind: isImage ? "chat_image" : "chat_text",
        payload: candidatePayload,
        question: suspicious.question,
        createdBy,
        rawText,
        rawImageUrl: isImage ? lastPhotoId : undefined
      });
      await sendTelegramMessage(chatId, suspicious.question);

      return NextResponse.json({
        ok: true,
        suspicious: true,
        replyText: suspicious.question
      });
    }
  }

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
