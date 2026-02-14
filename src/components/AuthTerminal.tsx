"use client";

import { useState, useRef, useEffect } from "react";
import TerminalLogo from "./TerminalLogo";

interface AuthTerminalProps {
  onAuth: (username: string, password: string) => void;
}

type AuthStep = "welcome" | "mode" | "username" | "password" | "processing";

export default function AuthTerminal({ onAuth }: AuthTerminalProps) {
  const [mode, setMode] = useState<"login" | "signup" | null>(null);
  const [step, setStep] = useState<AuthStep>("welcome");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [input, setInput] = useState("");
  const [lines, setLines] = useState<Array<{ text: string; type: string }>>([]);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLines([
      { text: "Welcome to AI Web Terminal v1.0.0", type: "info" },
      { text: "Type 'login' to sign in or 'signup' to create an account.", type: "info" },
    ]);
    setStep("mode");
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [step]);

  const addLine = (text: string, type: string = "output") => {
    setLines((prev) => [...prev, { text, type }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = input.trim();
    setInput("");

    if (!val) return;

    if (step === "mode") {
      addLine(`> ${val}`, "input");
      if (val.toLowerCase() === "login") {
        setMode("login");
        addLine("Enter username:", "prompt");
        setStep("username");
      } else if (val.toLowerCase() === "signup") {
        setMode("signup");
        addLine("Choose a username (3-30 chars):", "prompt");
        setStep("username");
      } else {
        addLine("Unknown command. Type 'login' or 'signup'.", "error");
      }
      return;
    }

    if (step === "username") {
      addLine(`> ${val}`, "input");
      setUsername(val);
      addLine("Enter password:", "prompt");
      setStep("password");
      return;
    }

    if (step === "password") {
      addLine(`> ${"*".repeat(val.length)}`, "input");
      setPassword(val);
      setStep("processing");
      addLine("Authenticating...", "info");

      try {
        const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password: val }),
        });
        const data = await res.json();

        if (res.ok) {
          addLine(`Access granted. Welcome, ${username}.`, "success");
          setTimeout(() => onAuth(username, val), 500);
        } else {
          setError(data.error);
          addLine(`ERROR: ${data.error}`, "error");
          addLine("Type 'login' or 'signup' to try again.", "info");
          setStep("mode");
          setMode(null);
          setUsername("");
          setPassword("");
        }
      } catch {
        addLine("ERROR: Connection failed.", "error");
        addLine("Type 'login' or 'signup' to try again.", "info");
        setStep("mode");
        setMode(null);
        setUsername("");
        setPassword("");
      }
    }
  };

  return (
    <div
      className="flex flex-col h-full bg-terminal-bg text-terminal-fg font-mono"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        <TerminalLogo />
        <div className="text-terminal-fg text-xs mb-4">
          v1.0.0 | Your AI gateway to LM Studio
        </div>

        {lines.map((line, i) => (
          <div
            key={i}
            className={`leading-relaxed ${
              line.type === "error"
                ? "text-terminal-red"
                : line.type === "success"
                ? "text-terminal-green-bright"
                : line.type === "input"
                ? "text-terminal-fg"
                : line.type === "prompt"
                ? "text-terminal-yellow"
                : "text-terminal-fg"
            }`}
          >
            {line.text}
          </div>
        ))}

        {error && <div className="text-terminal-red text-xs">{error}</div>}

        {step !== "processing" && (
          <form onSubmit={handleSubmit} className="flex items-center">
            <span className="text-terminal-green mr-2">&gt;</span>
            <input
              ref={inputRef}
              type={step === "password" ? "password" : "text"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-transparent outline-none text-terminal-fg caret-terminal-green"
              autoFocus
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <span className="w-2 h-4 bg-terminal-fg animate-blink" />
          </form>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
