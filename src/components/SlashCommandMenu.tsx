"use client";

import { useEffect, useRef } from "react";

export interface SlashCommand {
  name: string;
  description: string;
  action: () => void;
}

interface SlashCommandMenuProps {
  commands: SlashCommand[];
  filter: string;
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
  selectedIndex: number;
}

export default function SlashCommandMenu({
  commands,
  filter,
  onSelect,
  onClose,
  selectedIndex,
}: SlashCommandMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const filtered = commands.filter((cmd) =>
    cmd.name.toLowerCase().startsWith(filter.toLowerCase())
  );

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  if (filtered.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="absolute bottom-full left-0 mb-1 w-full max-w-md bg-terminal-bg-light border border-terminal-border rounded shadow-lg z-50 max-h-48 overflow-y-auto"
    >
      {filtered.map((cmd, i) => (
        <button
          key={cmd.name}
          className={`w-full text-left px-3 py-1.5 flex items-center gap-3 text-sm transition-colors ${
            i === selectedIndex % filtered.length
              ? "bg-terminal-highlight text-terminal-fg"
              : "text-terminal-dim-text hover:bg-terminal-highlight"
          }`}
          onClick={() => onSelect(cmd)}
        >
          <span className="text-terminal-green font-mono">/{cmd.name}</span>
          <span className="text-terminal-dim-text text-xs">{cmd.description}</span>
        </button>
      ))}
    </div>
  );
}
