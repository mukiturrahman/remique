const fs = require('fs');
let code = fs.readFileSync('src/components/home-pricing.tsx', 'utf8');

const oldToggle = `<div className="mt-8 flex justify-center">
        <div className="inline-flex items-center gap-3 rounded-full border border-white/40 bg-white/20 p-1.5 shadow-sm backdrop-blur-md">
          <button
            type="button"
            onClick={() => setBilling("weekly")}
            className={\`rounded-full px-5 py-2 text-[14.5px] font-semibold tracking-tight transition-all duration-200 \${isWeekly ? "bg-brand text-white shadow-press" : "text-ink-2 hover:text-ink"}\`}
          >
            {c.pricing.weekly}
          </button>
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={\`rounded-full px-5 py-2 text-[14.5px] font-semibold tracking-tight transition-all duration-200 \${!isWeekly ? "bg-brand text-white shadow-press" : "text-ink-2 hover:text-ink"}\`}
          >
            {c.pricing.monthly}
          </button>
        </div>
      </div>`;

code = code.replace(oldToggle, ``);

const oldHooks = `  const [billing, setBilling] = useState<"weekly" | "monthly">("monthly");
  const { lang } = useLang();
  const c = useCopy();

  const weeklyPrice = 49;
  const monthlyPrice = 190;

  const isWeekly = billing === "weekly";
  const price = isWeekly ? weeklyPrice : monthlyPrice;
  const periodLabel = isWeekly ? c.pricing.perWeek : c.pricing.perMonth;`;

const newHooks = `  const { lang } = useLang();
  const c = useCopy();

  const monthlyPrice = 190;
  const price = monthlyPrice;
  const periodLabel = c.pricing.perMonth;`;

code = code.replace(oldHooks, newHooks);

// Clean up unused imports
code = code.replace(`import { useState } from "react";\n`, ``);

fs.writeFileSync('src/components/home-pricing.tsx', code);
console.log('Patched home pricing');
