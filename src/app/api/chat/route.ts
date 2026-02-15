import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { findUserById } from "@/lib/db";
import { decryptText } from "@/lib/crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getAuthUser();
  const user = session ? findUserById(session.userId) : null;

  const { messages, model, password, lmStudioUrl: guestUrl, thinkingEnabled } = await req.json();

  // Build message array with optional system prompt (authenticated users only)
  const fullMessages = [...messages];

  if (user?.encrypted_system_prompt && user.system_prompt_iv && password) {
    try {
      const systemPrompt = await decryptText(
        user.encrypted_system_prompt,
        user.system_prompt_iv,
        password
      );
      fullMessages.unshift({ role: "system", content: systemPrompt });
    } catch {
      // If decryption fails, continue without system prompt
    }
  }

  // Authenticated users use saved URL, guests pass it in the request
  const lmStudioUrl = user?.lm_studio_url || guestUrl || "http://localhost:1234";

  try {
    const response = await fetch(`${lmStudioUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model || "default",
        messages: fullMessages,
        stream: true,
        ...(thinkingEnabled === false && { enable_thinking: false }),
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: `LM Studio error: ${errorText}` }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // Stream the response back
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = response.body?.getReader();

    if (!reader) {
      return new Response("No response body", { status: 500 });
    }

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed === "") continue;
              if (trimmed === "data: [DONE]") {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                continue;
              }
              if (trimmed.startsWith("data: ")) {
                controller.enqueue(encoder.encode(trimmed + "\n\n"));
              }
            }
          }
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: String(error) })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        error: `Cannot connect to LM Studio at ${lmStudioUrl} — ${msg}`,
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
