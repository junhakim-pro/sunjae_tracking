export type CaregiverRole = "mom" | "dad" | "grandma" | "grandpa";

export type IntakeType = "formula" | "solid_food" | "water" | "snack";
export type SourceType = "chat_text" | "chat_image" | "web_form";
export type NoteCategory = "condition" | "symptom" | "general";
export type TimelineKind = "intake" | "sleep" | "note";

export interface BabyProfile {
  id: string;
  name: string;
  birthDate: string;
  monthAgeLabel: string;
  latestWeightKg: number;
  latestHeightCm: number;
  measuredAt: string;
  weightPercentile: number;
  heightPercentile: number;
}

export interface IntakeLog {
  id: string;
  babyId: string;
  occurredAt: string;
  intakeType: IntakeType;
  amountMl?: number;
  amountG?: number;
  consumedRatio?: number;
  foodName?: string;
  notes?: string;
  sourceType: SourceType;
  createdBy: string;
  parseConfidence: number;
}

export interface SleepLog {
  id: string;
  babyId: string;
  startedAt: string;
  endedAt: string;
  durationMin: number;
  createdBy: string;
}

export interface NoteLog {
  id: string;
  babyId: string;
  occurredAt: string;
  category: NoteCategory;
  note: string;
  createdBy: string;
}

export interface DailySummary {
  formulaMl: number;
  formulaGoalMl: number;
  solidFoodG: number;
  solidFoodGoalG: number;
  sleepHours: number;
  suggestedNextFeedAt: string;
  suggestedWindowHours: number;
  imageUsesToday: number;
  imageDailyLimit: number;
}

export interface TimelineEntry {
  id: string;
  kind: TimelineKind;
  title: string;
  description: string;
  happenedAt: string;
  createdBy: string;
  badge: string;
  note?: string;
  intakeType?: IntakeType;
  amountMl?: number;
  amountG?: number;
  foodName?: string;
  sleepStartAt?: string;
  sleepEndAt?: string;
  noteCategory?: NoteCategory;
}

export interface CaregiverSummary {
  id: string;
  name: string;
  role: CaregiverRole;
  messengerPlatform: string;
}

export interface ChatExample {
  role: "user" | "assistant";
  message: string;
  meta?: string;
}

export interface WeeklyTrendPoint {
  dateLabel: string;
  formulaMl: number;
  solidFoodG: number;
  sleepHours: number;
  noteCount: number;
}

export interface ParsedChatLog {
  type: "intake" | "sleep" | "note";
  occurredAt?: string;
  intakeType?: IntakeType;
  amountMl?: number;
  amountG?: number;
  sleepStartAt?: string;
  sleepEndAt?: string;
  noteCategory?: NoteCategory;
  note?: string;
  confidence: number;
  followUpQuestion?: string;
}
