import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { findUserById } from "@/lib/db";

export async function GET() {
  const session = await getAuthUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = findUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const lmStudioUrl = user.lm_studio_url || "http://localhost:1234";

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
