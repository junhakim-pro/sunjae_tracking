import { NoteCategory, SourceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CreateLogInput } from "@/lib/log-schema";
import { dailySummary as fallbackSummary } from "@/lib/mock-data";
import { CaregiverSummary, DailySummary, TimelineEntry, WeeklyTrendPoint } from "@/lib/types";

const BABY_ID = "baby_sunjae";
const DEFAULT_FORMULA_SINGLE_FEED_ML = Number(process.env.FORMULA_SINGLE_FEED_LIMIT_ML || 220);
const DEFAULT_SOLID_SINGLE_FEED_G = Number(process.env.SOLID_SINGLE_FEED_LIMIT_G || 180);

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function endOfToday() {
  const start = startOfToday();
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric"
  }).format(date);
}

function toIso(date: Date) {
  return date.toISOString();
}

function calculateSummary(
  formulaMl: number,
  solidFoodG: number,
  sleepMinutes: number,
  latestIntakeAt?: Date,
  imageUsesToday = 0
): DailySummary {
  const nextFeedBase = latestIntakeAt ?? new Date();
  const nextFeedAt = new Date(nextFeedBase.getTime() + 3 * 60 * 60 * 1000);

  return {
    formulaMl,
    formulaGoalMl: fallbackSummary.formulaGoalMl,
    solidFoodG,
    solidFoodGoalG: fallbackSummary.solidFoodGoalG,
    sleepHours: Math.round((sleepMinutes / 60) * 10) / 10,
    suggestedNextFeedAt: nextFeedAt.toISOString(),
    suggestedWindowHours: 3,
    imageUsesToday,
    imageDailyLimit: fallbackSummary.imageDailyLimit
  };
}

function buildTimeline(
  intakeLogs: Array<{
    id: string;
    intakeType: string;
    amountMl: number | null;
    amountG: number | null;
    foodName: string | null;
    notes: string | null;
    occurredAt: Date;
    createdBy: string;
    parseConfidence: number;
  }>,
  sleepLogs: Array<{
    id: string;
    startedAt: Date;
    endedAt: Date;
    durationMin: number;
    createdBy: string;
  }>,
  noteLogs: Array<{
    id: string;
    category: string;
    note: string;
    occurredAt: Date;
    createdBy: string;
  }>
): TimelineEntry[] {
  const items: TimelineEntry[] = [
    ...intakeLogs.map((log) => ({
      id: log.id,
      kind: "intake" as const,
      title:
        log.intakeType === "formula"
          ? `분유 ${log.amountMl ?? 0}ml`
          : `${log.foodName ?? "이유식"} ${log.amountG ?? 0}g`,
      description: log.notes ?? "섭취 기록",
      happenedAt: toIso(log.occurredAt),
      createdBy: log.createdBy,
      badge: log.intakeType === "formula" ? "분유" : "이유식",
      note: `AI 신뢰도 ${Math.round(log.parseConfidence * 100)}%`,
      intakeType: log.intakeType as TimelineEntry["intakeType"],
      amountMl: log.amountMl ?? undefined,
      amountG: log.amountG ?? undefined,
      foodName: log.foodName ?? undefined
    })),
    ...sleepLogs.map((log) => ({
      id: log.id,
      kind: "sleep" as const,
      title: `수면 ${Math.floor(log.durationMin / 60)}시간 ${log.durationMin % 60}분`,
      description: `${log.durationMin}분 수면으로 기록`,
      happenedAt: toIso(log.startedAt),
      createdBy: log.createdBy,
      badge: "수면",
      sleepStartAt: toIso(log.startedAt),
      sleepEndAt: toIso(log.endedAt)
    })),
    ...noteLogs.map((log) => ({
      id: log.id,
      kind: "note" as const,
      title: log.category === "symptom" ? "증상 메모" : "메모",
      description: log.note,
      happenedAt: toIso(log.occurredAt),
      createdBy: log.createdBy,
      badge: "메모",
      noteCategory: log.category as TimelineEntry["noteCategory"]
    }))
  ];

  return items.sort((a, b) => (a.happenedAt < b.happenedAt ? 1 : -1));
}

export async function getDashboardSnapshot() {
  const today = { gte: startOfToday(), lt: endOfToday() };
  const [baby, latestGrowth, intakeLogs, sleepLogs, noteLogs, imageUsesToday] = await Promise.all([
    prisma.baby.findUnique({ where: { id: BABY_ID } }),
    prisma.growthMeasurement.findFirst({
      where: { babyId: BABY_ID },
      orderBy: { measuredAt: "desc" }
    }),
    prisma.intakeLog.findMany({
      where: { babyId: BABY_ID, occurredAt: today },
      orderBy: { occurredAt: "desc" }
    }),
    prisma.sleepLog.findMany({
      where: { babyId: BABY_ID, startedAt: today },
      orderBy: { startedAt: "desc" }
    }),
    prisma.noteLog.findMany({
      where: { babyId: BABY_ID, occurredAt: today },
      orderBy: { occurredAt: "desc" }
    }),
    prisma.rawMessage.count({
      where: {
        babyId: BABY_ID,
        sourceType: SourceType.chat_image,
        receivedAt: today
      }
    })
  ]);

  if (!baby || !latestGrowth) {
    throw new Error("시드 데이터가 없습니다. 먼저 DB 시드를 실행해주세요.");
  }

  const formulaMl = intakeLogs.reduce((sum, item) => sum + (item.amountMl ?? 0), 0);
  const solidFoodG = intakeLogs.reduce((sum, item) => sum + (item.amountG ?? 0), 0);
  const sleepMinutes = sleepLogs.reduce((sum, item) => sum + item.durationMin, 0);

  return {
    baby: {
      id: baby.id,
      name: baby.name,
      birthDate: baby.birthDate.toISOString().slice(0, 10),
      monthAgeLabel: "10개월 2주",
      latestWeightKg: baby.latestWeightKg ?? 0,
      latestHeightCm: baby.latestHeightCm ?? 0,
      measuredAt: latestGrowth.measuredAt.toISOString().slice(0, 10),
      weightPercentile: latestGrowth.weightPercentile ?? 0,
      heightPercentile: latestGrowth.heightPercentile ?? 0
    },
    summary: calculateSummary(
      formulaMl,
      solidFoodG,
      sleepMinutes,
      intakeLogs[0]?.occurredAt,
      imageUsesToday
    ),
    timeline: buildTimeline(intakeLogs, sleepLogs, noteLogs)
  };
}

export async function getWeeklyTrend(): Promise<WeeklyTrendPoint[]> {
  const today = startOfToday();
  const weekStart = addDays(today, -6);
  const weekEnd = addDays(today, 1);

  const [intakeLogs, sleepLogs, noteLogs] = await Promise.all([
    prisma.intakeLog.findMany({
      where: {
        babyId: BABY_ID,
        occurredAt: {
          gte: weekStart,
          lt: weekEnd
        }
      }
    }),
    prisma.sleepLog.findMany({
      where: {
        babyId: BABY_ID,
        startedAt: {
          gte: weekStart,
          lt: weekEnd
        }
      }
    }),
    prisma.noteLog.findMany({
      where: {
        babyId: BABY_ID,
        occurredAt: {
          gte: weekStart,
          lt: weekEnd
        }
      }
    })
  ]);

  return Array.from({ length: 7 }, (_, index) => {
    const day = addDays(weekStart, index);
    const nextDay = addDays(day, 1);

    const dayIntakes = intakeLogs.filter((log) => log.occurredAt >= day && log.occurredAt < nextDay);
    const daySleep = sleepLogs.filter((log) => log.startedAt >= day && log.startedAt < nextDay);
    const dayNotes = noteLogs.filter((log) => log.occurredAt >= day && log.occurredAt < nextDay);

    const formulaMl = dayIntakes.reduce((sum, log) => sum + (log.amountMl ?? 0), 0);
    const solidFoodG = dayIntakes.reduce((sum, log) => sum + (log.amountG ?? 0), 0);
    const sleepHours = Math.round((daySleep.reduce((sum, log) => sum + log.durationMin, 0) / 60) * 10) / 10;

    return {
      dateLabel: formatDayLabel(day),
      formulaMl,
      solidFoodG,
      sleepHours,
      noteCount: dayNotes.length
    };
  });
}

export async function createLog(input: CreateLogInput) {
  const sourceType = input.sourceType ? (input.sourceType as SourceType) : SourceType.web_form;
  const rawMessage =
    input.rawText || input.rawImageUrl
      ? await prisma.rawMessage.create({
          data: {
            id: crypto.randomUUID(),
            babyId: BABY_ID,
            sourceType,
            rawText: input.rawText,
            rawImageUrl: input.rawImageUrl
          }
        })
      : null;

  if (input.type === "intake") {
    return prisma.intakeLog.create({
      data: {
        id: crypto.randomUUID(),
        babyId: BABY_ID,
        rawMessageId: rawMessage?.id,
        sourceType,
        intakeType: input.intakeType,
        occurredAt: new Date(input.occurredAt),
        amountMl: input.amountMl,
        amountG: input.amountG,
        foodName: input.foodName,
        notes: input.notes,
        createdBy: input.createdBy,
        parseConfidence: input.parseConfidence ?? 1
      }
    });
  }

  if (input.type === "sleep") {
    const startedAt = new Date(input.startedAt);
    const endedAt = new Date(input.endedAt);
    const durationMin = Math.max(1, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000));

    return prisma.sleepLog.create({
      data: {
        id: crypto.randomUUID(),
        babyId: BABY_ID,
        rawMessageId: rawMessage?.id,
        startedAt,
        endedAt,
        durationMin,
        createdBy: input.createdBy
      }
    });
  }

  return prisma.noteLog.create({
    data: {
      id: crypto.randomUUID(),
      babyId: BABY_ID,
      rawMessageId: rawMessage?.id,
      category: input.noteCategory as NoteCategory,
      note: input.note,
      occurredAt: new Date(input.occurredAt),
      createdBy: input.createdBy
    }
  });
}

export async function getTodayImageUsage() {
  return prisma.rawMessage.count({
    where: {
      babyId: BABY_ID,
      sourceType: SourceType.chat_image,
      receivedAt: {
        gte: startOfToday(),
        lt: endOfToday()
      }
    }
  });
}

export async function findSuspiciousIntake(input: {
  occurredAt: string;
  intakeType: "formula" | "solid_food" | "water" | "snack";
  amountMl?: number;
  amountG?: number;
}) {
  const occurredAt = new Date(input.occurredAt);
  const windowStart = new Date(occurredAt.getTime() - 15 * 60 * 1000);
  const recentLogs = await prisma.intakeLog.findMany({
    where: {
      babyId: BABY_ID,
      intakeType: input.intakeType,
      occurredAt: {
        gte: windowStart,
        lte: occurredAt
      }
    },
    orderBy: { occurredAt: "desc" },
    take: 5
  });

  if (input.intakeType === "formula" || input.intakeType === "water") {
    const candidateAmount = input.amountMl ?? 0;
    const totalAmount = recentLogs.reduce((sum, log) => sum + (log.amountMl ?? 0), 0) + candidateAmount;
    const hasVerySimilarRecent = recentLogs.some((log) => {
      const diffMin = Math.abs(occurredAt.getTime() - log.occurredAt.getTime()) / 60000;
      return diffMin <= 10 && Math.abs((log.amountMl ?? 0) - candidateAmount) <= 20;
    });

    if (hasVerySimilarRecent && candidateAmount >= 120) {
      const recent = recentLogs[0];
      const recentLabel =
        (recent.amountMl ?? 0) > 0
          ? `${new Intl.DateTimeFormat("ko-KR", {
              hour: "numeric",
              minute: "2-digit"
            }).format(recent.occurredAt)}에 ${(recent.amountMl ?? 0)}ml`
          : "방금 전 분유";

      return {
        suspicious: true,
        question: `${recentLabel} 기록이 이미 있어요. 중복 기록이면 '취소', 실제 추가 섭취면 '추가 섭취'라고 답해주세요.`
      };
    }

    if (totalAmount > DEFAULT_FORMULA_SINGLE_FEED_ML * 1.45) {
      return {
        suspicious: true,
        question: `짧은 시간 안에 총 ${totalAmount}ml로 계산돼요. 평소 1회 섭취량보다 많아 보여요. 중복이면 '취소', 실제 추가 섭취면 '추가 섭취'라고 답해주세요.`
      };
    }
  }

  if (input.intakeType === "solid_food" || input.intakeType === "snack") {
    const candidateAmount = input.amountG ?? 0;
    const totalAmount = recentLogs.reduce((sum, log) => sum + (log.amountG ?? 0), 0) + candidateAmount;

    if (totalAmount > DEFAULT_SOLID_SINGLE_FEED_G * 1.5) {
      return {
        suspicious: true,
        question: `짧은 시간 안에 총 ${totalAmount}g로 계산돼요. 중복 기록일 수 있으면 '취소', 실제 추가 섭취면 '추가 섭취'라고 답해주세요.`
      };
    }
  }

  return {
    suspicious: false as const
  };
}

export async function createPendingConfirmation(input: {
  chatId: string;
  kind: string;
  payload: CreateLogInput;
  question: string;
  createdBy: string;
  rawText?: string;
  rawImageUrl?: string;
}) {
  await prisma.pendingConfirmation.deleteMany({
    where: {
      chatId: input.chatId
    }
  });

  return prisma.pendingConfirmation.create({
    data: {
      id: crypto.randomUUID(),
      babyId: BABY_ID,
      chatId: input.chatId,
      kind: input.kind,
      payload: JSON.parse(JSON.stringify(input.payload)) as object,
      question: input.question,
      createdBy: input.createdBy,
      rawText: input.rawText,
      rawImageUrl: input.rawImageUrl,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    }
  });
}

export async function getPendingConfirmation(chatId: string) {
  return prisma.pendingConfirmation.findFirst({
    where: {
      chatId,
      expiresAt: {
        gt: new Date()
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

export async function deletePendingConfirmation(id: string) {
  return prisma.pendingConfirmation.delete({
    where: { id }
  });
}

export async function getCaregivers(): Promise<CaregiverSummary[]> {
  const caregivers = await prisma.caregiver.findMany({
    where: { babyId: BABY_ID },
    orderBy: { createdAt: "asc" }
  });

  return caregivers.map((caregiver) => ({
    id: caregiver.id,
    name: caregiver.name,
    role: caregiver.role as CaregiverSummary["role"],
    messengerPlatform: caregiver.messengerPlatform
  }));
}

type UpdateTimelineInput =
  | {
      id: string;
      kind: "intake";
      occurredAt: string;
      createdBy: string;
      intakeType: "formula" | "solid_food" | "water" | "snack";
      amountMl?: number;
      amountG?: number;
      foodName?: string;
      notes?: string;
    }
  | {
      id: string;
      kind: "sleep";
      startedAt: string;
      endedAt: string;
      createdBy: string;
    }
  | {
      id: string;
      kind: "note";
      occurredAt: string;
      createdBy: string;
      noteCategory: "condition" | "symptom" | "general";
      note: string;
    };

export async function updateTimelineEntry(input: UpdateTimelineInput) {
  if (input.kind === "intake") {
    return prisma.intakeLog.update({
      where: { id: input.id },
      data: {
        occurredAt: new Date(input.occurredAt),
        createdBy: input.createdBy,
        intakeType: input.intakeType,
        amountMl: input.amountMl,
        amountG: input.amountG,
        foodName: input.foodName,
        notes: input.notes
      }
    });
  }

  if (input.kind === "sleep") {
    const startedAt = new Date(input.startedAt);
    const endedAt = new Date(input.endedAt);

    return prisma.sleepLog.update({
      where: { id: input.id },
      data: {
        startedAt,
        endedAt,
        durationMin: Math.max(1, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000)),
        createdBy: input.createdBy
      }
    });
  }

  return prisma.noteLog.update({
    where: { id: input.id },
    data: {
      occurredAt: new Date(input.occurredAt),
      createdBy: input.createdBy,
      category: input.noteCategory as NoteCategory,
      note: input.note
    }
  });
}

export async function deleteTimelineEntry(input: { id: string; kind: "intake" | "sleep" | "note" }) {
  if (input.kind === "intake") {
    return prisma.intakeLog.delete({ where: { id: input.id } });
  }

  if (input.kind === "sleep") {
    return prisma.sleepLog.delete({ where: { id: input.id } });
  }

  return prisma.noteLog.delete({ where: { id: input.id } });
}
