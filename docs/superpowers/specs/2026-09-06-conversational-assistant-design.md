# Conversational Assistant: Anchored Reminders & Natural Replies

**Date:** 2026-09-06
**Status:** Proposed, awaiting approval

## Problem

Remique answers each message competently but in isolation. A competitor
(Memorae) transcript shows behaviour we cannot currently produce:

1. "at 9PM remind me 15 mins before and another one 30 mins before" creates
   **two** reminders from one message. Our contract carries a single
   `title`/`scheduled_iso`, so this is structurally impossible.
2. "Actually change the 30 mins with 1 hour" edits **only** that alert and
   leaves the other untouched. Our `reschedule_reminder` matches on
   `title contains`, and "30 mins" appears nowhere in "Meeting with John".
3. Reminder delivery offers Done / Snooze buttons. We send plain text and have
   no completion state — a delivered reminder is terminal.
4. Replies restate the resulting state ("the 30-minute heads-up is now 1 hour
   before... your meeting at 9:00 PM stays as is") rather than just "Done!".

Items 1 and 2 are not tone problems. They are a data-model gap: the competitor
models the *event* separately from the *alerts that point at it*.

## Decisions

1. **Anchor + offset, not flat rows.** A reminder may reference an anchor
   moment (the meeting itself) and store how far before it fires. Editing "the
   30 mins one" becomes: find the alert in this group with `offsetMinutes = 30`,
   set it to 60, recompute `scheduledAt = anchorAt - offset`.
2. **Alerts for one event share a `groupId`.** Gives "change the 30 mins" a
   scope, and lets a confirmation restate every sibling alert.
3. **Drop the numbers, keep the positions.** An earlier reading of the
   competitor assumed its unnumbered list could not resolve "remove the 2nd
   one". It can: a later transcript shows it counting across day groups on a
   bulleted list and removing the correct row. Ordinals resolve against the
   ordering the assistant *remembers displaying*, not against printed digits —
   and we already park that ordering in `ConversationState`. So the display
   becomes day-grouped bullets (cleaner) while positional references keep
   working, counted across groups top to bottom.
4. **State-changing confirmations stay deterministic.** Warmth comes from
   better templates, not from letting the model narrate. It previously claimed
   to have cancelled meetings it never touched; that guard does not get traded
   away for tone. The model writes freely only when no state changed.
5. **Buttons via WhatsApp interactive messages.** Reply buttons are capped at
   three by Meta, which exactly fits Done / 1 hour / Tomorrow.

## Data model

```prisma
model Reminder {
  // ... existing fields ...

  // The event being reminded about. Null for a standalone reminder
  // ("take a shower in 10 minutes") where the reminder IS the thing.
  anchorAt      DateTime? @map("anchor_at")
  anchorTitle   String?   @map("anchor_title")

  // Minutes before anchorAt that this alert fires. Null when there is no
  // anchor. This is what "the 30 mins one" refers to.
  offsetMinutes Int?      @map("offset_minutes")

  // Alerts created for the same event share this, so a change can restate
  // its siblings and a cancel can take the whole set.
  groupId       String?   @map("group_id")

  @@index([userId, groupId])
}
```

`ReminderStatus` gains `DONE`. `SENT` means delivered; `DONE` means the user
confirmed they did it. Distinguishing them is what makes "Marked as done" and
completion stats possible later.

## Extraction contract

`create_reminder` returns an array instead of scalars:

```jsonc
{
  "anchor_iso": "2026-09-07T21:00:00",   // the meeting; null if standalone
  "anchor_title": "Meeting with John",
  "reminders": [
    { "title": "...", "scheduled_iso": "...", "offset_minutes": 30, "category": "MEETING" },
    { "title": "...", "scheduled_iso": "...", "offset_minutes": 15, "category": "MEETING" }
  ]
}
```

`reschedule_reminder` gains `target_offset_minutes` and `new_offset_minutes`,
so "change the 30 mins to 1 hour" is expressible without string matching.

## Reply style

Deterministic templates, warmer, built from rows actually written:

- Address the user by name (`User.name`, already captured from the webhook).
- After a change, restate the whole group, including what did **not** move.
- Group lists by Today / Tomorrow / weekday as bulleted sections. Position is
  counted across the whole flattened list, top to bottom, so "the 2nd one"
  spans day headings.
- An alert with an anchor shows both times: "8:00 PM - Meeting with John at
  9:00 PM". The alert time is when the phone buzzes; the anchor is the thing
  itself, and hiding it makes two alerts for one meeting look like duplicates.
- Name the alert by its offset when confirming a change: "the 1-hour heads-up",
  not "the 8:00 PM reminder". Requires `offsetMinutes`; this is the phrasing
  that makes a group edit legible.
- Close with an opening rather than a full stop ("That's everything on your
  plate right now. Want to add anything else?").
- On a negative answer, state the nearest relevant fact and offer the action.
- Drop the bold-heavy formatting and emoji density.

## Open questions

- Should cancelling one alert in a group offer to cancel the siblings?
- Does "remind me before X" with no offset default to 15 minutes, or ask?
- Snooze on a recurring reminder: does it move this occurrence only?

## Out of scope

Vision, calendar sync, multi-user events, and timezone changes per reminder.
