import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { findUserById } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getAuthUser();
  const user = session ? findUserById(session.userId) : null;

  // Guest users pass server URL as query param
  const guestUrl = req.nextUrl.searchParams.get("serverUrl");
  const lmStudioUrl = user?.lm_studio_url || guestUrl || "http://localhost:1234";

  try {
    const response = await fetch(`${lmStudioUrl}/v1/models`);
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch models from LM Studio" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      {
        error: `Cannot connect to LM Studio at ${lmStudioUrl}. Make sure it's running.`,
      },
      { status: 502 }
    );
  }
}
