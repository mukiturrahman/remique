const fs = require('fs');
let code = fs.readFileSync('src/lib/bdapps/subscription-service.ts', 'utf8');

const oldBlock = `    try {
      if (!user) {
        const [newUser] = await db.insert(users).values({
          whatsappId: raw,
          phoneNumber: formatted,
          email: params.email || null,
          timezone: 'Asia/Dhaka',
        }).returning();
        user = newUser;
        await db.insert(subscriptions).values({
          userId: user.id,
          planTier: 'free',
          status: 'ACTIVE'
        });
      } else if (params.email && user.email !== params.email) {
        try {
          const [updatedUser] = await db.update(users).set({ email: params.email }).where(eq(users.id, user!.id)).returning();
          user = updatedUser;
        } catch (updateErr) {
          // Ignore email update failures (e.g. unique constraint if they used this email on another account)
          console.error('[bdApps] Failed to update user email:', updateErr);
        }
      }
    } catch (dbError: any) {
      if (dbError.code === '23505') {
        return {
          success: false,
          error: 'ALREADY_SUBSCRIBED',
        };
      }
      throw dbError;
    }`;

const newBlock = `    try {
      if (!user) {
        try {
          const [newUser] = await db.insert(users).values({
            whatsappId: raw,
            phoneNumber: formatted,
            email: params.email || null,
            timezone: 'Asia/Dhaka',
          }).returning();
          user = newUser;
        } catch (insertErr: any) {
          if (insertErr.code === '23505' && insertErr.message?.includes('email')) {
            // Email taken, insert without email
            const [newUser] = await db.insert(users).values({
              whatsappId: raw,
              phoneNumber: formatted,
              timezone: 'Asia/Dhaka',
            }).returning();
            user = newUser;
          } else {
            throw insertErr;
          }
        }
        await db.insert(subscriptions).values({
          userId: user.id,
          planTier: 'free',
          status: 'ACTIVE'
        });
      } else if (params.email && user.email !== params.email) {
        try {
          const [updatedUser] = await db.update(users).set({ email: params.email }).where(eq(users.id, user!.id)).returning();
          user = updatedUser;
        } catch (updateErr) {
          console.error('[bdApps] Failed to update user email:', updateErr);
        }
      }
    } catch (dbError: any) {
      if (dbError.code === '23505') {
        return {
          success: false,
          error: 'ALREADY_SUBSCRIBED',
        };
      }
      throw dbError;
    }`;

code = code.replace(oldBlock, newBlock);

fs.writeFileSync('src/lib/bdapps/subscription-service.ts', code);
console.log('Patched insert block');
