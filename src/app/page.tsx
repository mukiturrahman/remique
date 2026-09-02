const BOT_WHATSAPP_LINK = 'https://wa.me/8801853501469?text=Hi';

// ─── Chat bubble data ───────────────────────────────────────────────
const demoConversations = [
  {
    id: 1,
    exchanges: [
      { from: 'user', text: 'Remind me tomorrow at 9 AM to take my medicine' },
      { from: 'bot', text: "Done! 🔔 Remique will remind you tomorrow at 9:00 AM to *Take medicine*." },
    ],
  },
  {
    id: 2,
    exchanges: [
      { from: 'user', text: 'Kalke shokal 10 tay Aovin ke call dite mone koriye dio' },
      { from: 'bot', text: 'Done! 🔔 Kalke shokal 10:00 AM e *Call Aovin* er reminder pathiye dibo.' },
    ],
  },
  {
    id: 3,
    exchanges: [
      { from: 'user', text: 'Remind me in 30 minutes to check the oven' },
      { from: 'bot', text: "Done! 🔔 Remique will remind you in 30 minutes to *Check the oven*." },
    ],
  },
];

const features = [
  {
    icon: '🌐',
    title: 'English, Bangla & Banglish',
    desc: 'Type naturally in any mix of languages. Remique understands you.',
  },
  {
    icon: '⚡',
    title: 'Instant Confirmation',
    desc: 'Get a reply in seconds. Know your reminder is locked in.',
  },
  {
    icon: '🎯',
    title: 'Precise Scheduling',
    desc: 'From "in 5 minutes" to "next Friday at 3 PM" — Remique gets it right.',
  },
  {
    icon: '📋',
    title: 'List & Cancel',
    desc: 'Ask "show my reminders" or "cancel my last reminder" anytime.',
  },
  {
    icon: '🔔',
    title: 'Reliable Delivery',
    desc: 'Powered by Upstash QStash — reminders fire on time, every time.',
  },
  {
    icon: '🔒',
    title: 'Secure by Default',
    desc: 'All messages are verified end-to-end using Meta\'s HMAC signature.',
  },
];

const steps = [
  {
    step: '01',
    title: 'Send a message',
    desc: 'Text Remique just like you would a friend. No commands to memorize.',
    example: '"Remind me in 1 hour to reply to Rahim bhai"',
  },
  {
    step: '02',
    title: 'AI understands it',
    desc: 'Gemini AI parses your message and extracts the exact task and time.',
    example: 'Task: Reply to Rahim bhai · Time: +1 hour',
  },
  {
    step: '03',
    title: 'You get reminded',
    desc: 'At the exact moment, Remique sends you the reminder on WhatsApp.',
    example: '🔔 Remique Reminder: Reply to Rahim bhai',
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0B141A] text-[#E9EDEF]">

      {/* ── NAV ─────────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-white">Remique</span>
          <span className="text-[#25D366] text-2xl">🔔</span>
        </div>
        <a
          href={BOT_WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-[#0B141A] font-semibold text-sm transition-all"
        >
          Try it free →
        </a>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section className="flex flex-col items-center justify-center px-6 pt-16 pb-20 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111B21] border border-[#222E35] text-[#25D366] text-sm font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
          AI-Powered WhatsApp Reminders
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white leading-tight mb-6">
          Just WhatsApp it.{' '}
          <br />
          <span className="text-[#25D366]">Remique</span> handles the rest.
        </h1>

        <p className="text-lg sm:text-xl text-[#8696A0] max-w-xl mx-auto mb-10 leading-relaxed">
          Set reminders by texting naturally in English, Banglish, or Bengali.
          No apps. No sign‑ups. Just WhatsApp.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <a
            href={BOT_WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-[#0B141A] font-bold text-base transition-all shadow-lg hover:shadow-[#25D366]/20"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Chat with Remique
          </a>
          <span className="text-[#8696A0] text-sm">
            +880 1853-501469 · Free to use
          </span>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────── */}
      <section className="px-6 py-20 bg-[#111B21]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
              How it works
            </h2>
            <p className="text-[#8696A0] text-lg">Three steps. Zero friction.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            {steps.map((s) => (
              <div key={s.step} className="relative p-6 rounded-2xl bg-[#182229] border border-[#222E35]">
                <span className="text-5xl font-black text-[#25D366]/20 absolute top-4 right-5 leading-none select-none">
                  {s.step}
                </span>
                <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
                <p className="text-[#8696A0] text-sm leading-relaxed mb-4">{s.desc}</p>
                <div className="px-3 py-2 rounded-lg bg-[#0B141A] border border-[#222E35] text-[#25D366] text-xs font-mono">
                  {s.example}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEMO CONVERSATIONS ──────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
              See it in action
            </h2>
            <p className="text-[#8696A0] text-lg">Works in any language you think in.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {demoConversations.map((convo) => (
              <div
                key={convo.id}
                className="rounded-2xl bg-[#111B21] border border-[#222E35] overflow-hidden"
              >
                {/* WhatsApp-style header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-[#182229] border-b border-[#222E35]">
                  <div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center text-[#0B141A] font-bold text-sm">
                    R
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold leading-none">Remique 🔔</p>
                    <p className="text-[#8696A0] text-xs">online</p>
                  </div>
                </div>

                {/* Chat bubbles */}
                <div className="p-4 space-y-3">
                  {convo.exchanges.map((msg, i) => (
                    <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] px-3 py-2 rounded-lg text-sm leading-snug ${
                          msg.from === 'user'
                            ? 'bg-[#005C4B] text-white rounded-br-none'
                            : 'bg-[#182229] text-[#E9EDEF] rounded-bl-none'
                        }`}
                        dangerouslySetInnerHTML={{
                          __html: msg.text.replace(/\*(.*?)\*/g, '<strong>$1</strong>').replace(/_(.*?)_/g, '<em>$1</em>'),
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────── */}
      <section className="px-6 py-20 bg-[#111B21]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
              Built for Bangladesh. Works everywhere.
            </h2>
            <p className="text-[#8696A0] text-lg">
              Everything you need in a reminder assistant.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="p-5 rounded-2xl bg-[#182229] border border-[#222E35] hover:border-[#25D366]/30 transition-colors"
              >
                <span className="text-3xl mb-3 block">{f.icon}</span>
                <h3 className="text-white font-semibold mb-1">{f.title}</h3>
                <p className="text-[#8696A0] text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ──────────────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Start remembering everything.
          </h2>
          <p className="text-[#8696A0] text-lg mb-8">
            No account needed. Open WhatsApp and send your first reminder now.
          </p>
          <a
            href={BOT_WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-[#0B141A] font-bold text-base transition-all shadow-xl hover:shadow-[#25D366]/25"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Open WhatsApp
          </a>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer className="border-t border-[#222E35] px-6 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white">Remique</span>
            <span className="text-[#25D366]">🔔</span>
          </div>
          <p className="text-[#8696A0] text-sm">
            AI-powered WhatsApp reminder assistant. Built in Bangladesh.
          </p>
          <a
            href={BOT_WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#25D366] text-sm font-medium hover:underline"
          >
            +880 1853-501469
          </a>
        </div>
      </footer>
    </main>
  );
}
