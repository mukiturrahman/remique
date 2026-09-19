const fs = require('fs');
let code = fs.readFileSync('src/lib/bdapps/subscription-service.ts', 'utf8');

const oldUpdate = `      } else if (params.email && user.email !== params.email) {
        const [updatedUser] = await db.update(users).set({ email: params.email }).where(eq(users.id, user!.id)).returning();
        user = updatedUser;
      }`;

const newUpdate = `      } else if (params.email && user.email !== params.email) {
        try {
          const [updatedUser] = await db.update(users).set({ email: params.email }).where(eq(users.id, user!.id)).returning();
          user = updatedUser;
        } catch (updateErr) {
          // Ignore email update failures (e.g. unique constraint if they used this email on another account)
          console.error('[bdApps] Failed to update user email:', updateErr);
        }
      }`;

code = code.replace(oldUpdate, newUpdate);

fs.writeFileSync('src/lib/bdapps/subscription-service.ts', code);
console.log('Patched email update');
