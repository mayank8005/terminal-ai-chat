"use client";

import { useState, useCallback } from "react";

interface CopyButtonProps {
  text: string;
}

export default function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    },
    [text]
  );

  return (
    <button
      onClick={handleCopy}
      title="Copy to clipboard"
      className="text-terminal-dim-text hover:text-terminal-green transition-colors text-xs px-1 py-0.5 rounded hover:bg-terminal-highlight shrink-0"
    >
      {copied ? "[ok]" : "[cp]"}
    </button>
  );
}
