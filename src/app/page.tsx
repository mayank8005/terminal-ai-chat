"use client";

import { useState, useEffect } from "react";
import AuthTerminal from "@/components/AuthTerminal";
import ChatTerminal from "@/components/ChatTerminal";

export default function Home() {
  const [authed, setAuthed] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          setAuthed(true);
          setUsername(data.username);
          const savedPass = sessionStorage.getItem("awt_pass");
          if (savedPass) setPassword(savedPass);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-dvh bg-terminal-bg flex items-center justify-center">
        <div className="text-terminal-fg animate-pulse font-mono">
          Initializing terminal...
        </div>
      </div>
    );
  }

  if (!authed && !isGuest) {
    return (
      <div className="h-dvh scanlines crt-glow">
        <AuthTerminal
          onAuth={(user, pass) => {
            setUsername(user);
            setPassword(pass);
            sessionStorage.setItem("awt_pass", pass);
            setAuthed(true);
          }}
          onGuest={() => {
            setIsGuest(true);
            setUsername("guest");
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
        isGuest={isGuest}
        onLogout={() => {
          setAuthed(false);
          setIsGuest(false);
          setUsername("");
          setPassword("");
          sessionStorage.removeItem("awt_pass");
        }}
      />
    </div>
  );
}
