import { NextResponse } from "next/server";
import { getCaregivers } from "@/lib/data";

export async function GET() {
  const caregivers = await getCaregivers();

  return NextResponse.json({
    caregivers
  });
}
