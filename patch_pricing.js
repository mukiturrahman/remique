const fs = require('fs');
let code = fs.readFileSync('src/app/pricing/page.tsx', 'utf8');

code = code.replace(
  `  const [phone, setPhone] = useState("");\n  const [email, setEmail] = useState("");`,
  `  const [phone, setPhone] = useState("");\n  const [bkashPhone, setBkashPhone] = useState("");\n  const [email, setEmail] = useState("");`
);

code = code.replace(
  `    if (!phone.trim() || !email.trim()) {`,
  `    if (!phone.trim() || !email.trim() || !bkashPhone.trim()) {`
);

code = code.replace(
  `          email: email.trim(),\n          planPeriod: billing,`,
  `          email: email.trim(),\n          bkashNumber: bkashPhone.trim(),\n          planPeriod: billing,`
);

const phoneInputHTML = `                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-ink-3 mb-1.5">
                    {page.modal.phoneLabel}
                  </label>
                  <input
                    type="tel"
                    placeholder={page.modal.phonePlaceholder}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={loading}
                    className="w-full rounded-xl border border-white/30 bg-white/40 px-4 py-3 text-[15px] font-medium text-ink placeholder:text-ink-3 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                    autoFocus
                  />
                </div>`;

const bkashInputHTML = `
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-ink-3 mb-1.5">
                    {(page.modal as any).bkashLabel || "bKash Number"}
                  </label>
                  <input
                    type="tel"
                    placeholder={(page.modal as any).bkashPlaceholder || "018XXXXXXXX"}
                    value={bkashPhone}
                    onChange={(e) => setBkashPhone(e.target.value)}
                    disabled={loading}
                    className="w-full rounded-xl border border-white/30 bg-white/40 px-4 py-3 text-[15px] font-medium text-ink placeholder:text-ink-3 focus:border-[#E2136E] focus:outline-none focus:ring-1 focus:ring-[#E2136E]"
                    required
                  />
                </div>`;

code = code.replace(phoneInputHTML, phoneInputHTML + bkashInputHTML);

fs.writeFileSync('src/app/pricing/page.tsx', code);
console.log('Patched pricing page');
