const fs = require('fs');
let code = fs.readFileSync('src/app/pricing/page.tsx', 'utf8');

const toggleUI = `          {/* billing toggle */}
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/40 bg-white/20 p-1.5 shadow-sm backdrop-blur-md">
            <button
              type="button"
              onClick={() => setBilling("weekly")}
              className={\`rounded-full px-5 py-2 text-[14.5px] font-semibold tracking-tight transition-all duration-200 \${
                isWeekly
                  ? "bg-brand text-white shadow-press"
                  : "text-ink-2 hover:text-ink"
              }\`}
            >
              {page.weekly}
            </button>
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={\`rounded-full px-5 py-2 text-[14.5px] font-semibold tracking-tight transition-all duration-200 \${
                !isWeekly
                  ? "bg-brand text-white shadow-press"
                  : "text-ink-2 hover:text-ink"
              }\`}
            >
              {page.monthly}
            </button>
          </div>`;

code = code.replace(toggleUI, '');

fs.writeFileSync('src/app/pricing/page.tsx', code);
console.log('Patched pricing toggle UI');
