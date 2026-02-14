"use client";

import { useState, useEffect } from "react";

const MESSAGES = [
  "Computing...",
  "Crunching neurons...",
  "Consulting the matrix...",
  "Thinking really hard...",
  "Summoning intelligence...",
  "Asking the silicon gods...",
  "Loading braincells...",
  "Processing wetware...",
  "Parsing the void...",
  "Warming up the GPUs...",
  "Interrogating the model...",
  "Allocating thoughts...",
  "Defragmenting brain...",
  "Compiling response...",
  "Engaging neural net...",
];

export default function WaitingIndicator() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [dots, setDots] = useState("");

  useEffect(() => {
    const msgInterval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % MESSAGES.length);
    }, 2000);

    const dotInterval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 400);

    return () => {
      clearInterval(msgInterval);
      clearInterval(dotInterval);
    };
  }, []);

  return (
    <div className="flex items-center gap-2 text-terminal-yellow py-1">
      <span className="inline-block w-2 h-4 bg-terminal-yellow animate-pulse" />
      <span>
        {MESSAGES[messageIndex]}
        {dots}
      </span>
    </div>
  );
}
