import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  json,
  decimal,
  uuid,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    whatsappId: text('whatsapp_id').notNull().unique(),
    phoneNumber: text('phone_number').notNull(),
    email: text('email').unique(),
    name: text('name'),
    timezone: text('timezone').default('Asia/Dhaka').notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),

    blockedAt: timestamp('blocked_at', { mode: 'date' }),
    blockedReason: text('blocked_reason'),
    blockNoticeSentAt: timestamp('block_notice_sent_at', { mode: 'date' }),
    lapseNoticeSentAt: timestamp('lapse_notice_sent_at', { mode: 'date' }),

    totalInputTokens: integer('total_input_tokens').default(0).notNull(),
    totalOutputTokens: integer('total_output_tokens').default(0).notNull(),
    totalCostMicros: integer('total_cost_micros').default(0).notNull(),
    totalLlmCalls: integer('total_llm_calls').default(0).notNull(),

    dailyTokenCap: integer('daily_token_cap'),
    weeklyTokenCap: integer('weekly_token_cap'),
  }
);

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    label: text('label'),
    mediaType: text('media_type').notNull(),
    mimeType: text('mime_type').notNull(),
    fileName: text('file_name'),
    s3Key: text('s3_key').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (t) => [index('documents_user_id_created_at_idx').on(t.userId, t.createdAt)]
);

export const usageEvents = pgTable(
  'usage_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    messageId: text('message_id'),
    purpose: text('purpose').default('parse').notNull(),
    provider: text('provider').default('openai').notNull(),
    model: text('model').notNull(),
    inputTokens: integer('input_tokens').notNull(),
    cachedTokens: integer('cached_tokens').default(0).notNull(),
    outputTokens: integer('output_tokens').notNull(),
    costMicros: integer('cost_micros').notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (t) => [
    index('usage_events_user_id_created_at_idx').on(t.userId, t.createdAt),
    index('usage_events_created_at_idx').on(t.createdAt),
  ]
);

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    planTier: text('plan_tier').default('free').notNull(),
    planPeriod: text('plan_period'),
    amount: decimal('amount', { precision: 12, scale: 2 }),
    currency: text('currency').default('BDT').notNull(),
    status: text('status').default('ACTIVE').notNull(),
    requestId: text('request_id').unique(),
    subscriberId: text('subscriber_id'),
    currentPeriodStart: timestamp('current_period_start', { mode: 'date' }),
    currentPeriodEnd: timestamp('current_period_end', { mode: 'date' }),
    cancelledAt: timestamp('cancelled_at', { mode: 'date' }),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (t) => [index('subscriptions_status_current_period_end_idx').on(t.status, t.currentPeriodEnd)]
);

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
    currency: text('currency').default('BDT').notNull(),
    provider: text('provider').notNull(),
    externalId: text('external_id').unique(),
    status: text('status').default('PENDING').notNull(),
    periodStart: timestamp('period_start', { mode: 'date' }),
    periodEnd: timestamp('period_end', { mode: 'date' }),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
    subscriptionId: uuid('subscription_id').references(() => subscriptions.id, { onDelete: 'set null' }),
  },
  (t) => [
    index('payments_user_id_created_at_idx').on(t.userId, t.createdAt),
    index('payments_status_created_at_idx').on(t.status, t.createdAt),
    index('payments_subscription_id_idx').on(t.subscriptionId),
  ]
);

export const facts = pgTable(
  'facts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    subject: text('subject').notNull(),
    predicate: text('predicate').notNull(),
    value: text('value').notNull(),
    valueDate: timestamp('value_date', { mode: 'date' }),
    recurring: boolean('recurring').default(false).notNull(),
    sourceMessageId: text('source_message_id'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('facts_user_id_subject_predicate_idx').on(t.userId, t.subject, t.predicate),
    index('facts_user_id_updated_at_idx').on(t.userId, t.updatedAt),
  ]
);

export const notes = pgTable(
  'notes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (t) => [index('notes_user_id_idx').on(t.userId)]
);

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    whatsappMessageId: text('whatsapp_message_id').notNull().unique(),
    direction: text('direction').notNull(),
    messageText: text('message_text').notNull(),
    rawPayload: json('raw_payload'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    processedAt: timestamp('processed_at', { mode: 'date' }),
    attempts: integer('attempts').default(0).notNull(),
    processingError: text('processing_error'),
    qstashMessageId: text('qstash_message_id'),
    mediaId: text('media_id'),
    mediaType: text('media_type'),
    mediaMimeType: text('media_mime_type'),
    mediaFilename: text('media_filename'),
    buttonReplyId: text('button_reply_id'),
  },
  (t) => [
    index('messages_direction_processed_at_idx').on(t.direction, t.processedAt),
    index('messages_user_id_direction_created_at_idx').on(t.userId, t.direction, t.createdAt),
  ]
);

export const reminders = pgTable(
  'reminders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    originalMessage: text('original_message').notNull(),
    scheduledAt: timestamp('scheduled_at', { mode: 'date' }).notNull(),
    timezone: text('timezone').default('Asia/Dhaka').notNull(),
    category: text('category').default('GENERAL').notNull(),
    anchorAt: timestamp('anchor_at', { mode: 'date' }),
    anchorTitle: text('anchor_title'),
    offsetMinutes: integer('offset_minutes'),
    groupId: text('group_id'),
    recurrenceRule: text('recurrence_rule'),
    // user | snooze | recurrence. Only 'user' counts toward the Free plan's
    // monthly limit (see src/lib/plan.ts).
    source: text('source').default('user').notNull(),
    status: text('status').default('SCHEDULED').notNull(),
    qstashMessageId: text('qstash_message_id'),
    attempts: integer('attempts').default(0).notNull(),
    errorMessage: text('error_message'),
    sentAt: timestamp('sent_at', { mode: 'date' }),
    completedAt: timestamp('completed_at', { mode: 'date' }),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (t) => [
    index('reminders_user_id_scheduled_at_idx').on(t.userId, t.scheduledAt),
    index('reminders_user_id_category_scheduled_at_idx').on(t.userId, t.category, t.scheduledAt),
    index('reminders_user_id_group_id_idx').on(t.userId, t.groupId),
    index('reminders_status_scheduled_at_idx').on(t.status, t.scheduledAt),
  ]
);

export const conversationStates = pgTable(
  'conversation_states',
  {
    userId: uuid('user_id')
      .notNull()
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    pendingIntent: text('pending_intent').notNull(),
    pendingData: json('pending_data').default('{}').notNull(),
    expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
  }
);

// Define relations for Drizzle's relational queries
export const usersRelations = relations(users, ({ one, many }) => ({
  reminders: many(reminders),
  messages: many(messages),
  conversationState: one(conversationStates),
  notes: many(notes),
  documents: many(documents),
  facts: many(facts),
  usageEvents: many(usageEvents),
  payments: many(payments),
  subscription: one(subscriptions),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  user: one(users, { fields: [documents.userId], references: [users.id] }),
}));

export const usageEventsRelations = relations(usageEvents, ({ one }) => ({
  user: one(users, { fields: [usageEvents.userId], references: [users.id] }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, { fields: [payments.userId], references: [users.id] }),
  subscription: one(subscriptions, { fields: [payments.subscriptionId], references: [subscriptions.id] }),
}));

export const factsRelations = relations(facts, ({ one }) => ({
  user: one(users, { fields: [facts.userId], references: [users.id] }),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  user: one(users, { fields: [notes.userId], references: [users.id] }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  user: one(users, { fields: [messages.userId], references: [users.id] }),
}));

export const remindersRelations = relations(reminders, ({ one }) => ({
  user: one(users, { fields: [reminders.userId], references: [users.id] }),
}));

export const conversationStatesRelations = relations(conversationStates, ({ one }) => ({
  user: one(users, { fields: [conversationStates.userId], references: [users.id] }),
}));
