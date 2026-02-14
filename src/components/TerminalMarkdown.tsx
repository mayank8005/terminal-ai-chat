"use client";

interface TerminalMarkdownProps {
  content: string;
}

function stripThinking(text: string): string {
  // Remove <think>...</think> blocks (and <thinking> variant)
  let result = text.replace(/<think(?:ing)?[\s\S]*?<\/think(?:ing)?>/gi, "");
  // Remove unclosed <think> blocks (still streaming)
  result = result.replace(/<think(?:ing)?>[\s\S]*$/gi, "");
  // Handle models that omit opening tag — strip everything up to and including </think> or </thinking>
  result = result.replace(/^[\s\S]*?<\/think(?:ing)?>/gi, "");
  return result.trim();
}

export default function TerminalMarkdown({ content }: TerminalMarkdownProps) {
  const cleaned = stripThinking(content);
  const lines = cleaned.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.trimStart().startsWith("```")) {
      const lang = line.trim().slice(3);
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```

      const maxLen = Math.max(
        ...codeLines.map((l) => l.length),
        lang.length + 2,
        20
      );
      const border = "+" + "-".repeat(maxLen + 2) + "+";

      elements.push(
        <div key={`code-${i}`} className="my-2">
          {lang && (
            <span className="text-terminal-cyan text-xs">[{lang}]</span>
          )}
          <div className="text-terminal-fg">
            <div className="text-terminal-dim-text">{border}</div>
            {codeLines.map((cl, j) => (
              <div key={j} className="leading-relaxed">
                <span className="text-terminal-dim-text">|</span> {cl.padEnd(maxLen)} <span className="text-terminal-dim-text">|</span>
              </div>
            ))}
            <div className="text-terminal-dim-text">{border}</div>
          </div>
        </div>
      );
      continue;
    }

    // Headers
    if (line.startsWith("### ")) {
      elements.push(
        <div key={`h3-${i}`} className="text-terminal-cyan font-bold mt-3 mb-1">
          --- {line.slice(4)} ---
        </div>
      );
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <div key={`h2-${i}`} className="text-terminal-green-bright font-bold mt-3 mb-1">
          == {line.slice(3)} ==
        </div>
      );
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      elements.push(
        <div key={`h1-${i}`} className="text-terminal-green-bright font-bold mt-3 mb-1 text-lg">
          === {line.slice(2)} ===
        </div>
      );
      i++;
      continue;
    }

    // Bullet lists
    if (/^\s*[-*]\s/.test(line)) {
      elements.push(
        <div key={`li-${i}`} className="pl-2 leading-relaxed">
          <span className="text-terminal-green">*</span>{" "}
          {formatInline(line.replace(/^\s*[-*]\s/, ""))}
        </div>
      );
      i++;
      continue;
    }

    // Numbered lists
    if (/^\s*\d+\.\s/.test(line)) {
      const num = line.match(/^\s*(\d+)\./)?.[1];
      elements.push(
        <div key={`ol-${i}`} className="pl-2 leading-relaxed">
          <span className="text-terminal-cyan">{num}.</span>{" "}
          {formatInline(line.replace(/^\s*\d+\.\s/, ""))}
        </div>
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (/^[-=_]{3,}$/.test(line.trim())) {
      elements.push(
        <div key={`hr-${i}`} className="text-terminal-dim-text my-2">
          {"─".repeat(40)}
        </div>
      );
      i++;
      continue;
    }

    // Empty line = paragraph break
    if (line === "") {
      elements.push(<div key={`br-${i}`} className="h-2" />);
      i++;
      continue;
    }

    // Regular line
    elements.push(
      <div key={`p-${i}`} className="leading-relaxed">
        {formatInline(line)}
      </div>
    );
    i++;
  }

  return <div className="whitespace-pre-wrap break-words text-terminal-fg">{elements}</div>;
}

function formatInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Inline code
    const codeMatch = remaining.match(/^([\s\S]*?)`([^`]+)`([\s\S]*)/);
    if (codeMatch) {
      if (codeMatch[1]) parts.push(formatInlineSimple(codeMatch[1], key++));
      parts.push(
        <span key={key++} className="text-terminal-yellow bg-terminal-dim-bg px-1 rounded">
          {codeMatch[2]}
        </span>
      );
      remaining = codeMatch[3];
      continue;
    }

    // Bold
    const boldMatch = remaining.match(/^([\s\S]*?)\*\*([^*]+)\*\*([\s\S]*)/);
    if (boldMatch) {
      if (boldMatch[1]) parts.push(formatInlineSimple(boldMatch[1], key++));
      parts.push(
        <span key={key++} className="font-bold text-terminal-green-bright">
          {boldMatch[2]}
        </span>
      );
      remaining = boldMatch[3];
      continue;
    }

    // Italic
    const italicMatch = remaining.match(/^([\s\S]*?)\*([^*]+)\*([\s\S]*)/);
    if (italicMatch) {
      if (italicMatch[1]) parts.push(formatInlineSimple(italicMatch[1], key++));
      parts.push(
        <span key={key++} className="italic text-terminal-cyan">
          {italicMatch[2]}
        </span>
      );
      remaining = italicMatch[3];
      continue;
    }

    parts.push(<span key={key++}>{remaining}</span>);
    break;
  }

  return <>{parts}</>;
}

function formatInlineSimple(text: string, key: number): React.ReactNode {
  return <span key={key}>{text}</span>;
}
