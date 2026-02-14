import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { findUserById } from "@/lib/db";

export async function GET() {
  const session = await getAuthUser();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const user = findUserById(session.userId);
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    username: user.username,
    lmStudioUrl: user.lm_studio_url,
    hasSystemPrompt: !!user.encrypted_system_prompt,
  });
}
