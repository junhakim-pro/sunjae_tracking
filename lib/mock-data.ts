import { BabyProfile, ChatExample, DailySummary, TimelineEntry } from "@/lib/types";

export const babyProfile: BabyProfile = {
  id: "baby_sunjae",
  name: "선재",
  birthDate: "2025-05-02",
  monthAgeLabel: "10개월 2주",
  latestWeightKg: 9.1,
  latestHeightCm: 73.5,
  measuredAt: "2026-03-10",
  weightPercentile: 58,
  heightPercentile: 44
};

export const dailySummary: DailySummary = {
  formulaMl: 420,
  formulaGoalMl: 720,
  solidFoodG: 255,
  solidFoodGoalG: 360,
  sleepHours: 2.8,
  stoolCount: 1,
  suggestedNextFeedAt: "2026-03-15T19:30:00+09:00",
  suggestedWindowHours: 3,
  imageUsesToday: 1,
  imageDailyLimit: 2
};

export const timeline: TimelineEntry[] = [
  {
    id: "t1",
    kind: "intake",
    title: "분유 180ml",
    description: "10:40에 분유를 다 먹었어요.",
    happenedAt: "2026-03-15T10:40:00+09:00",
    createdBy: "할머니",
    badge: "분유",
    note: "사진 없이 텍스트로 입력"
  },
  {
    id: "t2",
    kind: "sleep",
    title: "낮잠 1시간 15분",
    description: "13:05부터 14:20까지 잤어요.",
    happenedAt: "2026-03-15T13:05:00+09:00",
    createdBy: "할머니",
    badge: "수면"
  },
  {
    id: "t3",
    kind: "intake",
    title: "소고기브로콜리 이유식 135g",
    description: "150g 준비했고 15g 남겼어요.",
    happenedAt: "2026-03-15T15:30:00+09:00",
    createdBy: "엄마",
    badge: "이유식",
    note: "AI가 남긴 양을 계산해 섭취량 135g으로 저장"
  },
  {
    id: "t4",
    kind: "note",
    title: "콧물 약간",
    description: "오후부터 콧물이 조금 있고 입맛이 평소보다 약해 보여요.",
    happenedAt: "2026-03-15T16:10:00+09:00",
    createdBy: "엄마",
    badge: "메모"
  }
];

export const chatExamples: ChatExample[] = [
  {
    role: "user",
    message: "3시 30분에 소고기브로콜리 이유식 150 준비했는데 15 정도 남겼어",
    meta: "엄마 · 텍스트 입력"
  },
  {
    role: "assistant",
    message:
      "15:30 이유식 135g으로 기록했어요. 오늘 이유식 목표 360g 중 71% 달성했고, 마지막 식사 기준 다음 식사는 약 3시간 뒤가 좋아 보여요.",
    meta: "AI 파서 신뢰도 0.94"
  },
  {
    role: "user",
    message: "낮잠은 1시 5분부터 2시 20분까지",
    meta: "할머니 · 텍스트 입력"
  },
  {
    role: "assistant",
    message: "낮잠 75분으로 저장했어요. 오늘 총 수면은 2시간 48분이에요.",
    meta: "수면 로그 자동 합산"
  }
];
