import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { findUserById } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getAuthUser();
  const user = session ? findUserById(session.userId) : null;

  // Guest users pass server URL as query param
  const guestUrl = req.nextUrl.searchParams.get("serverUrl");
  const lmStudioUrl = user?.lm_studio_url || guestUrl || "http://localhost:1234";

  try {
    const response = await fetch(`${lmStudioUrl}/v1/models`, {
      cache: "no-store",
    });
    if (!response.ok) {
      return NextResponse.json(
        { error: `LM Studio returned ${response.status}: ${await response.text()}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: `Cannot connect to LM Studio at ${lmStudioUrl} — ${msg}`,
      },
      { status: 502 }
    );
  }
}
