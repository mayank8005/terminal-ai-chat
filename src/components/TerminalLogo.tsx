"use client";

export default function TerminalLogo() {
  return (
    <div className="overflow-hidden w-full">
      <pre className="text-terminal-green text-[8px] sm:text-xs md:text-sm leading-tight font-mono select-none whitespace-pre overflow-x-auto">
        {`
    _    ___  __        __   _     _____
   / \\  |_ _| \\ \\      / /__| |__  |_   _|__ _ __ _ __ ___
  / _ \\  | |   \\ \\ /\\ / / _ \\ '_ \\   | |/ _ \\ '__| '_ \` _ \\
 / ___ \\ | |    \\ V  V /  __/ |_) |  | |  __/ |  | | | | | |
/_/   \\_\\___|    \\_/\\_/ \\___|_.__/   |_|\\___|_|  |_| |_| |_|
`}
      </pre>
    </div>
  );
}
