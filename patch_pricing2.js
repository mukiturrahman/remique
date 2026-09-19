const fs = require('fs');
let code = fs.readFileSync('src/app/pricing/page.tsx', 'utf8');

// 1. Add state for isSameNumber
code = code.replace(
  `  const [bkashPhone, setBkashPhone] = useState("");`,
  `  const [bkashPhone, setBkashPhone] = useState("");\n  const [isSameNumber, setIsSameNumber] = useState(false);`
);

// 2. Modify phone onChange
code = code.replace(
  `onChange={(e) => setPhone(e.target.value)}`,
  `onChange={(e) => {
                      setPhone(e.target.value);
                      if (isSameNumber) setBkashPhone(e.target.value);
                    }}`
);

// 3. Modify bkashPhone onChange and input logic
const oldBkashLabel = `                  <label className="block font-mono text-[11px] uppercase tracking-wider text-ink-3 mb-1.5">
                    {(page.modal as any).bkashLabel || "bKash Number"}
                  </label>`;

const newBkashLabel = `                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-mono text-[11px] uppercase tracking-wider text-ink-3">
                      {(page.modal as any).bkashLabel || "bKash Number"}
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        className="w-3.5 h-3.5 accent-[#E2136E] rounded-sm border-white/40 bg-white/20"
                        checked={isSameNumber}
                        onChange={(e) => {
                          setIsSameNumber(e.target.checked);
                          if (e.target.checked) setBkashPhone(phone);
                        }}
                      />
                      <span className="text-[12px] font-medium text-ink-2 hover:text-ink transition-colors">
                        {(page.modal as any).sameAsWhatsapp || (lang === 'bn' ? "WhatsApp-এর মত একই" : "Same as WhatsApp")}
                      </span>
                    </label>
                  </div>`;

code = code.replace(oldBkashLabel, newBkashLabel);

code = code.replace(
  `onChange={(e) => setBkashPhone(e.target.value)}`,
  `onChange={(e) => {
                      setBkashPhone(e.target.value);
                      if (isSameNumber) setIsSameNumber(false);
                    }}`
);

fs.writeFileSync('src/app/pricing/page.tsx', code);
console.log('Patched pricing page UI');
