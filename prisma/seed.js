const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.noteLog.deleteMany();
  await prisma.sleepLog.deleteMany();
  await prisma.intakeLog.deleteMany();
  await prisma.rawMessage.deleteMany();
  await prisma.caregiver.deleteMany();
  await prisma.growthMeasurement.deleteMany();
  await prisma.baby.deleteMany();

  await prisma.baby.create({
    data: {
      id: "baby_sunjae",
      name: "선재",
      birthDate: new Date("2025-05-31T00:00:00+09:00"),
      sex: "male",
      latestWeightKg: 9.1,
      latestHeightCm: 73.5,
      latestMeasurementAt: new Date("2026-03-10T10:00:00+09:00"),
      caregivers: {
        create: [
          { id: "caregiver_mom", name: "엄마", role: "mom", messengerPlatform: "telegram" },
          {
            id: "caregiver_grandma",
            name: "할머니",
            role: "grandma",
            messengerPlatform: "telegram"
          }
        ]
      },
      growthMeasurements: {
        create: {
          id: "growth_1",
          measuredAt: new Date("2026-03-10T10:00:00+09:00"),
          weightKg: 9.1,
          heightCm: 73.5,
          weightPercentile: 58,
          heightPercentile: 44,
          sourceStandard: "WHO"
        }
      }
    }
  });

  await prisma.intakeLog.createMany({
    data: [
      {
        id: "intake_prev_1",
        babyId: "baby_sunjae",
        sourceType: "chat_text",
        intakeType: "formula",
        occurredAt: new Date("2026-03-09T08:20:00+09:00"),
        amountMl: 210,
        createdBy: "엄마",
        parseConfidence: 0.98,
        notes: "아침 분유"
      },
      {
        id: "intake_prev_2",
        babyId: "baby_sunjae",
        sourceType: "chat_text",
        intakeType: "solid_food",
        occurredAt: new Date("2026-03-09T12:30:00+09:00"),
        amountG: 165,
        foodName: "닭고기단호박 이유식",
        createdBy: "할머니",
        parseConfidence: 0.95,
        notes: "거의 다 먹음"
      },
      {
        id: "intake_prev_3",
        babyId: "baby_sunjae",
        sourceType: "chat_text",
        intakeType: "formula",
        occurredAt: new Date("2026-03-10T09:10:00+09:00"),
        amountMl: 190,
        createdBy: "엄마",
        parseConfidence: 0.98,
        notes: "아침 분유"
      },
      {
        id: "intake_prev_4",
        babyId: "baby_sunjae",
        sourceType: "chat_text",
        intakeType: "solid_food",
        occurredAt: new Date("2026-03-10T13:00:00+09:00"),
        amountG: 150,
        foodName: "한우당근 이유식",
        createdBy: "할머니",
        parseConfidence: 0.94,
        notes: "중간에 조금 쉬었다 먹음"
      },
      {
        id: "intake_prev_5",
        babyId: "baby_sunjae",
        sourceType: "chat_text",
        intakeType: "formula",
        occurredAt: new Date("2026-03-11T08:40:00+09:00"),
        amountMl: 220,
        createdBy: "엄마",
        parseConfidence: 0.98,
        notes: "아침 분유"
      },
      {
        id: "intake_prev_6",
        babyId: "baby_sunjae",
        sourceType: "chat_text",
        intakeType: "solid_food",
        occurredAt: new Date("2026-03-11T12:40:00+09:00"),
        amountG: 170,
        foodName: "브로콜리감자 이유식",
        createdBy: "할머니",
        parseConfidence: 0.95,
        notes: "다 먹음"
      },
      {
        id: "intake_prev_7",
        babyId: "baby_sunjae",
        sourceType: "chat_text",
        intakeType: "formula",
        occurredAt: new Date("2026-03-12T08:25:00+09:00"),
        amountMl: 160,
        createdBy: "엄마",
        parseConfidence: 0.92,
        notes: "콧물로 조금 덜 먹음"
      },
      {
        id: "intake_prev_8",
        babyId: "baby_sunjae",
        sourceType: "chat_text",
        intakeType: "solid_food",
        occurredAt: new Date("2026-03-12T12:20:00+09:00"),
        amountG: 110,
        foodName: "단호박오트 이유식",
        createdBy: "할머니",
        parseConfidence: 0.91,
        notes: "평소보다 적게 먹음"
      },
      {
        id: "intake_prev_9",
        babyId: "baby_sunjae",
        sourceType: "chat_text",
        intakeType: "formula",
        occurredAt: new Date("2026-03-13T08:35:00+09:00"),
        amountMl: 175,
        createdBy: "엄마",
        parseConfidence: 0.95,
        notes: "조금 남김"
      },
      {
        id: "intake_prev_10",
        babyId: "baby_sunjae",
        sourceType: "chat_text",
        intakeType: "solid_food",
        occurredAt: new Date("2026-03-13T12:55:00+09:00"),
        amountG: 125,
        foodName: "소고기애호박 이유식",
        createdBy: "할머니",
        parseConfidence: 0.93,
        notes: "입맛이 살짝 약함"
      },
      {
        id: "intake_prev_11",
        babyId: "baby_sunjae",
        sourceType: "chat_text",
        intakeType: "formula",
        occurredAt: new Date("2026-03-14T08:30:00+09:00"),
        amountMl: 205,
        createdBy: "엄마",
        parseConfidence: 0.97,
        notes: "회복세"
      },
      {
        id: "intake_prev_12",
        babyId: "baby_sunjae",
        sourceType: "chat_text",
        intakeType: "solid_food",
        occurredAt: new Date("2026-03-14T12:35:00+09:00"),
        amountG: 155,
        foodName: "닭고기시금치 이유식",
        createdBy: "할머니",
        parseConfidence: 0.95,
        notes: "거의 다 먹음"
      },
      {
        id: "intake_1",
        babyId: "baby_sunjae",
        sourceType: "chat_text",
        intakeType: "formula",
        occurredAt: new Date("2026-03-15T10:40:00+09:00"),
        amountMl: 180,
        createdBy: "할머니",
        parseConfidence: 0.97,
        notes: "다 먹음"
      },
      {
        id: "intake_2",
        babyId: "baby_sunjae",
        sourceType: "chat_text",
        intakeType: "solid_food",
        occurredAt: new Date("2026-03-15T15:30:00+09:00"),
        amountG: 135,
        foodName: "소고기브로콜리 이유식",
        createdBy: "엄마",
        parseConfidence: 0.94,
        notes: "150g 준비, 15g 남김"
      }
    ]
  });

  await prisma.sleepLog.create({
    data: {
      id: "sleep_1",
      babyId: "baby_sunjae",
      startedAt: new Date("2026-03-15T13:05:00+09:00"),
      endedAt: new Date("2026-03-15T14:20:00+09:00"),
      durationMin: 75,
      createdBy: "할머니"
    }
  });

  await prisma.sleepLog.createMany({
    data: [
      {
        id: "sleep_prev_1",
        babyId: "baby_sunjae",
        startedAt: new Date("2026-03-09T13:00:00+09:00"),
        endedAt: new Date("2026-03-09T14:30:00+09:00"),
        durationMin: 90,
        createdBy: "할머니"
      },
      {
        id: "sleep_prev_2",
        babyId: "baby_sunjae",
        startedAt: new Date("2026-03-10T13:15:00+09:00"),
        endedAt: new Date("2026-03-10T14:40:00+09:00"),
        durationMin: 85,
        createdBy: "할머니"
      },
      {
        id: "sleep_prev_3",
        babyId: "baby_sunjae",
        startedAt: new Date("2026-03-11T13:10:00+09:00"),
        endedAt: new Date("2026-03-11T14:35:00+09:00"),
        durationMin: 85,
        createdBy: "할머니"
      },
      {
        id: "sleep_prev_4",
        babyId: "baby_sunjae",
        startedAt: new Date("2026-03-12T13:25:00+09:00"),
        endedAt: new Date("2026-03-12T14:20:00+09:00"),
        durationMin: 55,
        createdBy: "할머니"
      },
      {
        id: "sleep_prev_5",
        babyId: "baby_sunjae",
        startedAt: new Date("2026-03-13T13:20:00+09:00"),
        endedAt: new Date("2026-03-13T14:10:00+09:00"),
        durationMin: 50,
        createdBy: "할머니"
      },
      {
        id: "sleep_prev_6",
        babyId: "baby_sunjae",
        startedAt: new Date("2026-03-14T13:05:00+09:00"),
        endedAt: new Date("2026-03-14T14:25:00+09:00"),
        durationMin: 80,
        createdBy: "할머니"
      }
    ]
  });

  await prisma.noteLog.create({
    data: {
      id: "note_1",
      babyId: "baby_sunjae",
      category: "symptom",
      note: "오후부터 콧물이 조금 있고 입맛이 평소보다 약해 보여요.",
      occurredAt: new Date("2026-03-15T16:10:00+09:00"),
      createdBy: "엄마"
    }
  });

  await prisma.noteLog.createMany({
    data: [
      {
        id: "note_prev_1",
        babyId: "baby_sunjae",
        category: "general",
        note: "낮에 기분 좋고 잘 웃음.",
        occurredAt: new Date("2026-03-09T17:00:00+09:00"),
        createdBy: "할머니"
      },
      {
        id: "note_prev_2",
        babyId: "baby_sunjae",
        category: "general",
        note: "오후에 산책 다녀옴.",
        occurredAt: new Date("2026-03-10T17:10:00+09:00"),
        createdBy: "엄마"
      },
      {
        id: "note_prev_3",
        babyId: "baby_sunjae",
        category: "symptom",
        note: "콧물 시작.",
        occurredAt: new Date("2026-03-12T16:40:00+09:00"),
        createdBy: "엄마"
      },
      {
        id: "note_prev_4",
        babyId: "baby_sunjae",
        category: "condition",
        note: "입맛이 조금 돌아옴.",
        occurredAt: new Date("2026-03-14T18:00:00+09:00"),
        createdBy: "엄마"
      }
    ]
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
