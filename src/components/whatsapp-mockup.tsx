import { Bubble, ChatHeader, type ChatMessage } from "./chat-bubble";
import { ChatPlayer } from "./chat-player";

export type { ChatMessage };

export function WhatsAppMockup({
  messages,
  accentText,
  animate = false,
  className = "",
}: {
  messages: ChatMessage[];
  accentText?: string;
  /** Replay the thread as a live conversation. Off by default. */
  animate?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      {accentText && (
        <p className="mb-3 text-right font-cursive text-[18px] italic text-ink/60">
          {accentText}
        </p>
      )}

      {animate ? (
        <ChatPlayer messages={messages} />
      ) : (
        <div className="overflow-hidden rounded-[20px] shadow-panel">
          <ChatHeader />
          <div className="wa-chat-bg space-y-2 px-3 py-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                <Bubble msg={msg} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
