"use client";

import { useState, useRef, useEffect } from "react";

interface TopMenuProps {
  username: string;
  currentModel: string;
  onSelectModel: () => void;
  onConfigureServer: () => void;
  onSetSystemPrompt: () => void;
  onLogout: () => void;
  onClear: () => void;
  onHelp: () => void;
}

export default function TopMenu({
  username,
  currentModel,
  onSelectModel,
  onConfigureServer,
  onSetSystemPrompt,
  onLogout,
  onClear,
  onHelp,
}: TopMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const items = [
    { label: "Select Model", icon: "[M]", action: onSelectModel },
    { label: "Server Config", icon: "[S]", action: onConfigureServer },
    { label: "System Prompt", icon: "[P]", action: onSetSystemPrompt },
    { label: "Clear Chat", icon: "[C]", action: onClear },
    { label: "Help", icon: "[?]", action: onHelp },
    { label: "Logout", icon: "[X]", action: onLogout },
  ];

  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-terminal-bg-light border-b border-terminal-border text-sm">
      <div className="flex items-center gap-2">
        <span className="text-terminal-green font-bold">AWT</span>
        <span className="text-terminal-dim-text">|</span>
        <span className="text-terminal-cyan text-xs truncate max-w-32">
          {currentModel || "no model"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-terminal-dim-text text-xs hidden sm:inline">
          {username}@awt
        </span>
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="text-terminal-fg hover:text-terminal-green px-2 py-0.5 border border-terminal-border rounded text-xs"
          >
            {open ? "[-]" : "[=]"}
          </button>
          {open && (
            <div className="absolute right-0 top-full mt-1 bg-terminal-bg-light border border-terminal-border rounded shadow-lg z-50 min-w-44">
              {items.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    setOpen(false);
                    item.action();
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm text-terminal-dim-text hover:bg-terminal-highlight hover:text-terminal-fg flex items-center gap-2 transition-colors"
                >
                  <span className="text-terminal-green font-mono text-xs">
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
