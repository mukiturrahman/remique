export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111B21] border border-[#222E35] text-[#25D366] text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse"></span>
          Remique AI WhatsApp Assistant
        </div>
        
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white">
          Just WhatsApp it. <br />
          <span className="text-[#25D366]">Remique</span> handles the rest.
        </h1>

        <p className="text-lg text-[#8696A0] max-w-lg mx-auto">
          Send a natural message in English, Banglish, or Bengali. We schedule and remind you at the exact moment on WhatsApp.
        </p>

        <div className="pt-4">
          <a
            href="https://wa.me/?text=Hi"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-[#0B141A] font-semibold text-base transition-all shadow-lg hover:shadow-[#25D366]/20"
          >
            Chat with Remique on WhatsApp →
          </a>
        </div>
      </div>
    </main>
  );
}
