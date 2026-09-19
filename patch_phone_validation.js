const fs = require('fs');
let code = fs.readFileSync('src/app/pricing/page.tsx', 'utf8');

const oldCheck = `    if (!phone.trim() || !email.trim()) {
      setError(page.modal.errorEmpty);
      return;
    }`;

const newCheck = `    if (!phone.trim() || !email.trim()) {
      setError(page.modal.errorEmpty);
      return;
    }

    const cleanPhone = phone.replace(/\\D/g, '');
    let isValidPhone = false;
    if (cleanPhone.length === 11 && cleanPhone.startsWith('01')) {
      isValidPhone = true;
    } else if (cleanPhone.length === 13 && cleanPhone.startsWith('8801')) {
      isValidPhone = true;
    }

    if (!isValidPhone) {
      setError(lang === 'bn' ? 'অনুগ্রহ করে একটি সঠিক বাংলাদেশী মোবাইল নম্বর দিন (যেমন: 018XXXXXXXX)।' : 'Please enter a valid Bangladeshi mobile number (e.g. 018XXXXXXXX).');
      return;
    }`;

code = code.replace(oldCheck, newCheck);

fs.writeFileSync('src/app/pricing/page.tsx', code);
console.log('Patched phone validation');
