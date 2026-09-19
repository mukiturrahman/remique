const fs = require('fs');
let code = fs.readFileSync('src/app/layout.tsx', 'utf8');

const oldMetadata = `  icons: {
    icon: "/logo.ico",
  },
};`;

const newMetadata = `  icons: {
    icon: "/logo.ico",
  },
  verification: {
    google: "S1eQjpOnmD5rCjEXeC7Sop2YECwbxMy6oGyeLO4Lppc",
  },
};`;

code = code.replace(oldMetadata, newMetadata);

fs.writeFileSync('src/app/layout.tsx', code);
console.log('Patched metadata');
