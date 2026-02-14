"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import TopMenu from "./TopMenu";
import SlashCommandMenu, { SlashCommand } from "./SlashCommandMenu";
import WaitingIndicator from "./WaitingIndicator";
import TerminalMarkdown from "./TerminalMarkdown";
import CopyButton from "./CopyButton";
import { encryptText } from "@/lib/crypto";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatTerminalProps {
  username: string;
  password: string;
  onLogout: () => void;
}

export default function ChatTerminal({
  username,
  password,
  onLogout,
}: ChatTerminalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentModel, setCurrentModel] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashFilter, setSlashFilter] = useState("");
  const [slashIndex, setSlashIndex] = useState(0);
  const [modalMode, setModalMode] = useState<string | null>(null);
  const [modalInput, setModalInput] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const modalInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const modalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch initial settings
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.lmStudioUrl) setServerUrl(data.lmStudioUrl);
      });
  }, []);

  // Fetch models
  const fetchModels = useCallback(async () => {
    try {
      const res = await fetch("/api/models");
      const data = await res.json();
      if (data.data) {
        const modelIds = data.data.map((m: { id: string }) => m.id);
        setModels(modelIds);
        if (!currentModel && modelIds.length > 0) {
          setCurrentModel(modelIds[0]);
        }
      }
    } catch {
      // Models fetch failed silently
    }
  }, [currentModel]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamedContent, showHelp]);

  useEffect(() => {
    if (modalMode === "system") {
      modalTextareaRef.current?.focus();
    } else if (modalMode) {
      modalInputRef.current?.focus();
    } else {
      inputRef.current?.focus();
    }
  }, [modalMode]);

  // Slash commands
  const slashCommands: SlashCommand[] = [
    {
      name: "cls",
      description: "Clear chat history",
      action: () => {
        setMessages([]);
        setStreamedContent("");
      },
    },
    {
      name: "model",
      description: "Select AI model",
      action: () => {
        fetchModels();
        setModalMode("model");
      },
    },
    {
      name: "server",
      description: "Configure LM Studio server URL",
      action: () => {
        setModalInput(serverUrl);
        setModalMode("server");
      },
    },
    {
      name: "system",
      description: "Set system prompt (encrypted)",
      action: () => {
        setModalInput("");
        setModalMode("system");
      },
    },
    {
      name: "stop",
      description: "Stop AI response",
      action: () => stopResponse(),
    },
    {
      name: "help",
      description: "Show available commands",
      action: () => setShowHelp((h) => !h),
    },
    {
      name: "logout",
      description: "Log out",
      action: () => handleLogout(),
    },
  ];

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    onLogout();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);

    if (val.startsWith("/")) {
      setShowSlashMenu(true);
      setSlashFilter(val.slice(1));
      setSlashIndex(0);
    } else {
      setShowSlashMenu(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSlashMenu) {
      const filtered = slashCommands.filter((c) =>
        c.name.startsWith(slashFilter.toLowerCase())
      );
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashIndex((i) => (i - 1 + filtered.length) % filtered.length);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashIndex((i) => (i + 1) % filtered.length);
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && filtered.length > 0 && input.startsWith("/"))) {
        e.preventDefault();
        const cmd = filtered[slashIndex % filtered.length];
        if (cmd) {
          cmd.action();
          setInput("");
          setShowSlashMenu(false);
        }
        return;
      }
      if (e.key === "Escape") {
        setShowSlashMenu(false);
        return;
      }
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;

    // Slash commands always work, even while streaming
    if (text.startsWith("/")) {
      const cmdName = text.slice(1).split(" ")[0].toLowerCase();
      const cmd = slashCommands.find((c) => c.name === cmdName);
      if (cmd) {
        cmd.action();
        setInput("");
        return;
      }
    }

    // Don't send chat messages while streaming
    if (isStreaming) return;

    setInput("");
    setShowSlashMenu(false);
    const userMessage: Message = { role: "user", content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsStreaming(true);
    setStreamedContent("");
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          model: currentModel,
          password,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setMessages([
          ...newMessages,
          {
            role: "assistant",
            content: `[ERROR] ${errorData.error || "Failed to get response"}`,
          },
        ]);
        setIsStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setIsStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = "";
      let thinkingDetected = false;
      let thinkingDone = false;
      let visibleStart = 0; // offset where visible content begins

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") continue;
          if (!trimmed.startsWith("data: ")) continue;

          try {
            const json = JSON.parse(trimmed.slice(6));
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              accumulated += delta;

              // Detect thinking on first few tokens
              if (!thinkingDetected && !thinkingDone) {
                const trimmedAcc = accumulated.trimStart();
                if (trimmedAcc.startsWith("<think") || trimmedAcc.startsWith("<|think")) {
                  thinkingDetected = true;
                } else if (trimmedAcc.length > 10) {
                  thinkingDone = true;
                }
              }

              if (thinkingDetected) {
                const thinkEnd = accumulated.match(/<\/think(?:ing)?>/i) ||
                                 accumulated.match(/<\|think(?:ing)?\|>/i);
                if (thinkEnd && thinkEnd.index !== undefined) {
                  thinkingDetected = false;
                  thinkingDone = true;
                  visibleStart = thinkEnd.index + thinkEnd[0].length;
                }
              } else {
                setStreamedContent(accumulated.slice(visibleStart));
              }
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      const visibleContent = accumulated.slice(visibleStart).trim();
      if (visibleContent) {
        setMessages([...newMessages, { role: "assistant", content: accumulated }]);
      }
      setStreamedContent("");
    } catch (error) {
      if ((error as Error)?.name === "AbortError") {
        // User stopped the response — keep whatever was streamed
        const partial = streamedContent;
        if (partial) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: partial + "\n\n[stopped]" },
          ]);
        }
        setStreamedContent("");
      } else {
        setMessages([
          ...newMessages,
          {
            role: "assistant",
            content: `[ERROR] ${error instanceof Error ? error.message : "Connection failed"}`,
          },
        ]);
      }
    }
    abortRef.current = null;
    setIsStreaming(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const stopResponse = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  // Modal handlers
  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = modalInput.trim();

    if (modalMode === "server" && val) {
      setServerUrl(val);
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lmStudioUrl: val }),
      });
      fetchModels();
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: `Server URL updated to: ${val}`,
        },
      ]);
    }

    if (modalMode === "system") {
      if (val) {
        const { ciphertext, iv } = await encryptText(val, password);
        await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ systemPrompt: ciphertext, iv }),
        });
        setMessages((prev) => [
          ...prev,
          {
            role: "system",
            content: "System prompt set and encrypted.",
          },
        ]);
      } else {
        await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clearSystemPrompt: true }),
        });
        setMessages((prev) => [
          ...prev,
          { role: "system", content: "System prompt cleared." },
        ]);
      }
    }

    setModalMode(null);
    setModalInput("");
  };

  const selectModel = (model: string) => {
    setCurrentModel(model);
    setModalMode(null);
    setMessages((prev) => [
      ...prev,
      { role: "system", content: `Model switched to: ${model}` },
    ]);
  };

  return (
    <div
      className="flex flex-col h-full bg-terminal-bg text-terminal-fg font-mono"
      onClick={() => !modalMode && inputRef.current?.focus()}
    >
      <TopMenu
        username={username}
        currentModel={currentModel}
        onSelectModel={() => {
          fetchModels();
          setModalMode("model");
        }}
        onConfigureServer={() => {
          setModalInput(serverUrl);
          setModalMode("server");
        }}
        onSetSystemPrompt={() => {
          setModalInput("");
          setModalMode("system");
        }}
        onLogout={handleLogout}
        onClear={() => {
          setMessages([]);
          setStreamedContent("");
        }}
        onHelp={() => setShowHelp((h) => !h)}
      />

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {messages.length === 0 && !isStreaming && (
          <div className="text-terminal-fg text-sm space-y-2 pt-2 leading-relaxed">
            <div>Welcome, <span className="text-terminal-green-bright">{username}</span>. Type a message to start chatting.</div>
            <div>Type <span className="text-terminal-cyan">/help</span> for available commands.</div>
            {!currentModel && (
              <div className="text-terminal-yellow">
                No model selected. Use <span className="text-terminal-cyan">/model</span> to select one.
              </div>
            )}
          </div>
        )}

        {showHelp && (
          <div className="border border-terminal-border rounded p-3 text-sm space-y-1.5 bg-terminal-bg-light leading-relaxed">
            <div className="text-terminal-green-bright font-bold mb-2">=== Available Commands ===</div>
            {slashCommands.map((cmd) => (
              <div key={cmd.name} className="flex gap-3">
                <span className="text-terminal-cyan min-w-20">/{cmd.name}</span>
                <span className="text-terminal-fg">{cmd.description}</span>
              </div>
            ))}
            <div className="text-terminal-dim-text mt-2 text-xs">
              Press <span className="text-terminal-yellow">Tab</span> to autocomplete commands
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i}>
            {msg.role === "user" ? (
              <div className="flex items-start gap-1 group leading-relaxed">
                <div className="flex-1 min-w-0 text-terminal-fg">
                  <span className="text-terminal-green-bright">{username}@awt</span>
                  <span className="text-terminal-dim-text">:</span>
                  <span className="text-terminal-cyan">~</span>
                  <span className="text-terminal-dim-text">$ </span>
                  <span>{msg.content}</span>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <CopyButton text={msg.content} />
                </div>
              </div>
            ) : msg.role === "system" ? (
              <div className="text-terminal-yellow text-sm leading-relaxed">
                [system] {msg.content}
              </div>
            ) : (
              <div className="group">
                <div className="flex items-center gap-2 mb-1">
                  <div className="text-terminal-cyan text-xs">
                    [{currentModel || "ai"}]:
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <CopyButton text={msg.content} />
                  </div>
                </div>
                <div className="pl-2 border-l border-terminal-border">
                  <TerminalMarkdown content={msg.content} />
                </div>
              </div>
            )}
          </div>
        ))}

        {isStreaming && streamedContent === "" && <WaitingIndicator />}

        {isStreaming && streamedContent && (
          <div>
            <div className="text-terminal-cyan text-xs mb-1">
              [{currentModel || "ai"}]:
            </div>
            <div className="pl-2 border-l border-terminal-border">
              <TerminalMarkdown content={streamedContent} />
              <span className="inline-block w-2 h-4 bg-terminal-fg animate-blink ml-0.5" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="relative border-t border-terminal-border p-2">
        {showSlashMenu && (
          <SlashCommandMenu
            commands={slashCommands}
            filter={slashFilter}
            onSelect={(cmd) => {
              cmd.action();
              setInput("");
              setShowSlashMenu(false);
            }}
            onClose={() => setShowSlashMenu(false)}
            selectedIndex={slashIndex}
          />
        )}

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <span className="text-terminal-green">&gt;</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={isStreaming ? "Type /stop to cancel..." : "Type a message or /command..."}
            className="flex-1 bg-transparent outline-none text-terminal-fg caret-terminal-green placeholder:text-terminal-dim-text/40"
            autoFocus
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {!isStreaming && (
            <span className="w-2 h-4 bg-terminal-green animate-blink" />
          )}
        </form>
      </div>

      {/* Modal overlay */}
      {modalMode && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-terminal-bg border border-terminal-border rounded p-4 w-full max-w-md font-mono">
            {modalMode === "model" ? (
              <div>
                <div className="text-terminal-green font-bold mb-3">
                  === Select Model ===
                </div>
                {models.length === 0 ? (
                  <div className="text-terminal-yellow text-sm">
                    No models found. Check your LM Studio server.
                  </div>
                ) : (
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {models.map((m) => (
                      <button
                        key={m}
                        onClick={() => selectModel(m)}
                        className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                          m === currentModel
                            ? "bg-terminal-highlight text-terminal-green"
                            : "text-terminal-dim-text hover:bg-terminal-highlight hover:text-terminal-fg"
                        }`}
                      >
                        {m === currentModel && "> "}
                        {m}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setModalMode(null)}
                  className="mt-3 text-terminal-dim-text text-xs hover:text-terminal-fg"
                >
                  [ESC] Cancel
                </button>
              </div>
            ) : modalMode === "server" ? (
              <div>
                <div className="text-terminal-green font-bold mb-2">
                  === Server Configuration ===
                </div>
                <div className="text-terminal-dim-text text-xs mb-3">
                  Enter LM Studio server URL:
                </div>
                <form onSubmit={handleModalSubmit} className="flex items-center gap-2">
                  <span className="text-terminal-green">&gt;</span>
                  <input
                    ref={modalInputRef}
                    type="text"
                    value={modalInput}
                    onChange={(e) => setModalInput(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-terminal-fg border-b border-terminal-border pb-1 caret-terminal-green"
                    placeholder="http://localhost:1234"
                    autoFocus
                  />
                </form>
                <div className="flex gap-3 mt-3 text-xs">
                  <button
                    onClick={() => handleModalSubmit(new Event("click") as unknown as React.FormEvent)}
                    className="text-terminal-green hover:underline"
                  >
                    [Enter] Save
                  </button>
                  <button
                    onClick={() => setModalMode(null)}
                    className="text-terminal-dim-text hover:text-terminal-fg"
                  >
                    [ESC] Cancel
                  </button>
                </div>
              </div>
            ) : modalMode === "system" ? (
              <div>
                <div className="text-terminal-green font-bold mb-2">
                  === System Prompt ===
                </div>
                <div className="text-terminal-dim-text text-xs mb-1">
                  Encrypted with your password (AES-256-GCM).
                </div>
                <div className="text-terminal-dim-text text-xs mb-3">
                  Leave empty and submit to clear.
                </div>
                <form onSubmit={handleModalSubmit}>
                  <textarea
                    ref={modalTextareaRef}
                    value={modalInput}
                    onChange={(e) => setModalInput(e.target.value)}
                    className="w-full bg-terminal-bg-light text-terminal-fg border border-terminal-border rounded p-2 outline-none text-sm resize-none h-24 caret-terminal-green"
                    placeholder="You are a helpful assistant..."
                    autoFocus
                  />
                  <div className="flex gap-3 mt-2 text-xs">
                    <button
                      type="submit"
                      className="text-terminal-green hover:underline"
                    >
                      [Enter] Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalMode(null)}
                      className="text-terminal-dim-text hover:text-terminal-fg"
                    >
                      [ESC] Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
