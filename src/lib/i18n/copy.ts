/**
 * Every string on the landing page, in both languages.
 *
 * `bn` is typed as `Copy`, so a missing or misspelled Bangla key fails the
 * build. Array lengths are not checked by the type system — tests/i18n-copy
 * covers those, plus untranslated values left as their English source.
 *
 * Strings that wrap inline markup are split at the markup boundary rather than
 * carrying HTML: see `heroSubBefore` / `heroSubAfter`.
 */

export type Lang = "en" | "bn";

export const LANGS: Lang[] = ["bn", "en"];

export function isLang(value: unknown): value is Lang {
    return value === "en" || value === "bn";
}

const en = {
    nav: {
        howItWorks: "How it works",
        useCases: "Use cases",
        pricing: "Pricing",
        faq: "FAQ",
        getStarted: "Start remembering",
        openMenu: "Open menu",
        closeMenu: "Close menu",
        logoAlt: "Remique Logo",
    },

    lang: {
        groupLabel: "Language",
        en: "EN",
        bn: "বাং",
        enFull: "English",
        bnFull: "Bangla",
    },

    hero: {
        socialProof: "2,000+ people never forget because Remique remembers everything",
        avatarAlt: "User avatar",
        headlinePrefix: "Never forget",
        headlineSuffix: "again.",
        rotator: [
            "the electricity bill",
            "school fees",
            "your 3pm meeting",
            "Ma's birthday",
            "the tax deadline",
        ],
        // Sits either side of an inline <span lang="bn">বাংলা</span>.
        subBefore:
            "Remique is a WhatsApp AI assistant that remembers for you. Text it naturally — in English, Banglish, or ",
        subAfter: ". It confirms, schedules, and reminds. You move on.",
        worksOnWhatsApp: "Works on WhatsApp",
        noApp: "No app to install",
        ctaPrimary: "Start remembering..",
        ctaSecondary: "See it work",
        botAlt: "Remique Bot",
    },

    buried: {
        title: "You keep it all on your phone. It just never comes back to you.",
        body: "Screenshots, notes, pinned messages, calendar events — it is all saved. Storing it was never the problem. Nothing brings it back at the moment you needed it.",
        problemAlt: "Someone buried under scattered notes, screenshots and papers",
        solutionAlt: "Remique holding the same papers, sorted and ready",
        kicker: "Remique works the other way round. You never go looking — the reminder comes to you.",
    },

    overload: {
        title: "Forgetting is what an overloaded brain does.",
        body: "Science is clear: when your brain tries to hold more than its capacity, forgetting is the normal result. You are not lazy. Your memory is not bad. Your brain is simply overloaded.",
        fix: "The fix is not complicated. Give your brain some room, and let Remique hold the small things. Just say it on WhatsApp.",
        imageAlt: "An overloaded brain trying to hold everything at once",
    },

    privacySection: {
        title: "Meet Officer Remi. Your data is strictly yours.",
        body: "We understand that your reminders might contain personal or sensitive information. Officer Remi makes sure everything stays secure, encrypted, and is never shared with third parties.",
        fix: "We don't sell data. We sell a service that makes your life easier. Your privacy is non-negotiable.",
        imageAlt: "Officer Remi guarding your data",
    },

    languages: {
        title: "As easy as texting a friend.",
        // Each one is a thing the reader does not have to do. Short enough to
        // read as a single line inside its pill.
        points: [
            "No new apps to learn",
            "No commands or formats",
            "Right where you already write",
            "No folders to maintain",
        ],
    },

    howItWorks: {
        eyebrow: "How it works",
        title: "Three steps. The third one is doing nothing.",
        sub: "No signup, no tutorial, no learning curve. Text Remique like a friend.",
        steps: [
            {
                step: "Step 1",
                title: "Send it like a text",
                desc: "Open WhatsApp. Type your reminder the way you actually think. No format, no slash command, no date picker.",
            },
            {
                step: "Step 2",
                title: "Bot already read between the lines",
                desc: "Remique reads your Bangla, Banglish, or English and extracts task + time. Confirms back in your language.",
            },
            {
                step: "Step 3",
                title: "Forget it. Completely.",
                desc: "Remique delivers your reminder at the exact time, right inside WhatsApp. You do not need to remember anything.",
            },
        ],
        cta: "See how it works",
    },

    problem: {
        title: "Every reminder app fails the same way: you stop opening it.",
        body: "Notification-based reminders depend on you opening another app, checking another list, clearing another badge. Remique lives where you already are — WhatsApp.",
        cards: [
            {
                title: "Other apps need you to open them.",
                body: "Calendar alerts, to-do lists, phone alarms — they all assume you will switch apps. You won't.",
            },
            {
                title: "Notifications get swiped away.",
                body: "A push notification competes with fifty others. A WhatsApp message sits in the chat you already check thirty times a day.",
            },
            {
                title: "You already text yourself reminders.",
                body: "Pinned chats, starred messages, notes in WhatsApp — you are already using it as a to-do list. Remique just makes it work.",
            },
        ],
    },

    loop: {
        title: "Whatever you need to remember, we make sure you don’t forget.",
        sub: "Recurring reminders and follow-up nudges — Remique handles the stuff that slips through the cracks.",
        // The sample message is Banglish demo input in both languages.
        sample: "protidin bikal 5 tay medicine",
        repeats: "repeats",
        daily: "daily",
        at: "at",
        time: "5:00 pm",
        timezone: "asia/dhaka",
        rows: [
            {
                title: "The chain lays itself.",
                body: "Every delivery schedules the next one before it goes out. Nothing to renew, nothing to re-enter.",
            },
            {
                title: "A gap never stacks.",
                body: "If delivery is down for three days, your daily reminder resumes tomorrow — it does not fire three times catching up.",
            },
            {
                title: "Missed one? Say so.",
                body: "Every reminder ends with “Done or need more time?” Tell Remique when, and it comes back then.",
            },
        ],
        cta: "See everything it does",
    },

    pricing: {
        eyebrow: "Pricing",
        title: "Cheaper than the late fee it saves you.",
        sub: "No card, no hassle. Subscribe with bKash and start using Remique in under a minute.",
        weekly: "Weekly",
        monthly: "Monthly",
        tier: "Pro",
        planName: "Remique Pro",
        planDesc: "Unlimited reminders in any language.",
        perWeek: "/week",
        perMonth: "/month",
        subscribeWith: "Subscribe with",
        features: [
            "Unlimited reminders",
            "Banglish, English and বাংলা",
            "Exact time resolution",
            "Confirmation in your language",
            "Recurring reminders",
            "Follow-up nudges",
        ],
    },

    featuresIndex: {
        title: "Everything you get, in full.",
        body: "The whole feature list on one page. No tiers hiding pieces of it, no settings to turn any of it on.",
        items: [
            {
                title: "Instant confirmation",
                desc: "Reply comes back in seconds, in your language.",
            },
            {
                title: "Exact time resolution",
                desc: '"kalke shokal 10 tay" becomes one timestamp.',
            },
            {
                title: "Recurring reminders",
                desc: "Daily, weekly, monthly — describe it in words.",
            },
            { title: "Follow-up nudges", desc: "Missed one? Remique sends it again." },
            { title: "Multi-language", desc: "Bangla, Banglish, English — or mixed." },
            {
                title: "Signature verification",
                desc: "Every message verified via Meta HMAC.",
            },
            {
                title: "Priority delivery",
                desc: "Reminders fire through a priority queue.",
            },
        ],
    },

    banner: {
        title: "Your memory has a backup now.",
        body: "Pick a plan, pay with bKash, and start texting Remique. That is the whole setup.",
        cta: "Get Remique now",
        priceNote: "Starts at ৳49/week",
        cardNote: "No card needed",
    },

    faq: {
        eyebrow: "FAQ",
        title: "Fair questions, straight answers.",
        items: [
            {
                q: "What is Remique?",
                a: "Remique is a WhatsApp AI assistant that sets reminders, saves notes, and manages your to-do list. You text it naturally — in English, Banglish, or Bangla — and it handles the rest.",
            },
            {
                q: "Do I need to install an app?",
                a: "No. Remique runs entirely inside WhatsApp. You add it as a contact and start texting. There is nothing to download.",
            },
            {
                q: "What languages does it understand?",
                a: "English, Banglish (Bangla written in English letters), and Bengali script. You can mix all three in one sentence.",
            },
            {
                q: "How does payment work?",
                a: "You pay with bKash. Pick a plan, scan the QR or enter the payment number, and your subscription starts immediately. No card needed.",
            },
            {
                q: "How many reminders can I set?",
                a: "With Remique Pro, you can set unlimited reminders.",
            },
            {
                q: "What if I miss a reminder?",
                a: "Remique sends follow-up nudges. Every reminder asks if you are done or need more time, so nothing slips through the cracks.",
            },
            {
                q: "Can I use it on my computer?",
                a: "Yes. Since Remique runs on WhatsApp, you can use it on your phone, tablet, or WhatsApp Web on your computer.",
            },
            {
                q: "Is my data secure?",
                a: "Yes. Your reminders and notes are stored securely. We only use your data to send you reminders and never share it with third parties.",
            },
        ],
        cta: "Get every answer",
    },

    footer: {
        tagline: "WhatsApp Ai assistant. Built with care in Bangladesh.",
        product: "Product",
        support: "Support",
        connect: "Connect",
        howItWorks: "How it works",
        useCases: "Use cases",
        pricing: "Pricing",
        faq: "FAQ",
        contact: "Contact Us",
        chatOnWhatsApp: "Chat on WhatsApp",
        rights: "All rights reserved.",
        privacy: "Privacy",
        terms: "Terms",
        logoAlt: "Remique Logo",
    },

    howItWorksPage: {
        eyebrow: "How it works",
        title: "Three steps. The third one is doing nothing.",
        sub: "No signup, no tutorial, no learning curve. You text Remique like a friend, and it handles the rest.",
        steps: [
            {
                label: "Step 1",
                title: "Send it like a text",
                desc: 'Open WhatsApp. Type your reminder the way you actually think — "kalke shokal 8 tay exam" or "remind me Friday 6pm invoice". No format, no slash command, no date picker.',
            },
            {
                label: "Step 2",
                title: "Bot already read between the lines",
                desc: "Remique reads your Bangla, Banglish, or English and extracts the task and time. It confirms back in your language so you know it understood.",
            },
            {
                label: "Step 3",
                title: "Forget it. Completely.",
                desc: "Remique delivers your reminder at the exact time, right inside WhatsApp. You do not need to check anything, open anything, or remember anything.",
            },
        ],
        chase: {
            eyebrow: "Relentless",
            title: "Whatever you need to remember, we make sure you don't forget.",
            sub: "Recurring tasks, follow-up nudges — Remique handles the stuff that slips through the cracks.",
            features: [
                {
                    title: "Recurring reminders",
                    desc: '"Protidin bikal 5 tay stock check" — Remique repeats it daily, weekly, or on any schedule you describe in words.',
                },
                {
                    title: "Follow-up nudges",
                    desc: "Missed a reminder? Remique sends a second message. Then a third. It does not give up until you mark it done.",
                },
            ],
        },
        cta: {
            title: "Ready to stop forgetting?",
            sub: "Pick a plan, open WhatsApp, and start texting. That is the whole onboarding.",
            button: "Start remembering",
        },
    },

    useCasesPage: {
        eyebrow: "Use cases",
        title: "Built for every kind of life.",
        sub: "Students, freelancers, business owners, parents — same WhatsApp, same Remique, different lives.",
        personas: [
            {
                name: "Rafiq",
                role: "Student",
                desc: "Exam prep, assignment deadlines, class schedules — Rafiq types in Banglish and Remique handles the rest.",
                accent: "no more missed deadlines",
            },
            {
                name: "Tania",
                role: "Freelancer",
                desc: "Client invoices, follow-ups, project deadlines — Tania never lets a deliverable slip.",
                accent: "clients stay impressed",
            },
            {
                name: "Arif",
                role: "Business Owner",
                desc: "Daily stock checks, supplier calls, staff reminders — Arif runs his shop with a WhatsApp chat.",
                accent: "the shop runs itself",
            },
            {
                name: "Nusrat",
                role: "Parent",
                desc: "School fees, doctor visits, family birthdays — Nusrat never forgets what matters most.",
                accent: "family things, handled",
            },
        ],
        cta: {
            title: "Whatever your life looks like, Remique fits in.",
            sub: "Start texting. Remique adapts to you.",
            button: "Make it yours",
        },
    },

    pricingPage: {
        eyebrow: "Pricing",
        title: "Cheaper than the late fee it saves you.",
        sub: "No card, no hassle. Subscribe with bKash and start using Remique in under a minute.",
        weekly: "Weekly",
        monthly: "Monthly",
        tier: "Pro",
        planName: "Remique Pro",
        planDesc: "Unlimited reminders in any language.",
        perWeek: "/week",
        perMonth: "/month",
        subscribeWith: "Subscribe with",
        features: [
            "Unlimited reminders",
            "Banglish, English and বাংলা",
            "Exact time resolution",
            "Confirmation in your language",
            "Recurring reminders",
            "Follow-up nudges",
        ],
        trust: "All payments processed securely through bKash",
        allFeaturesTitle: "Everything you get, in full.",
        allFeatures: [
            {
                num: 1,
                title: "Instant confirmation",
                desc: "Reply comes back in seconds, in the language you wrote in.",
            },
            {
                num: 2,
                title: "Exact time resolution",
                desc: '"in 5 minutes", "kalke shokal 10 tay" — all become one timestamp.',
            },
            {
                num: 3,
                title: "Recurring reminders",
                desc: "Daily, weekly, monthly — describe the pattern in words.",
            },
            {
                num: 4,
                title: "Follow-up nudges",
                desc: "Missed a reminder? Remique sends it again.",
            },
            {
                num: 5,
                title: "Multi-language support",
                desc: "Bangla, Banglish, English — or all three mixed.",
            },
            {
                num: 6,
                title: "HMAC signature verification",
                desc: "Every message verified before Remique acts.",
            },
            {
                num: 7,
                title: "Priority delivery",
                desc: "Reminders fire through a priority queue.",
            },
        ],
        modal: {
            title: "Subscribe with bKash Auto-Pay",
            desc: "Enter your WhatsApp number and email so we can link your Pro features directly to your WhatsApp chat.",
            phoneLabel: "WhatsApp Number",
            phonePlaceholder: "01712345678",
            emailLabel: "Email Address",
            emailPlaceholder: "you@example.com",
            selectedPlan: "Selected Plan:",
            proceed: "Proceed to bKash",
            connecting: "Connecting to bKash...",
            errorEmpty: "Please enter both your WhatsApp phone number and email.",
            errorGeneric: "An error occurred while connecting to bKash",
            errorFailed: "Failed to initiate bKash subscription",
        },
    },

    faqPage: {
        eyebrow: "FAQ",
        title: "Fair questions, straight answers.",
        sub: "Everything you might want to know before you start texting Remique.",
        items: [
            {
                q: "What is Remique?",
                a: "Remique is a WhatsApp AI assistant that sets and manages your reminders. You text it naturally — in English, Banglish, or Bangla — and it handles the rest.",
            },
            {
                q: "Do I need to install an app?",
                a: "No. Remique runs entirely inside WhatsApp. You add it as a contact and start texting. There is nothing to download.",
            },
            {
                q: "What languages does it understand?",
                a: "English, Banglish (Bangla written in English letters), and Bengali script. You can mix all three in one sentence — Remique will figure it out.",
            },
            {
                q: "How does payment work?",
                a: "You pay with bKash. Pick a plan, scan the QR or enter the payment number, and your subscription starts immediately. No card needed.",
            },
            {
                q: "Can I try it for free?",
                a: "Yes. The Free plan gives you 5 reminders per month with full language support. Enough to see if it fits your life before upgrading.",
            },
            {
                q: "Is my data safe?",
                a: "Every message is verified with Meta's HMAC signature before Remique processes it. Your reminders are stored securely and are never shared with third parties.",
            },
            {
                q: "What happens if I miss a reminder?",
                a: "On the Pro plan, Remique sends follow-up nudges. If you do not mark a reminder as done, it will message you again until you respond.",
            },
            {
                q: "Can I set recurring reminders?",
                a: 'Yes. Say "every day at 5pm check stock" or "protidin bikal 5 tay stock check" — Remique will repeat it on the schedule you describe. Works on the Shuru plan and above.',
            },
            {
                q: "Can I cancel anytime?",
                a: "Yes. There is no lock-in. Cancel through bKash or message Remique to stop your subscription. You keep access until the current billing period ends.",
            },
        ],
        cta: {
            title: "Still have questions?",
            sub: "Text Remique on WhatsApp. It answers those too.",
            button: "Start remembering",
        },
    },

    billingSuccess: {
        badge: "Payment Successful",
        title: "Welcome to Remique Pro!",
        desc: "Your bKash subscription is active. You now have unlimited reminders in Bangla, Banglish, and English.",
        refLabel: "bKash Subscription Reference",
        ctaWhatsApp: "Open Remique in WhatsApp",
        backHome: "Back to Home",
    },

    billingCancelled: {
        badge: "bKash Payment",
        titleCancelled: "Subscription Cancelled",
        titleIncomplete: "Payment Incomplete",
        descCancelled:
            "You cancelled the bKash subscription authorization. No charge was made to your account.",
        descIncompletePrefix: "The transaction could not be completed: ",
        descIncompleteSuffix: ". No funds were debited.",
        descDefault: "The bKash transaction was not completed. Please try again.",
        btnTryAgain: "Try Again",
        btnReturnHome: "Return to Homepage",
    },
};

export type Copy = typeof en;

const bn: Copy = {
    nav: {
        howItWorks: "কীভাবে কাজ করে",
        useCases: "কী কাজে লাগে",
        pricing: "প্রাইসিং",
        faq: "সাধারণ প্রশ্ন",
        getStarted: "মনে রাখা শুরু করুন",
        openMenu: "মেনু খুলুন",
        closeMenu: "মেনু বন্ধ করুন",
        logoAlt: "Remique লোগো",
    },

    lang: {
        groupLabel: "ভাষা",
        en: "EN",
        bn: "বাং",
        enFull: "ইংরেজি",
        bnFull: "বাংলা",
    },

    hero: {
        socialProof: "2,000+ মানুষ এখন কিছু ভোলেন না কারণ রেমিকিউ সব মনে রাখে",
        avatarAlt: "ইউজার অ্যাভাটার",
        // Bangla puts the whole verb phrase after the rotating noun, so the
        // prefix is empty here by design and the layout skips its line break.
        headlinePrefix: "",
        headlineSuffix: "আর কখনো ভুলবেন না।",
        rotator: ["বাবার ওষুধ এর সময়", "স্কুলের ফি", "৩টার মিটিং", "স্ত্রীর জন্মদিন", "ট্যাক্সের ডেডলাইন"],
        subBefore:
            "Remique একটা WhatsApp AI অ্যাসিস্ট্যান্ট, যে আপনার হয়ে সব মনে রাখে। যেভাবে মাথায় আসে সেভাবেই লিখুন — ইংরেজিতে, বাংলিশে, বা ",
        subAfter:
            "য়। ও কনফার্ম করে, সময় ঠিক করে রাখে, আর সময়মতো মনে করিয়ে দেয়। আপনি নিশ্চিন্ত।",
        worksOnWhatsApp: "WhatsApp-এই চলে",
        noApp: "কোনো অ্যাপ লাগবে না",
        ctaPrimary: "মনে রাখা শুরু করুন..",
        ctaSecondary: "চোখে দেখে নিন",
        botAlt: "Remique বট",
    },

    buried: {
        title: "আপনার ফোনেই সব রাখেন, কিন্তু সময় মত খুঁজে পান না...",
        body: "ডাক্তারের প্রেসক্রিপশন, বাইকের কাগজ, এন আই ডি, বিদ্যুৎ বিলের কপি সব তো জমা আছেই। সমস্যা রেখে দেওয়ায় না। সমস্যা হলো, যে মুহূর্তে দরকার ছিল, তখন কিছুই সামনে আসে না।",
        problemAlt: "ছড়ানো নোট, স্ক্রিনশট আর কাগজের নিচে চাপা পড়া একজন",
        solutionAlt: "Remique সেই কাগজগুলোই গুছিয়ে হাতে ধরে আছে",
        kicker: "আপনার কাজ শুধু বলা। মনে করিয়ে দেওয়ার কাজ Remique-এর।",
    },

    overload: {
        // The hyphen in "reaction‑ই" is U+2011, a non-breaking hyphen: a plain
        // "-" lets the line break between it and the ই.
        title: "ওভারলোড হওয়া ব্রেইনের স্বাভাবিক reaction‑ই হচ্ছে ভুলে যাওয়া",
        body: "Science বলে, ব্রেইন যখন capacity-র বেশি জিনিস ধরে রাখার চেষ্টা করে, তখন ভুলে যাওয়াটাই স্বাভাবিক। আপনি অলস না, আপনার memory খারাপ না, আপনার ব্রেইন শুধু ওভারলোডেড।",
        fix: "সমাধান জটিল কিছু না। ব্রেইনরে একটু জায়গা দিন, আর ছোট ছোট জিনিসগুলা Remique-কে মনে রাখতে দিন। WhatsApp-এই বলে দিলেই হবে।",
        imageAlt: "ওভারলোডেড ব্রেইন একসাথে সবকিছু ধরে রাখার চেষ্টা করছে",
    },

    privacySection: {
        title: "অফিসার রেমির পাহারায় আপনার ডেটা শুধুই আপনার।",
        body: "আমরা জানি আপনার রিমাইন্ডারে ব্যক্তিগত বা গুরুত্বপূর্ণ তথ্য থাকতে পারে। অফিসার রেমি নিশ্চিত করে যে আপনার ডেটা এনক্রিপ্টেড, নিরাপদ এবং কোনো থার্ড পার্টির সাথে শেয়ার করা হয় না।",
        fix: "আমরা ডেটা বিক্রি করি না। আমরা এমন একটা সার্ভিস দিই যা আপনার জীবন সহজ করে। আপনার প্রাইভেসি নিয়ে কোনো আপস নেই।",
        imageAlt: "আপনার ডেটা পাহারা দিচ্ছে অফিসার রেমি",
    },

    languages: {
        title: "বন্ধুকে মেসেজ দেওয়ার মতই সহজ",
        points: [
            "নতুন কোনো অ্যাপ শেখা লাগবে না",
            "কোনো কমান্ড বা ফরম্যাট নেই",
            "যেখানে এমনিতেই লেখেন, সেখানেই",
            "ফোল্ডার গোছানোর ঝামেলা নেই",
        ],
    },

    howItWorks: {
        eyebrow: "কীভাবে কাজ করে",
        title: "তিনটা ধাপ। তৃতীয়টায় আপনার কিছুই করতে হয় না।",
        sub: "সাইনআপ নেই, টিউটোরিয়াল নেই, শেখার ঝামেলা নেই। বন্ধুকে যেভাবে মেসেজ দেন, Remique-কেও সেভাবেই দিন।",
        steps: [
            {
                step: "ধাপ ১",
                title: "মেসেজের মতো করেই পাঠান",
                desc: "WhatsApp খুলুন। মাথায় যেভাবে আসে সেভাবেই রিমাইন্ডারটা লিখুন। কোনো ফরম্যাট নেই, স্ল্যাশ কমান্ড নেই, ডেট পিকার নেই।",
            },
            {
                step: "ধাপ ২",
                title: "বট আগেই বুঝে ফেলেছে",
                desc: "Remique আপনার বাংলা, বাংলিশ বা ইংরেজি পড়ে কাজ আর সময় দুটোই বের করে নেয়। তারপর আপনার ভাষাতেই কনফার্ম করে।",
            },
            {
                step: "ধাপ ৩",
                title: "এবার নিশ্চিন্তে ভুলে যান।",
                desc: "ঠিক সময়ে, WhatsApp-এর ভেতরেই রিমাইন্ডার পৌঁছে যাবে। আপনাকে আর কিছুই মনে রাখতে হবে না।",
            },
        ],
        cta: "কীভাবে কাজ করে দেখুন",
    },

    problem: {
        title: "সব রিমাইন্ডার অ্যাপ একইভাবে ব্যর্থ হয়: একসময় আপনি আর অ্যাপটাই খোলেন না।",
        body: "নোটিফিকেশনভিত্তিক রিমাইন্ডার মানে আরেকটা অ্যাপ খোলা, আরেকটা লিস্ট দেখা, আরেকটা ব্যাজ ক্লিয়ার করা। Remique থাকে যেখানে আপনি এমনিতেই আছেন — WhatsApp-এ।",
        cards: [
            {
                title: "অন্য অ্যাপগুলো খুলতে হয়।",
                body: "ক্যালেন্ডার অ্যালার্ট, টু-ডু লিস্ট, ফোনের অ্যালার্ম — সবগুলোই ধরে নেয় আপনি অ্যাপ বদলাবেন। আপনি বদলাবেন না।",
            },
            {
                title: "নোটিফিকেশন সরে যায়।",
                body: "একটা পুশ নোটিফিকেশনকে আরও পঞ্চাশটার সঙ্গে লড়তে হয়। আর WhatsApp মেসেজ বসে থাকে সেই চ্যাটে, যেটা আপনি দিনে ত্রিশবার খোলেন।",
            },
            {
                title: "আপনি এমনিতেই নিজেকে মেসেজ দেন।",
                body: "পিন করা চ্যাট, স্টার দেওয়া মেসেজ, WhatsApp-এ লেখা নোট — এটাকে টু-ডু লিস্ট বানিয়ে ফেলেছেন আগেই। Remique শুধু সেটাকে কাজের করে তোলে।",
            },
        ],
    },

    loop: {
        title: "যা-ই মনে রাখা দরকার, আমরা নিশ্চিত করি আপনি সেটা ভুলবেন না।",
        sub: "রিকারিং রিমাইন্ডার আর ফলো-আপ নাজ — যেসব জিনিস ফাঁক গলে বেরিয়ে যায়, Remique সেগুলোই সামলায়।",
        sample: "protidin bikal 5 tay medicine",
        repeats: "রিপিট",
        daily: "প্রতিদিন",
        at: "সময়",
        time: "5:00 pm",
        timezone: "asia/dhaka",
        rows: [
            {
                title: "চেইনটা নিজেই তৈরি হয়।",
                body: "প্রতিটা ডেলিভারি বেরোনোর আগেই পরেরটার সময় ঠিক করে রাখে। নতুন করে কিছু দিতে হয় না।",
            },
            {
                title: "ফাঁক কখনো জমে না।",
                body: "তিন দিন ডেলিভারি বন্ধ থাকলে আপনার প্রতিদিনের রিমাইন্ডার কাল থেকে আবার চালু হবে — জমে থাকা তিনটা একসঙ্গে আসবে না।",
            },
            {
                title: "একটা মিস হয়েছে? বলে দিন।",
                body: "প্রতিটা রিমাইন্ডার শেষ হয় “হয়ে গেছে, নাকি আরেকটু সময় লাগবে?” দিয়ে। কখন লাগবে বলে দিন, Remique তখনই ফিরে আসবে।",
            },
        ],
        cta: "ও কী কী পারে দেখুন",
    },

    pricing: {
        eyebrow: "প্রাইসিং",
        title: "যে লেট ফি বাঁচায়, দাম তার চেয়েও কম।",
        sub: "কার্ড লাগবে না, ঝামেলাও নেই। bKash দিয়ে সাবস্ক্রাইব করে এক মিনিটের মধ্যেই Remique চালু করুন।",
        weekly: "সাপ্তাহিক",
        monthly: "মাসিক",
        tier: "Pro",
        planName: "Remique Pro",
        planDesc: "যেকোনো ভাষায় আনলিমিটেড রিমাইন্ডার।",
        perWeek: "/সপ্তাহ",
        perMonth: "/মাস",
        subscribeWith: "সাবস্ক্রাইব করুন",
        features: [
            "আনলিমিটেড রিমাইন্ডার",
            "বাংলিশ, ইংরেজি আর বাংলা",
            "সময় হুবহু ধরে",
            "আপনার ভাষায় কনফার্মেশন",
            "রিকারিং রিমাইন্ডার",
            "ফলো-আপ নাজ",
        ],
    },

    featuresIndex: {
        title: "যা যা পাবেন, পুরোটা।",
        body: "পুরো ফিচার লিস্ট এক পাতায়। কোনো টিয়ারে কিছু লুকানো নেই, কিছু চালু করতে সেটিংসেও যেতে হবে না।",
        items: [
            {
                title: "সঙ্গে সঙ্গে কনফার্মেশন",
                desc: "কয়েক সেকেন্ডেই উত্তর আসে, আপনার ভাষায়।",
            },
            {
                title: "সময় হুবহু ধরে",
                desc: "“kalke shokal 10 tay” একটা নির্দিষ্ট সময় হয়ে যায়।",
            },
            {
                title: "রিকারিং রিমাইন্ডার",
                desc: "প্রতিদিন, প্রতি সপ্তাহে, প্রতি মাসে — কথায় বলে দিলেই হলো।",
            },
            { title: "ফলো-আপ নাজ", desc: "একটা মিস হয়েছে? Remique আবার পাঠায়।" },
            { title: "একাধিক ভাষা", desc: "বাংলা, বাংলিশ, ইংরেজি — বা সব মিলিয়ে।" },
            {
                title: "সিগনেচার ভেরিফিকেশন",
                desc: "প্রতিটা মেসেজ Meta HMAC দিয়ে যাচাই করা।",
            },
            {
                title: "প্রায়োরিটি ডেলিভারি",
                desc: "রিমাইন্ডার যায় প্রায়োরিটি কিউ দিয়ে।",
            },
        ],
    },

    banner: {
        title: "আপনার মেমোরির এখন একটা ব্যাকআপ আছে।",
        body: "একটা প্ল্যান বাছুন, bKash-এ পে করুন, আর Remique-কে মেসেজ দেওয়া শুরু করুন। সেটআপ বলতে এটুকুই।",
        cta: "এখনই Remique নিন",
        priceNote: "শুরু ৳49/সপ্তাহ থেকে",
        cardNote: "কার্ড লাগবে না",
    },

    faq: {
        eyebrow: "সাধারণ প্রশ্ন",
        title: "যৌক্তিক প্রশ্ন, সোজা উত্তর।",
        items: [
            {
                q: "Remique জিনিসটা কী?",
                a: "Remique একটা WhatsApp AI অ্যাসিস্ট্যান্ট, যে রিমাইন্ডার সেট করে, নোট রাখে আর আপনার টু-ডু লিস্ট সামলায়। আপনি স্বাভাবিকভাবেই মেসেজ দেবেন — ইংরেজি, বাংলিশ বা বাংলায় — বাকিটা ও দেখবে।",
            },
            {
                q: "কোনো অ্যাপ ইনস্টল করতে হবে?",
                a: "না। Remique পুরোপুরি WhatsApp-এর ভেতরেই চলে। কনট্যাক্টে যোগ করে মেসেজ দেওয়া শুরু করলেই হলো। ডাউনলোড করার কিছু নেই।",
            },
            {
                q: "কোন কোন ভাষা বোঝে?",
                a: "ইংরেজি, বাংলিশ (ইংরেজি হরফে লেখা বাংলা) আর বাংলা হরফ। এক বাক্যেই তিনটা মিশিয়ে লিখতে পারেন।",
            },
            {
                q: "পেমেন্ট কীভাবে হয়?",
                a: "bKash দিয়ে পে করবেন। প্ল্যান বেছে QR স্ক্যান করুন বা পেমেন্ট নম্বরটা দিন — সাবস্ক্রিপশন সঙ্গে সঙ্গেই চালু হয়ে যাবে। কার্ড লাগবে না।",
            },
            {
                q: "আমি কয়টা রিমাইন্ডার সেট করতে পারব?",
                a: "Remique Pro-তে আপনি আনলিমিটেড রিমাইন্ডার সেট করতে পারবেন।",
            },
            {
                q: "আমি যদি কোনো রিমাইন্ডার মিস করি?",
                a: "Remique ফলো-আপ নাজ পাঠায়। প্রতিটা রিমাইন্ডারের শেষে জানতে চাওয়া হয় আপনার কাজটা হয়েছে কিনা, নাকি আরও সময় লাগবে। তাই কোনো কিছুই বাদ পড়ে না।",
            },
            {
                q: "আমি কি কম্পিউটারে ব্যবহার করতে পারব?",
                a: "হ্যাঁ। যেহেতু Remique WhatsApp-এ চলে, তাই ফোন, ট্যাবলেট বা কম্পিউটারে WhatsApp Web-এর মাধ্যমেও ব্যবহার করতে পারবেন।",
            },
            {
                q: "আমার তথ্য কি নিরাপদ?",
                a: "হ্যাঁ। আপনার রিমাইন্ডার এবং নোটগুলো নিরাপদে সেভ করা থাকে। আমরা শুধু আপনাকে মনে করিয়ে দেওয়ার জন্যই তথ্যগুলো ব্যবহার করি, অন্য কারও সাথে শেয়ার করি না।",
            },
        ],
        cta: "সব উত্তর জেনে নিন",
    },

    footer: {
        tagline: "WhatsApp AI অ্যাসিস্ট্যান্ট। বাংলাদেশে যত্ন নিয়ে বানানো।",
        product: "প্রোডাক্ট",
        support: "সাপোর্ট",
        connect: "যোগাযোগ",
        howItWorks: "কীভাবে কাজ করে",
        useCases: "কী কাজে লাগে",
        pricing: "প্রাইসিং",
        faq: "সাধারণ প্রশ্ন",
        contact: "যোগাযোগ করুন",
        chatOnWhatsApp: "WhatsApp-এ চ্যাট করুন",
        rights: "সর্বস্বত্ব সংরক্ষিত।",
        privacy: "প্রাইভেসি",
        terms: "টার্মস",
        logoAlt: "Remique লোগো",
    },

    howItWorksPage: {
        eyebrow: "কীভাবে কাজ করে",
        title: "তিনটা ধাপ। তৃতীয়টায় আপনার কিছুই করতে হয় না।",
        sub: "সাইনআপ নেই, টিউটোরিয়াল নেই, শেখার ঝামেলা নেই। বন্ধুকে যেভাবে মেসেজ দেন, Remique-কেও সেভাবেই দিন, বাকিটা ও সামলে নেবে।",
        steps: [
            {
                label: "ধাপ ১",
                title: "মেসেজের মতো করেই পাঠান",
                desc: 'WhatsApp খুলুন। মাথায় যেভাবে আসে সেভাবেই রিমাইন্ডারটা লিখুন — "kalke shokal 8 tay exam" বা "remind me Friday 6pm invoice"। কোনো ফরম্যাট নেই, স্ল্যাশ কমান্ড নেই, ডেট পিকার নেই।',
            },
            {
                label: "ধাপ ২",
                title: "বট আগেই বুঝে ফেলেছে",
                desc: "Remique আপনার বাংলা, বাংলিশ বা ইংরেজি পড়ে কাজ আর সময় দুটোই বের করে নেয়। তারপর আপনার ভাষাতেই কনফার্ম করে যাতে আপনি বুঝতে পারেন ও ঠিকঠাক বুঝেছে।",
            },
            {
                label: "ধাপ ৩",
                title: "এবার নিশ্চিন্তে ভুলে যান।",
                desc: "ঠিক সময়ে, WhatsApp-এর ভেতরেই রিমাইন্ডার পৌঁছে যাবে। আপনাকে কিছু চেক করতে হবে না, কোনো অ্যাপ খুলতে হবে না, মনেও রাখতে হবে না।",
            },
        ],
        chase: {
            eyebrow: "নাছোড়বান্দা",
            title: "যা-ই মনে রাখা দরকার, আমরা নিশ্চিত করি আপনি সেটা ভুলবেন না।",
            sub: "রিকারিং কাজ, ফলো-আপ নাজ — যেসব জিনিস ফাঁক গলে বেরিয়ে যায়, Remique সেগুলোই সামলায়।",
            features: [
                {
                    title: "রিকারিং রিমাইন্ডার",
                    desc: '"Protidin bikal 5 tay stock check" — প্রতিদিন, প্রতি সপ্তাহে বা যেভাবে মুখে বলবেন, Remique সেভাবেই সময়মতো মনে করিয়ে দেবে।',
                },
                {
                    title: "ফলো-আপ নাজ",
                    desc: "একটা রিমাইন্ডার মিস হয়েছে? Remique দ্বিতীয়বার মেসেজ পাঠাবে। তারপর তৃতীয়বার। যতক্ষণ না আপনি শেষ করছেন, ও হাল ছাড়ে না।",
                },
            ],
        },
        cta: {
            title: "ভুলে যাওয়া বন্ধ করতে প্রস্তুত?",
            sub: "প্ল্যান বাছুন, WhatsApp খুলুন, আর মেসেজ দেওয়া শুরু করুন। অনবোর্ডিং এটুকুই।",
            button: "মনে রাখা শুরু করুন",
        },
    },

    useCasesPage: {
        eyebrow: "কী কাজে লাগে",
        title: "সবার জীবনের জন্যই তৈরি।",
        sub: "শিক্ষার্থী, ফ্রিল্যান্সার, ব্যবসায়ী, অভিভাবক — একই WhatsApp, একই Remique, কিন্তু ভিন্ন ভিন্ন জীবন।",
        personas: [
            {
                name: "রাফিক",
                role: "শিক্ষার্থী",
                desc: "পরীক্ষার প্রস্তুতি, অ্যাসাইনমেন্টের ডেডলাইন, ক্লাসের সময়সূচী — রাফিক বাংলিশে লিখে দেয়, বাকিটা Remique সামলায়।",
                accent: "আর ডেডলাইন মিস হবে না",
            },
            {
                name: "তানিয়া",
                role: "ফ্রিল্যান্সার",
                desc: "ক্লায়েন্টের ইনভয়েস, ফলো-আপ, প্রজেক্টের ডেডলাইন — তানিয়ার কোনো কাজই আর হাতছাড়া হয় না।",
                accent: "ক্লায়েন্ট সবসময় সন্তুষ্ট",
            },
            {
                name: "আরিফ",
                role: "ব্যবসায়ী",
                desc: "প্রতিদিনের স্টক চেক, সাপ্লায়ারকে ফোন, কর্মীদের রিমাইন্ডার — আরিফ তার দোকান চালায় একটা WhatsApp চ্যাট দিয়েই।",
                accent: "দোকান চলে নিজের মতো",
            },
            {
                name: "নুসরাত",
                role: "অভিভাবক",
                desc: "স্কুলের বেতন, ডাক্তারের কাছে যাওয়া, পরিবারের জন্মদিন — সবচেয়ে জরুরি কাজগুলো নুসরাত আর কখনো ভোলে না।",
                accent: "পরিবারের সব কাজ গোছানো",
            },
        ],
        cta: {
            title: "আপনার জীবন যেমনই হোক, Remique মানিয়ে নেয়।",
            sub: "মেসেজ দেওয়া শুরু করুন। Remique আপনার সাথেই মানিয়ে নেবে।",
            button: "আপনার মতো করে নিন",
        },
    },

    pricingPage: {
        eyebrow: "প্রাইসিং",
        title: "যে লেট ফি বাঁচায়, দাম তার চেয়েও কম।",
        sub: "কার্ড লাগবে না, ঝামেলাও নেই। bKash দিয়ে সাবস্ক্রাইব করে এক মিনিটের মধ্যেই Remique চালু করুন।",
        weekly: "সাপ্তাহিক",
        monthly: "মাসিক",
        tier: "Pro",
        planName: "Remique Pro",
        planDesc: "যেকোনো ভাষায় আনলিমিটেড রিমাইন্ডার।",
        perWeek: "/সপ্তাহ",
        perMonth: "/মাস",
        subscribeWith: "সাবস্ক্রাইব করুন",
        features: [
            "আনলিমিটেড রিমাইন্ডার",
            "বাংলিশ, ইংরেজি আর বাংলা",
            "সময় হুবহু ধরে",
            "আপনার ভাষায় কনফার্মেশন",
            "রিকারিং রিমাইন্ডার",
            "ফলো-আপ নাজ",
        ],
        trust: "সব পেমেন্ট bKash-এর মাধ্যমে নিরাপদে সম্পন্ন হয়",
        allFeaturesTitle: "যা যা পাবেন, পুরোটা।",
        allFeatures: [
            {
                num: 1,
                title: "সঙ্গে সঙ্গে কনফার্মেশন",
                desc: "কয়েক সেকেন্ডেই উত্তর আসে, যে ভাষায় লিখেছেন সেই ভাষাতেই।",
            },
            {
                num: 2,
                title: "সময় হুবহু ধরে",
                desc: '"in 5 minutes", "kalke shokal 10 tay" — সবই নির্দিষ্ট সময় হয়ে যায়।',
            },
            {
                num: 3,
                title: "রিকারিং রিমাইন্ডার",
                desc: "প্রতিদিন, প্রতি সপ্তাহে, প্রতি মাসে — কথায় বলে দিলেই হলো।",
            },
            {
                num: 4,
                title: "ফলো-আপ নাজ",
                desc: "একটা মিস হয়েছে? Remique আবার পাঠায়।",
            },
            {
                num: 5,
                title: "একাধিক ভাষার সাপোর্ট",
                desc: "বাংলা, বাংলিশ, ইংরেজি — বা সব মিলিয়ে।",
            },
            {
                num: 6,
                title: "সিগনেচার ভেরিফিকেশন",
                desc: "Remique কাজ করার আগে প্রতিটা মেসেজ ভেরিফাই করা হয়।",
            },
            {
                num: 7,
                title: "প্রায়োরিটি ডেলিভারি",
                desc: "রিমাইন্ডার যায় প্রায়োরিটি কিউ দিয়ে।",
            },
        ],
        modal: {
            title: "bKash অটো-পে দিয়ে সাবস্ক্রাইব করুন",
            desc: "আপনার WhatsApp নম্বর এবং ইমেইল দিন, যাতে আপনার Pro সুবিধাগুলো সরাসরি আপনার WhatsApp চ্যাটের সাথে যুক্ত করতে পারি।",
            phoneLabel: "WhatsApp নম্বর",
            phonePlaceholder: "01712345678",
            emailLabel: "ইমেইল ঠিকানা",
            emailPlaceholder: "you@example.com",
            selectedPlan: "নির্বাচিত প্ল্যান:",
            proceed: "bKash-এ এগিয়ে যান",
            connecting: "bKash-এ সংযোগ করা হচ্ছে...",
            errorEmpty: "অনুগ্রহ করে আপনার WhatsApp নম্বর এবং ইমেইল দিন।",
            errorGeneric: "bKash-এর সাথে সংযোগ করার সময় একটি ত্রুটি ঘটেছে",
            errorFailed: "bKash সাবস্ক্রিপশন শুরু করা যায়নি",
        },
    },

    faqPage: {
        eyebrow: "সাধারণ প্রশ্ন",
        title: "যৌক্তিক প্রশ্ন, সোজা উত্তর।",
        sub: "Remique-কে মেসেজ দেওয়া শুরু করার আগে যা যা জানতে চাইতে পারেন।",
        items: [
            {
                q: "Remique জিনিসটা কী?",
                a: "Remique একটা WhatsApp AI অ্যাসিস্ট্যান্ট, যে আপনার রিমাইন্ডার সেট করে এবং সামলায়। আপনি স্বাভাবিকভাবেই মেসেজ দেবেন — ইংরেজি, বাংলিশ বা বাংলায় — বাকিটা ও দেখবে।",
            },
            {
                q: "কোনো অ্যাপ ইনস্টল করতে হবে?",
                a: "না। Remique পুরোপুরি WhatsApp-এর ভেতরেই চলে। কনট্যাক্টে যোগ করে মেসেজ দেওয়া শুরু করলেই হলো। ডাউনলোড করার কিছু নেই।",
            },
            {
                q: "কোন কোন ভাষা বোঝে?",
                a: "ইংরেজি, বাংলিশ (ইংরেজি হরফে লেখা বাংলা) আর বাংলা হরফ। এক বাক্যেই তিনটা মিশিয়ে লিখতে পারেন — Remique ঠিকই বুঝে নেবে।",
            },
            {
                q: "পেমেন্ট কীভাবে হয়?",
                a: "bKash দিয়ে পে করবেন। প্ল্যান বেছে QR স্ক্যান করুন বা পেমেন্ট নম্বরটা দিন — সাবস্ক্রিপশন সঙ্গে সঙ্গেই চালু হয়ে যাবে। কার্ড লাগবে না।",
            },
            {
                q: "আমি কি বিনামূল্যে ট্রায়াল দিতে পারব?",
                a: "হ্যাঁ। ফ্রি প্ল্যানে আপনি প্রতি মাসে সম্পূর্ণ ভাষা সাপোর্টসহ ৫টি রিমাইন্ডার পাবেন। আপগ্রেড করার আগে দেখে নেওয়ার জন্য যথেষ্ট।",
            },
            {
                q: "আমার তথ্য কি নিরাপদ?",
                a: "Remique প্রসেস করার আগেই প্রতিটি মেসেজ Meta-র HMAC সিগনেচার দিয়ে যাচাই করা হয়। আপনার রিমাইন্ডারগুলো সুরক্ষিত থাকে এবং তৃতীয় কারও সাথে শেয়ার করা হয় না।",
            },
            {
                q: "আমি যদি কোনো রিমাইন্ডার মিস করি?",
                a: "Pro প্ল্যানে Remique ফলো-আপ নাজ পাঠায়। রিমাইন্ডার সম্পন্ন না করলে আপনি উত্তর না দেওয়া পর্যন্ত ও আবার মেসেজ পাঠাবে।",
            },
            {
                q: "আমি কি রিকারিং রিমাইন্ডার সেট করতে পারব?",
                a: 'হ্যাঁ। "every day at 5pm check stock" বা "protidin bikal 5 tay stock check" বলুন — আপনি যেভাবে বলবেন সেভাবেই ও রিপিট করবে।',
            },
            {
                q: "আমি কি যেকোনো সময় বাতিল করতে পারব?",
                a: "হ্যাঁ। কোনো বাধ্যবাধকতা নেই। bKash-এর মাধ্যমে বা Remique-কে মেসেজ পাঠিয়ে যেকোনো সময় সাবস্ক্রিপশন বাতিল করতে পারেন। বর্তমান বিলিং পিরিয়ড শেষ হওয়া পর্যন্ত আপনার অ্যাক্সেস থাকবে।",
            },
        ],
        cta: {
            title: "আরও কিছু জানার আছে?",
            sub: "WhatsApp-এ Remique-কে মেসেজ দিন। ও এগুলোরও উত্তর দিয়ে দেবে।",
            button: "মনে রাখা শুরু করুন",
        },
    },

    billingSuccess: {
        badge: "পেমেন্ট সফল হয়েছে",
        title: "Remique Pro-তে স্বাগতম!",
        desc: "আপনার bKash সাবস্ক্রিপশন চালু হয়েছে। এখন থেকে আপনি বাংলা, বাংলিশ এবং ইংরেজিতে আনলিমিটেড রিমাইন্ডার পাবেন।",
        refLabel: "bKash সাবস্ক্রিপশন রেফারেন্স",
        ctaWhatsApp: "WhatsApp-এ Remique খুলুন",
        backHome: "হোমে ফিরে যান",
    },

    billingCancelled: {
        badge: "bKash পেমেন্ট",
        titleCancelled: "সাবস্ক্রিপশন বাতিল করা হয়েছে",
        titleIncomplete: "পেমেন্ট সম্পন্ন হয়নি",
        descCancelled:
            "আপনি bKash সাবস্ক্রিপশন অনুমোদন বাতিল করেছেন। আপনার অ্যাকাউন্ট থেকে কোনো টাকা কাটা হয়নি।",
        descIncompletePrefix: "লেনদেন সম্পন্ন করা যায়নি: ",
        descIncompleteSuffix: "। কোনো টাকা কাটা হয়নি।",
        descDefault: "bKash লেনদেন সম্পন্ন হয়নি। অনুগ্রহ করে আবার চেষ্টা করুন।",
        btnTryAgain: "আবার চেষ্টা করুন",
        btnReturnHome: "হোমপেজে ফিরে যান",
    },
};

export const COPY: Record<Lang, Copy> = { en, bn };
