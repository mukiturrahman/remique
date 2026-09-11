# Graph Report - .  (2026-09-11)

## Corpus Check
- 191 files · ~468,125 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 847 nodes · 1497 edges · 57 communities (47 shown, 10 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 90 edges (avg confidence: 0.84)
- Token cost: 601,035 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Reminder Service and Date Parsing|Reminder Service and Date Parsing]]
- [[_COMMUNITY_Admin Auth and AWS Webhook Topology|Admin Auth and AWS Webhook Topology]]
- [[_COMMUNITY_Postgres Connections and Indexing|Postgres Connections and Indexing]]
- [[_COMMUNITY_Package Dependencies|Package Dependencies]]
- [[_COMMUNITY_Token Pricing and Parser Usage|Token Pricing and Parser Usage]]
- [[_COMMUNITY_Query Plans, Indexes and Vacuum|Query Plans, Indexes and Vacuum]]
- [[_COMMUNITY_Admin Build Tasks and Design Rules|Admin Build Tasks and Design Rules]]
- [[_COMMUNITY_Landing Page Composition|Landing Page Composition]]
- [[_COMMUNITY_bKash bdApps Subscription|bKash bdApps Subscription]]
- [[_COMMUNITY_Root Layout and Language Provider|Root Layout and Language Provider]]
- [[_COMMUNITY_Admin Icon System|Admin Icon System]]
- [[_COMMUNITY_Block, Quota and Plan Controls|Block, Quota and Plan Controls]]
- [[_COMMUNITY_Admin Query Layer|Admin Query Layer]]
- [[_COMMUNITY_Marketing Pages and Site Chrome|Marketing Pages and Site Chrome]]
- [[_COMMUNITY_Admin Overview Page|Admin Overview Page]]
- [[_COMMUNITY_TypeScript Compiler Config|TypeScript Compiler Config]]
- [[_COMMUNITY_Inbound Message Pipeline|Inbound Message Pipeline]]
- [[_COMMUNITY_Prisma Client and Environment|Prisma Client and Environment]]
- [[_COMMUNITY_Buried Documents Marketing Assets|Buried Documents Marketing Assets]]
- [[_COMMUNITY_QStash Scheduled Delivery|QStash Scheduled Delivery]]
- [[_COMMUNITY_Brand Positioning Imagery|Brand Positioning Imagery]]
- [[_COMMUNITY_WhatsApp Chat Mockup Components|WhatsApp Chat Mockup Components]]
- [[_COMMUNITY_FAQ and Hero Rotator|FAQ and Hero Rotator]]
- [[_COMMUNITY_Supabase Agent Skill|Supabase Agent Skill]]
- [[_COMMUNITY_WhatsApp Send and Logging|WhatsApp Send and Logging]]
- [[_COMMUNITY_Recurrence and Reply Buttons|Recurrence and Reply Buttons]]
- [[_COMMUNITY_User Detail Page Build|User Detail Page Build]]
- [[_COMMUNITY_Live Thread Panel|Live Thread Panel]]
- [[_COMMUNITY_Health Check Endpoint|Health Check Endpoint]]
- [[_COMMUNITY_Demo Seed Script|Demo Seed Script]]
- [[_COMMUNITY_Final Fix Wave Findings|Final Fix Wave Findings]]
- [[_COMMUNITY_Migration Safety Rulings|Migration Safety Rulings]]
- [[_COMMUNITY_Usage Schema and Money Model|Usage Schema and Money Model]]
- [[_COMMUNITY_Pricing Section Component|Pricing Section Component]]
- [[_COMMUNITY_Brand Surface Assets|Brand Surface Assets]]
- [[_COMMUNITY_Supabase RLS Security Traps|Supabase RLS Security Traps]]
- [[_COMMUNITY_Blocking and Quota Enforcement|Blocking and Quota Enforcement]]
- [[_COMMUNITY_Usage Bucketing for Detail Page|Usage Bucketing for Detail Page]]
- [[_COMMUNITY_Plan Badge|Plan Badge]]
- [[_COMMUNITY_Usage Chart and Formatting|Usage Chart and Formatting]]
- [[_COMMUNITY_Use Cases Personas|Use Cases Personas]]
- [[_COMMUNITY_Anchored Reminders Spec|Anchored Reminders Spec]]
- [[_COMMUNITY_Usage Persistence|Usage Persistence]]
- [[_COMMUNITY_WhatsApp API Error Class|WhatsApp API Error Class]]
- [[_COMMUNITY_Grandfather Users Script|Grandfather Users Script]]
- [[_COMMUNITY_SQS Worker Lambda|SQS Worker Lambda]]
- [[_COMMUNITY_Vercel Deploy Config|Vercel Deploy Config]]
- [[_COMMUNITY_MCP Server Config|MCP Server Config]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_Lambda Build Script|Lambda Build Script]]
- [[_COMMUNITY_Vercel Folder Readme|Vercel Folder Readme]]
- [[_COMMUNITY_Project Instructions File|Project Instructions File]]
- [[_COMMUNITY_PostCSS Plugin Chain|PostCSS Plugin Chain]]

## God Nodes (most connected - your core abstractions)
1. `processIncomingUserMessage()` - 34 edges
2. `useCopy()` - 28 edges
3. `compilerOptions` - 16 edges
4. `Env` - 13 edges
5. `runMessagePipeline()` - 13 edges
6. `prisma (global PrismaClient singleton)` - 13 edges
7. `replyToUser()` - 12 edges
8. `scripts` - 11 edges
9. `AdminOverviewPage()` - 11 edges
10. `Navbar()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `SHA-512 Authorization Signature Formula` --semantically_similar_to--> `hmacHex()`  [INFERRED] [semantically similar]
  docs/BDAPPS_BKASH_SUBSCRIPTION_INTEGRATION.md → src/lib/admin-auth.ts
- `WhatsApp Interactive Reply Buttons (Done / Snooze)` --conceptually_related_to--> `processIncomingUserMessage()`  [INFERRED]
  docs/superpowers/specs/2026-09-06-conversational-assistant-design.md → src/lib/reminder-service.ts
- `Supabase Security Checklist` --semantically_similar_to--> `Accepted-As-Is Findings (Ship Without Fixing)`  [INFERRED] [semantically similar]
  .agents/skills/supabase/SKILL.md → .superpowers/sdd/2026-09-08-usage-metering-and-admin-dashboard/progress.md
- `listUsers()` --shares_data_with--> `Denormalized User Counters Avoid usage_events GroupBy`  [EXTRACTED]
  src/lib/admin-queries.ts → .superpowers/sdd/2026-09-08-usage-metering-and-admin-dashboard/task-8-brief.md
- `Money as Integer Micros` --rationale_for--> `formatCost()`  [INFERRED]
  docs/superpowers/specs/2026-09-08-usage-metering-and-admin-design.md → src/lib/admin-queries.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Connection Management Rule Set (conn-*)** — references_conn_pooling_connection_pooling, references_conn_limits_connection_limits, references_conn_idle_timeout_idle_connection_timeouts, references_conn_prepared_statements_prepared_statements_with_pooling, references_sections_connection_management [EXTRACTED 1.00]
- **Concurrency & Locking Rule Set (lock-*)** — references_lock_advisory_advisory_locks, references_lock_deadlock_prevention_consistent_lock_ordering, references_lock_short_transactions_short_transactions, references_lock_skip_locked_skip_locked, references_sections_concurrency_locking [EXTRACTED 1.00]
- **Reference Authoring Standard (guidelines + sections + template)** — references_contributing_writing_guidelines, references_contributing_impact_level_guidelines, references_contributing_review_checklist, references_sections_section_definitions, references_template_rule_template, references_template_frontmatter_schema [INFERRED 0.95]
- **Postgres Index Design Toolkit** — references_query_missing_indexes, references_query_composite_indexes, references_query_covering_indexes, references_query_partial_indexes, references_query_index_types, references_schema_foreign_key_indexes [INFERRED 0.85]
- **RLS Tenant Isolation and Hardening Flow** — references_security_rls_basics, references_security_rls_basics_force_row_level_security, references_security_rls_performance, references_security_rls_performance_security_definer_function, references_security_privileges [INFERRED 0.85]
- **Slow Query Diagnosis Workflow** — references_monitor_pg_stat_statements, references_monitor_explain_analyze, references_monitor_explain_analyze_plan_signals, references_monitor_vacuum_analyze, references_query_missing_indexes [INFERRED 0.85]
- **Token Metering Flow: Parse, Price, Persist, Enforce** — lib_llm_parseusermessage, lib_usage_pricing_costmicrosfor, lib_usage_recordusage, lib_usage_checkquota, lib_message_pipeline_runmessagepipeline [EXTRACTED 1.00]
- **Supabase RLS and Privileged-Code Authorization Traps** — supabase_skill_views_bypass_rls, supabase_skill_update_requires_select_policy, supabase_skill_auth_role_deprecation, supabase_skill_bola_to_authenticated, supabase_skill_security_definer_bypass, supabase_skill_user_metadata_authz_trap [EXTRACTED 1.00]
- **User Blocking Enforcement Across Chat, Reminders and Admin UI** — 2026_09_08_usage_metering_and_admin_dashboard_task_1_brief_blocking_columns, 2026_09_08_usage_metering_and_admin_dashboard_task_5_brief_block_gate, 2026_09_08_usage_metering_and_admin_dashboard_final_fix_report_blocked_reminder_cancel, admin_block_toggle_blocktoggle [EXTRACTED 1.00]
- **Admin Password-Gated Session Flow** — src_middleware_middleware, lib_admin_auth_adminconfigured, lib_admin_auth_createsessiontoken, lib_admin_auth_verifysessiontoken, lib_admin_auth_passwordmatches, lib_admin_auth_hmachex, lib_admin_auth_constanttimeequal [EXTRACTED 1.00]
- **Usage Metering and Quota Enforcement Flow** — lib_message_pipeline_runmessagepipeline, lib_reminder_service_processincomingusermessage, lib_llm_parseusermessage, lib_usage_recordusage, lib_usage_checkquota, lib_usage_pricing_costmicrosfor, lib_usage_pricing_quotaverdict, specs_2026_09_08_usage_metering_and_admin_design_usage_event_model [EXTRACTED 1.00]
- **Remique Named Design Rules** — design_fired_moment_rule, design_whole_region_rule, design_green_neutral_rule, design_hairline_rule, design_one_panel_rule, design_optical_axis_rule, design_parsed_data_rule, design_script_attribution_rule, design_bare_headline_rule, design_drawn_icon_rule, design_server_complete_rule [EXTRACTED 1.00]
- **App Silos Where Personal Documents Get Buried** — public_buriedproblem_google_drive, public_buriedproblem_whatsapp, public_buriedproblem_gmail, public_buriedproblem_photos, public_buriedproblem_notes, public_buriedproblem_files [EXTRACTED 1.00]
- **Chat-Based Document Retrieval Flow** — public_buriedsolution_remique_assistant, public_buriedsolution_whatsapp_chat_retrieval, public_buriedsolution_pdf_delivery_in_chat, public_buriedproblem_scattered_documents_problem [INFERRED 0.85]
- **Remique Brand Visual Surface System (gradient + grain + mascot)** — public_herobg, public_noise, public_logo, public_herobg_green_gradient_palette, public_noise_grain_overlay [INFERRED 0.85]
- **Remique Marketing Narrative: Overload Problem to WhatsApp-Native Relief** — public_overload_tool_fragmentation, public_overload_cognitive_load_metaphor, public_opengraphbannerimage_tagline, public_opengraphbannerimage_whatsapp_ai_assistant, public_opengraphbannerimage_no_apps_to_install [INFERRED 0.85]
- **WhatsApp-Native Visual Asset System** — public_whatsappbg_chat_mimicry, public_opengraphbannerimage_mint_gradient_identity, public_opengraphbannerimage_whatsapp_ai_assistant, public_opengraphbannerimage_roveup_parent_brand [INFERRED 0.75]

## Communities (57 total, 10 thin omitted)

### Community 0 - "Reminder Service and Date Parsing"
Cohesion: 0.05
Nodes (72): replyToUser(), Scheduling Horizon Guard (30s past buffer, 3-year ceiling), validateAndNormalizeDate(), ValidatedDateResult, buildCreationConfirmation(), buildGroupedList(), buildRescheduleConfirmation(), CATEGORY_NOUNS (+64 more)

### Community 1 - "Admin Auth and AWS Webhook Topology"
Cohesion: 0.06
Nodes (47): Constant-Time Password Comparison via HMAC Digests, Read process.env at Call Time, Never via env.ts, HMAC-Signed Admin Session Token, Unconfigured Admin Surface Returns 404, Web Crypto Instead of node:crypto, Admin Middleware Gate, API Admin Routes 401 Rather Than Redirect, Per-Instance In-Memory Login Rate Limiter (+39 more)

### Community 2 - "Postgres Connections and Indexing"
Cohesion: 0.07
Nodes (48): Generated tsvector Column with GIN Index, Use tsvector for Full-Text Search, Index JSONB Columns for Efficient Querying, jsonb_path_ops vs jsonb_ops Operator Class, Configure Idle Connection Timeouts, idle_in_transaction_session_timeout, Set Appropriate Connection Limits, work_mem x max_connections Memory Budget (+40 more)

### Community 3 - "Package Dependencies"
Cohesion: 0.05
Nodes (43): dependencies, @aws-sdk/client-s3, @aws-sdk/client-sqs, @aws-sdk/s3-request-presigner, clsx, dotenv, luxon, next (+35 more)

### Community 4 - "Token Pricing and Parser Usage"
Cohesion: 0.07
Nodes (38): Task 2 Brief: Pricing and Quota Logic, Report the Daily Window First When Both Caps Are Crossed, Longest-Prefix Model Price Resolution, Pure Module With Zero Imports for Testability, Task 2 Report: Pricing and Quota Logic, Task 4 Brief: Return Usage From the Parser, Null Usage Rather Than a Zero Row on Provider Failure, ParseResult { parsed, usage } (+30 more)

### Community 5 - "Query Plans, Indexes and Vacuum"
Cohesion: 0.09
Nodes (39): Use EXPLAIN ANALYZE to Diagnose Slow Queries, Query Plan Warning Signals (Seq Scan, Rows Removed by Filter, external merge), Enable pg_stat_statements for Query Analysis, pg_stat_statements Extension, Maintain Table Statistics with VACUUM and ANALYZE, Per-Table Autovacuum Scale Factor Tuning, Create Composite Indexes for Multi-Column Queries, Leftmost Prefix Rule (equality columns before range columns) (+31 more)

### Community 6 - "Admin Build Tasks and Design Rules"
Cohesion: 0.06
Nodes (37): Task 6 Brief: Admin Session Auth, Task 6 Report: Admin Session Auth, Task 7 Brief: Middleware, Login and Logout Routes, Task 7 Report: Middleware, Login and Logout Routes, Task 8 Brief: Admin Queries, Task 8 Report: Admin Queries, Task 9 Brief: Admin User List Page, Task 9 Report: Admin User List Page (+29 more)

### Community 7 - "Landing Page Composition"
Cohesion: 0.09
Nodes (18): FEATURE_ICONS, HERO_CHAT, HomeContent(), LANGUAGE_CHAT, STEP_ICONS, HeroVideo(), HomePricing(), IconCheckCircle() (+10 more)

### Community 8 - "bKash bdApps Subscription"
Cohesion: 0.12
Nodes (25): buildBdappsAuthorizationUrl(), generateBdappsSignature(), generateRequestId(), requestIdSequence, cancelSubscription(), handleBdappsCallback(), handleBdappsWebhook(), initiateBdappsSubscription() (+17 more)

### Community 9 - "Root Layout and Language Provider"
Cohesion: 0.10
Nodes (21): bangla, cursive, display, metadata, mono, sans, viewport, LangContext (+13 more)

### Community 10 - "Admin Icon System"
Cohesion: 0.11
Nodes (15): AlertIcon(), ArrowIcon(), BellMark(), CalendarIcon(), ChevronDownIcon(), ClockIcon(), IconProps, PeopleIcon() (+7 more)

### Community 11 - "Block, Quota and Plan Controls"
Cohesion: 0.14
Nodes (13): Blocked Users Must Not Receive Reminders, Null-vs-Zero Quota Semantics, Pipeline Block Gate, BlockToggle(), button, BackIcon(), FileIcon(), PERIODS (+5 more)

### Community 12 - "Admin Query Layer"
Cohesion: 0.13
Nodes (19): Next 15 searchParams Is a Promise, Next.js Agent Rules Block, AttentionKind, composeWhere(), countListedUsers(), DashboardTotals, getDashboardTotals(), listUsers() (+11 more)

### Community 13 - "Marketing Pages and Site Chrome"
Cohesion: 0.19
Nodes (9): BillingCancelledInner(), IconArrow(), MarkWhatsApp(), Navbar(), SiteFooter(), HowItWorksPage(), STEP_ICONS, PricingPage() (+1 more)

### Community 14 - "Admin Overview Page"
Cohesion: 0.15
Nodes (15): AdminOverviewPage(), isSort(), KIND_NOTE, PERIOD_PHRASE, PERIODS, SORTS, View, PeriodControl() (+7 more)

### Community 15 - "TypeScript Compiler Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 16 - "Inbound Message Pipeline"
Cohesion: 0.14
Nodes (15): Seven-Check Pipeline Gate Ordering, normalizePhoneNumber(), claimInboundMessage(), InboundMedia, InboundMessageInput, PipelineMessage, PipelineResult, PipelineStatus (+7 more)

### Community 17 - "Prisma Client and Environment"
Cohesion: 0.15
Nodes (9): globalForPrisma, prisma (global PrismaClient singleton), Env, envSchema, _parsed, PERIODS, TIERS, parseCap() (+1 more)

### Community 18 - "Buried Documents Marketing Assets"
Cohesion: 0.15
Nodes (17): bKash Logo Asset, bKash Mobile Financial Service Brand, bKash Payment Method Option, Buried Problem Marketing Image, Files App (document silo), Gmail (document silo), Google Drive (document silo), Notes App (document silo) (+9 more)

### Community 19 - "QStash Scheduled Delivery"
Cohesion: 0.27
Nodes (12): Vercel Project Link (remique), cancelScheduledDelivery(), getQStashClient(), getReceiver(), isWithinQStashWindow(), minuteBucket(), QStashAuthResult, resolveTargetUrl() (+4 more)

### Community 20 - "Brand Positioning Imagery"
Cohesion: 0.23
Nodes (13): Remique OpenGraph Social Banner, Confirm, Schedule, Remind Interaction Loop, Mint Green Gradient Visual Identity, Trilingual Input: English, Banglish, Bangla, No Apps To Install, Roveup Parent Brand Attribution, Tagline: You shouldn't remember everything, WhatsApp AI Assistant Product Positioning (+5 more)

### Community 21 - "WhatsApp Chat Mockup Components"
Cohesion: 0.35
Nodes (6): Bubble(), ChatHeader(), ChatMessage, TypingBubble(), ChatPlayer(), Phase

### Community 22 - "FAQ and Hero Rotator"
Cohesion: 0.29
Nodes (6): FaqAccordion(), FaqItem, HeroRotator(), HomeFaq(), useCopy(), FaqPage()

### Community 23 - "Supabase Agent Skill"
Cohesion: 0.22
Nodes (10): Skill Feedback Issue Template, Supabase Skill Feedback Workflow, Supabase Agent Skill Changelog, Supabase Agent Skill, Supabase CLI Version Gotchas, Exposing a Table to the Data API, Fetch Monitoring and Debugging Docs Before Diagnosing, Supabase MCP Server Troubleshooting (+2 more)

### Community 24 - "WhatsApp Send and Logging"
Cohesion: 0.40
Nodes (8): logOutbound(), replyWithButtons(), replyWithMedia(), markReadAndShowTyping(), postToWhatsApp(), sendWhatsAppMedia(), sendWhatsAppMessage(), SendWhatsAppResponse

### Community 25 - "Recurrence and Reply Buttons"
Cohesion: 0.31
Nodes (7): nextOccurrence(), RECURRENCE_RULES, STEP, reminderActionButtons(), sendWhatsAppButtons(), sendWhatsAppTemplate(), POST()

### Community 26 - "User Detail Page Build"
Cohesion: 0.25
Nodes (8): positiveIntOr Guard for Hand-Entered Token Caps, Task 10 Brief: User Detail, Block Toggle and Quota Override, Deployment Checklist (Lambda Zips, Env Vars, DDL Review), Next 15 Async params/searchParams Promise, Inline SVG Chart Instead of a Charting Library, Task 10 Report: User Detail, Block Toggle and Quota Override, Unknown Models Charge at the Most Expensive Rate, UsageChart()

### Community 27 - "Live Thread Panel"
Cohesion: 0.29
Nodes (6): LiveThread(), ORDER, Phase, rank(), Turn, TURNS

### Community 28 - "Health Check Endpoint"
Cohesion: 0.36
Nodes (7): Backlog depth as the single alertable symptom, Free anonymous liveness, paid checks behind a secret, GET(), getTokenStatus(), isAuthorized(), checkWhatsAppToken(), WhatsAppTokenStatus

### Community 29 - "Demo Seed Script"
Cohesion: 0.36
Nodes (6): ago(), ahead(), main(), now, prisma, rand()

### Community 30 - "Final Fix Wave Findings"
Cohesion: 0.33
Nodes (7): Final Fix Wave Report, MAX_TRACKED_IPS Bound on the Attempts Map, Lambda Freeze Silently Loses Fire-and-Forget Usage Rows, PUBLIC_ADMIN_PATHS Must Include Logout, Brute-Force Limiter Keyed on a Spoofable Header, Admin Routes Are Gated Only by Middleware, Metering Must Never Fail a User's Turn

### Community 31 - "Migration Safety Rulings"
Cohesion: 0.33
Nodes (7): SDD Ledger: Usage Metering and Admin Dashboard, Accepted-As-Is Findings (Ship Without Fixing), Print the DDL With prisma migrate diff Before Any Write, Ruling: Never Run db push Against the Live Supabase Instance, Pre-flight Cross-Task Interface Conflict Scan, Do Not Use apply_migration to Iterate Locally, Declarative Schemas vs Imperative Migrations

### Community 32 - "Usage Schema and Money Model"
Cohesion: 0.29
Nodes (7): Task 1 Brief: Schema and Environment, Deliberately Unused Billing Scaffolding Columns, Cost Stored as Integer USD Micros, Denormalised Usage Totals on User, UsageEvent Model (One Row Per Paid API Call), Task 1 Report: Schema and Environment, Single Transaction Keeps Counters From Drifting

### Community 33 - "Pricing Section Component"
Cohesion: 0.29
Nodes (4): IconCheck(), IconLock(), Tier, TIERS

### Community 34 - "Brand Surface Assets"
Cohesion: 0.38
Nodes (7): Hero Background Mesh Gradient (heroBg.jpg), Remique Green Gradient Brand Palette, Remique Robot Mascot Logo (logo.png), Remique Mascot Brand Mark, Procedural Grain Texture Tile (noise.svg), Full-Viewport Film-Grain Overlay Pattern, noiseFilter feTurbulence Fractal Noise Filter

### Community 35 - "Supabase RLS Security Traps"
Cohesion: 0.38
Nodes (7): auth.role() Deprecation in Favour of the TO Clause, TO authenticated Alone Is BOLA/IDOR, Supabase Security Checklist, SECURITY DEFINER Bypasses RLS, UPDATE Requires a SELECT Policy, user_metadata Is Unsafe for Authorization, Views Bypass RLS by Default

### Community 36 - "Blocking and Quota Enforcement"
Cohesion: 0.33
Nodes (6): Quota Notice Suppression Must Match the Quota Window, User Blocking Columns (blockedAt, blockNoticeSentAt), Task 5 Brief: Enforce Blocking and Quota, Notify Once, Then Drop Silently, Pipeline Quota Gate, Task 5 Report: Enforce Blocking and Quota

### Community 37 - "Usage Bucketing for Detail Page"
Cohesion: 0.33
Nodes (6): Denormalized User Counters Avoid usage_events GroupBy, 30-Day UTC Usage Bucketing With Empty Days, usageWindow Key Naming Avoids Shadowing DOM window, bucketByDay(), getUserDetail(), UsageEvent Model

### Community 38 - "Plan Badge"
Cohesion: 0.40
Nodes (5): LOOK, PlanBadge(), planLabel(), PlanLook, PlanShape

### Community 39 - "Usage Chart and Formatting"
Cohesion: 0.33
Nodes (5): AdminUserDetailPage(), formatCost(), formatDate(), UsageDay, Money as Integer Micros

### Community 40 - "Use Cases Personas"
Cohesion: 0.33
Nodes (4): WhatsAppMockup(), PERSONA_CHATS, PersonaData, UseCasesPage()

### Community 41 - "Anchored Reminders Spec"
Cohesion: 0.40
Nodes (5): Conversational Assistant: Anchored Reminders Spec, Alert groupId Scopes Group Edits, Anchor + Offset Reminder Model, State-Changing Confirmations Stay Deterministic, WhatsApp Interactive Reply Buttons (Done / Snooze)

### Community 42 - "Usage Persistence"
Cohesion: 0.50
Nodes (4): Task 3 Brief: Persist Usage, Cached Tokens Are a Subset of Input Tokens, Task 3 Report: Persist Usage, checkQuota()

## Ambiguous Edges - Review These
- `Env` → `prisma (global PrismaClient singleton)`  [AMBIGUOUS]
  /Users/mukiturrahman/Vibe Coded Projects/remique/src/lib/db.ts · relation: conceptually_related_to
- `Remique Product Definition` → `bdApps bKash Subscription SDK Integration Guide`  [AMBIGUOUS]
  PRODUCT.md · relation: conceptually_related_to
- `bKash Payment Method Option` → `Remique Assistant Persona`  [AMBIGUOUS]
  public/bKash-Logo.png · relation: conceptually_related_to
- `Hero Background Mesh Gradient (heroBg.jpg)` → `Remique Robot Mascot Logo (logo.png)`  [AMBIGUOUS]
  public/heroBg.jpg · relation: conceptually_related_to
- `Mint Green Gradient Visual Identity` → `Native WhatsApp Chat Surface Mimicry`  [AMBIGUOUS]
  public/openGraphBannerImage.jpg · relation: conceptually_related_to

## Knowledge Gaps
- **211 isolated node(s):** `supabase`, `nextConfig`, `name`, `version`, `private` (+206 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Env` and `prisma (global PrismaClient singleton)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Remique Product Definition` and `bdApps bKash Subscription SDK Integration Guide`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `bKash Payment Method Option` and `Remique Assistant Persona`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Hero Background Mesh Gradient (heroBg.jpg)` and `Remique Robot Mascot Logo (logo.png)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Mint Green Gradient Visual Identity` and `Native WhatsApp Chat Surface Mimicry`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `prisma (global PrismaClient singleton)` connect `Prisma Client and Environment` to `Reminder Service and Date Parsing`, `bKash bdApps Subscription`, `Admin Query Layer`, `Inbound Message Pipeline`, `QStash Scheduled Delivery`, `WhatsApp Send and Logging`, `Recurrence and Reply Buttons`, `Health Check Endpoint`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `SDD Ledger: Usage Metering and Admin Dashboard` connect `Migration Safety Rulings` to `Usage Schema and Money Model`, `Blocking and Quota Enforcement`, `Supabase Agent Skill`, `User Detail Page Build`, `Final Fix Wave Findings`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._