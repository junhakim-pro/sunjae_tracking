import { validateParsedLog } from "@/lib/parsing";

export function extractAmount(text: string) {
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

export function extractOccurredAt(text: string, fallbackEpochSeconds?: number) {
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

export function buildHeuristicParsedLog(input: {
  text: string;
  fallbackEpochSeconds?: number;
}) {
  const text = input.text.trim();
  const amount = extractAmount(text);
  const occurredAt = extractOccurredAt(text, input.fallbackEpochSeconds);

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

  if (text.includes("배변") || text.includes("대변") || text.includes("변")) {
    return validateParsedLog({
      type: "note",
      occurredAt,
      noteCategory: text.includes("설사") || text.includes("묽") ? "symptom" : "condition",
      note: text,
      confidence: 0.9
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
    note: text,
    confidence: 0.61,
    followUpQuestion: "섭취 기록인지 메모인지 한 번만 더 알려주시면 정확히 저장할게요."
  });
}

