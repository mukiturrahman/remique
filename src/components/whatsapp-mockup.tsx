import Image from "next/image";

export type ChatMessage = {
  text: string;
  from: "user" | "bot";
  time: string;
};

function FormattedText({ text }: { text: string }) {
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

function DoubleTick() {
  return (
    <svg viewBox="0 0 16 11" className="ml-1 inline-block h-[11px] w-[16px] text-[#53bdeb]" fill="none">
      <path d="M11.07 0.73l-7 8-2.56-2.56" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.07 0.73l-7 8-1.22-1.22" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WhatsAppMockup({
  messages,
  accentText,
  className = "",
}: {
  messages: ChatMessage[];
  accentText?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {accentText && (
        <p className="mb-3 text-right font-cursive text-[18px] italic text-ink/60">
          {accentText}
        </p>
      )}
      <div className="overflow-hidden rounded-[20px] shadow-panel">
        {/* header */}
        <div className="flex items-center gap-3 bg-[#075E54] px-4 py-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ground overflow-hidden">
            <Image src="/logo.png" alt="Remique Logo" width={44} height={34} className="h-8 w-auto object-contain" />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold leading-none text-white">
              Remique
            </p>
            <p className="mt-1 text-[12px] leading-none text-white/70">
              online
            </p>
          </div>
        </div>

        {/* chat body */}
        <div className="wa-chat-bg space-y-2 px-3 py-4">
          {messages.map((msg, i) => {
            const isUser = msg.from === "user";
            return (
              <div
                key={i}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`relative max-w-[82%] rounded-lg px-3 py-2 text-[14px] leading-snug ${
                    isUser
                      ? "rounded-tr-none bg-[#DCF8C6] text-[#111B21]"
                      : "rounded-tl-none bg-white text-[#111B21]"
                  }`}
                >
                  <FormattedText text={msg.text} />
                  <span className="ml-2 inline-flex items-center whitespace-nowrap align-bottom text-[11px] text-[#667781]">
                    {msg.time}
                    {isUser && <DoubleTick />}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
