import { Bubble, ChatHeader, type ChatMessage } from "./chat-bubble";
import { ChatPlayer } from "./chat-player";

export type { ChatMessage };

export function WhatsAppMockup({
  messages,
  accentText,
  animate = false,
  flush = false,
  className = "",
}: {
  messages: ChatMessage[];
  accentText?: string;
  /** Replay the thread as a live conversation. Off by default. */
  animate?: boolean;
  /**
   * Drop the card's own corners and shadow and fill the height it is given —
   * for when a frame supplies both. The wallpaper runs to the bottom of the
   * frame the way it does on a phone, however short the thread is.
   */
  flush?: boolean;
  className?: string;
}) {
  return (
    <div className={`${flush ? "h-full" : ""} ${className}`}>
      {accentText && (
        <p className="mb-3 text-right font-cursive text-[18px] italic text-ink/60">
          {accentText}
        </p>
      )}

      {animate ? (
        <ChatPlayer messages={messages} />
      ) : (
        <div
          className={
            flush ? "flex h-full flex-col" : "overflow-hidden rounded-[20px] shadow-panel"
          }
        >
          <ChatHeader />
          <div className={`wa-chat-bg space-y-2 px-3 py-4 ${flush ? "min-h-0 flex-1" : ""}`}>
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
