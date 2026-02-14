"use client";

import { useState, useEffect } from "react";
import AuthTerminal from "@/components/AuthTerminal";
import ChatTerminal from "@/components/ChatTerminal";

export default function Home() {
  const [authed, setAuthed] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if already authenticated
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          setAuthed(true);
          setUsername(data.username);
          // Password not available from session - user needs to re-enter for system prompt
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-dvh bg-terminal-bg flex items-center justify-center">
        <div className="text-terminal-green animate-pulse font-mono">
          Initializing terminal...
        </div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="h-dvh scanlines crt-glow">
        <AuthTerminal
          onAuth={(user, pass) => {
            setUsername(user);
            setPassword(pass);
            setAuthed(true);
          }}
        />
      </div>
    );
  }

  return (
    <div className="h-dvh scanlines crt-glow relative">
      <ChatTerminal
        username={username}
        password={password}
        onLogout={() => {
          setAuthed(false);
          setUsername("");
          setPassword("");
        }}
      />
    </div>
  );
}
