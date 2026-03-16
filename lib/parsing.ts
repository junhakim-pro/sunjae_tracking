import { z } from "zod";
import { ParsedChatLog } from "@/lib/types";

export const parseChatLogSchema = z.object({
  type: z.enum(["intake", "sleep", "note"]),
  occurredAt: z.string().datetime().optional(),
  intakeType: z.enum(["formula", "solid_food", "water", "snack"]).optional(),
  amountMl: z.number().int().positive().optional(),
  amountG: z.number().int().positive().optional(),
  sleepStartAt: z.string().datetime().optional(),
  sleepEndAt: z.string().datetime().optional(),
  noteCategory: z.enum(["condition", "symptom", "general"]).optional(),
  note: z.string().optional(),
  confidence: z.number().min(0).max(1),
  followUpQuestion: z.string().optional()
});

export function validateParsedLog(payload: unknown): ParsedChatLog {
  return parseChatLogSchema.parse(payload);
}

export function buildSystemPrompt(nowIso: string) {
  return `
너는 10개월 아기 기록을 구조화하는 파서다.
반드시 JSON만 반환한다.
기록 종류는 intake, sleep, note 중 하나다.
모호하면 confidence를 낮추고 followUpQuestion을 채운다.
의학적 판단을 하지 말고 관찰 기록만 정리한다.
기준 현재 시각은 ${nowIso} 이다.
시간이 생략되면 현재 시각과 가장 가까운 합리적인 당일 시각을 추론하되 confidence를 낮춘다.
배변이나 대변 기록은 note 로 저장하고, noteCategory 는 condition 또는 symptom 중 더 자연스러운 쪽을 고른다.
`.trim();
}

export function buildVisionPrompt(nowIso: string) {
  return `
${buildSystemPrompt(nowIso)}
이미지에는 수첩 필기, 메모, 먹인 양이 있을 수 있다.
손글씨 약어 예시:
- "분", "ㅂ", 동그라미 안의 "분"은 분유일 수 있다.
- "이", 동그라미 안의 "이"는 이유식일 수 있다.
- "낮잠", "잠듦", "기상"은 수면 기록일 수 있다.
- "배변", "대변", "변"은 note 기록일 수 있다.
- "230ml", "170", "140"처럼 숫자와 양이 줄마다 섞일 수 있다.
한 줄씩 분리해서 읽고, 읽을 수 없는 줄은 억지로 만들지 말아라.
읽을 수 없는 부분은 지어내지 말고 confidence를 낮춰라.
단 하나의 가장 확실한 기록만 반환하라.
`.trim();
}
