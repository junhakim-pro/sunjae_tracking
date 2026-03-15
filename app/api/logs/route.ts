import { NextRequest, NextResponse } from "next/server";
import { createLog, getDashboardSnapshot } from "@/lib/data";
import { createLogSchema } from "@/lib/log-schema";

export async function GET() {
  const snapshot = await getDashboardSnapshot();

  return NextResponse.json({
    items: snapshot.timeline
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createLogSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "입력 형식이 올바르지 않아요.",
        issues: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const item = await createLog(parsed.data);

  return NextResponse.json({
    item,
    message: "로그를 저장했습니다."
  });
}
