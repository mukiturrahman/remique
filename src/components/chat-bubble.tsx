import Image from "next/image";

export type ChatMessage = {
  text: string;
  from: "user" | "bot";
  time: string;
};

/** Renders **bold** spans inside a message body. */
export function FormattedText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export function DoubleTick() {
  return (
    <svg viewBox="0 0 16 11" className="ml-1 inline-block h-[11px] w-[16px] text-[#53bdeb]" fill="none" aria-hidden="true" focusable="false">
      <path d="M11.07 0.73l-7 8-2.56-2.56" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.07 0.73l-7 8-1.22-1.22" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The thread header. `action` takes an optional control on the right. */
export function ChatHeader({ action }: { action?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 bg-[#075E54] px-4 py-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-ground">
        <Image src="/logo.png" alt="Remique Logo" width={44} height={34} className="h-8 w-auto object-contain" />
      </div>
      <div className="min-w-0">
        <p className="text-[15px] font-semibold leading-none text-white">Remique</p>
        <p className="mt-1 text-[12px] leading-none text-white/70">online</p>
      </div>
      {action && <div className="ml-auto shrink-0">{action}</div>}
    </div>
  );
}

export function Bubble({ msg, className = "" }: { msg: ChatMessage; className?: string }) {
  const isUser = msg.from === "user";
  return (
    <div
      className={`relative max-w-[82%] rounded-lg px-3 py-2 text-[14px] leading-snug ${
        isUser ? "rounded-tr-none bg-[#DCF8C6] text-[#111B21]" : "rounded-tl-none bg-white text-[#111B21]"
      } ${className}`}
    >
      <FormattedText text={msg.text} />
      <span className="ml-2 inline-flex items-center whitespace-nowrap align-bottom text-[11px] text-[#667781]">
        {msg.time}
        {isUser && <DoubleTick />}
      </span>
    </div>
  );
}

/** Three dots in a bot-side bubble, shown while a reply is being composed. */
export function TypingBubble() {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg rounded-tl-none bg-white px-3.5 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="pulse block h-[7px] w-[7px] rounded-full bg-[#667781]"
          style={{ animationDelay: `${i * 180}ms` }}
        />
      ))}
    </div>
  );
}
