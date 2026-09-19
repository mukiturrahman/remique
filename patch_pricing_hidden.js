const fs = require('fs');
let code = fs.readFileSync('src/app/pricing/page.tsx', 'utf8');

// 1. Remove state variables
code = code.replace(
  `  const [phone, setPhone] = useState("");\n  const [bkashPhone, setBkashPhone] = useState("");\n  const [isSameNumber, setIsSameNumber] = useState(false);\n  const [email, setEmail] = useState("");`,
  `  const [phone, setPhone] = useState("");\n  const [email, setEmail] = useState("");`
);

// 2. Revert handleCheckout validation
code = code.replace(
  `if (!phone.trim() || !email.trim() || !bkashPhone.trim()) {`,
  `if (!phone.trim() || !email.trim()) {`
);

// 3. Set bkashNumber to phone.trim()
code = code.replace(
  `bkashNumber: bkashPhone.trim(),`,
  `bkashNumber: phone.trim(),`
);

// 4. Clean up phone input onChange
code = code.replace(
  `onChange={(e) => {
                      setPhone(e.target.value);
                      if (isSameNumber) setBkashPhone(e.target.value);
                    }}`,
  `onChange={(e) => setPhone(e.target.value)}`
);

// 5. Remove the entire bkash UI block
const bkashUIBlock = `                <div>
                  <div className="flex items-center justify-between mb-1.5">
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
                  </div>
                  <input
                    type="tel"
                    placeholder={(page.modal as any).bkashPlaceholder || "018XXXXXXXX"}
                    value={bkashPhone}
                    onChange={(e) => {
                      setBkashPhone(e.target.value);
                      if (isSameNumber) setIsSameNumber(false);
                    }}
                    disabled={loading}
                    className="w-full rounded-xl border border-white/30 bg-white/40 px-4 py-3 text-[15px] font-medium text-ink placeholder:text-ink-3 focus:border-[#E2136E] focus:outline-none focus:ring-1 focus:ring-[#E2136E]"
                    required
                  />
                </div>

`;

code = code.replace(bkashUIBlock, '');

fs.writeFileSync('src/app/pricing/page.tsx', code);
console.log('Patched pricing page to hide bKash input');
