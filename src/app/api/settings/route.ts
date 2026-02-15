import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { findUserById, updateLmStudioUrl, updateSystemPrompt, clearSystemPrompt } from "@/lib/db";

export async function GET() {
  const session = await getAuthUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = findUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    lmStudioUrl: user.lm_studio_url,
    hasSystemPrompt: !!user.encrypted_system_prompt,
    encryptedSystemPrompt: user.encrypted_system_prompt,
    systemPromptIv: user.system_prompt_iv,
  });
}

export async function PUT(req: NextRequest) {
  const session = await getAuthUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  if (body.lmStudioUrl !== undefined) {
    updateLmStudioUrl(session.userId, body.lmStudioUrl);
  }

  if (body.systemPrompt !== undefined && body.iv !== undefined) {
    updateSystemPrompt(session.userId, body.systemPrompt, body.iv);
  }

  if (body.clearSystemPrompt) {
    clearSystemPrompt(session.userId);
  }

  return NextResponse.json({ success: true });
}
