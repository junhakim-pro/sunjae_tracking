import { NextResponse } from "next/server";
import { getDashboardSnapshot, getWeeklyTrend } from "@/lib/data";

export async function GET() {
  const [snapshot, weeklyTrend] = await Promise.all([getDashboardSnapshot(), getWeeklyTrend()]);

  return NextResponse.json({
    baby: snapshot.baby,
    summary: snapshot.summary,
    weeklyTrend
  });
}
