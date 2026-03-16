import { NextRequest, NextResponse } from "next/server";
import {
  createLog,
  createPendingConfirmation,
  deletePendingConfirmation,
  findSuspiciousIntake,
  getDashboardSnapshot,
  hasRecentBotHint,
  logBotHint,
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
import { buildHeuristicParsedLog } from "@/lib/chat-heuristics";

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

type TextIntent = "help" | "record" | "ambiguous" | "ignore";

function classifyTelegramText(text: string): TextIntent {
  const normalized = text.trim().toLowerCase();

  if (!normalized) {
    return "ignore";
  }

  if (
    normalized === "/start" ||
    normalized === "/help" ||
    normalized.includes("도움말") ||
    normalized.includes("사용법")
  ) {
    return "help";
  }

  const hasAmount = /(\d{1,4})\s*(ml|미리|밀리|cc|g|그램)/i.test(normalized);
  const hasTime = /\b\d{1,2}[:.]\d{1,2}\b|(\d{1,2})\s*시(\s*\d{1,2}\s*분?)?/i.test(normalized);
  const hasIntakeKeyword =
    /분유|이유식|수유|먹음|먹었|먹었다|먹는|먹였|먹임|간식|물|죽|밥/.test(normalized);
  const hasSleepKeyword = /낮잠|밤잠|수면|잠|기상|깸|깨서|잤|잠들/.test(normalized);
  const hasNoteKeyword =
    /콧물|기침|열|감기|설사|구토|변|병원|약|컨디션|메모|특이|증상|피부/.test(normalized);
  const hasRecordKeyword = /기록|남겨|저장|추가/.test(normalized);
  const hasSmallTalkKeyword =
    /ㅋㅋ|ㅎㅎ|하하|고마워|좋네|알겠어|오케이|ok|배고프|사진|어디|언제|뭐해|잘자/.test(normalized);

  if (hasNoteKeyword) {
    return "record";
  }

  if ((hasIntakeKeyword && hasAmount) || (hasSleepKeyword && hasTime)) {
    return "record";
  }

  if ((hasIntakeKeyword || hasSleepKeyword) && (hasRecordKeyword || hasTime || hasAmount)) {
    return "record";
  }

  if (hasIntakeKeyword || hasSleepKeyword || hasRecordKeyword) {
    return "ambiguous";
  }

  if (hasSmallTalkKeyword) {
    return "ignore";
  }

  return "ignore";
}

function buildHelpText() {
  return [
    "기록 예시는 이렇게 남기면 돼요.",
    "분유 180미리",
    "낮잠 1시부터 2시 20분",
    "콧물 조금 있음"
  ].join("\n");
}

function buildMockParserResult(payload: TelegramWebhookPayload) {
  return buildHeuristicParsedLog({
    text: (payload.message?.text ?? payload.message?.caption ?? "").trim() || "이미지 업로드 기록",
    fallbackEpochSeconds: payload.message?.date
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
    `오늘 대변 ${snapshot.summary.stoolCount}회`,
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

  const text = payload.message?.text?.trim();
  const textIntent = text ? classifyTelegramText(text) : null;

  if (textIntent === "help") {
    const helpText = buildHelpText();
    await sendTelegramMessage(chatId, helpText);

    return NextResponse.json({
      ok: true,
      replyText: helpText,
      mode: "help"
    });
  }

  if (text && textIntent === "ambiguous") {
    const alreadyNudged = await hasRecentBotHint(String(chatId), "ambiguous_text", 60);

    if (!alreadyNudged) {
      const nudgeText =
        "기록으로 이해하려면 조금만 더 구체적으로 남겨주세요. 예: 분유 180미리 / 낮잠 1시~2시 / 콧물 조금 있음";
      await logBotHint(String(chatId), "ambiguous_text", text);
      await sendTelegramMessage(chatId, nudgeText);

      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: "ambiguous",
        replyText: nudgeText
      });
    }

    return NextResponse.json({
      ok: true,
      ignored: true,
      reason: "ambiguous_silenced"
    });
  }

  if (text && textIntent === "ignore") {
    return NextResponse.json({
      ok: true,
      ignored: true,
      reason: "small_talk"
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
