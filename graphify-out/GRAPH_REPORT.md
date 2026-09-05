# Graph Report - .  (2026-09-04)

## Corpus Check
- Corpus is ~43,360 words - fits in a single context window. You may not need a graph.

## Summary
- 303 nodes · 538 edges · 15 communities (14 shown, 1 thin omitted)
- Extraction: 90% EXTRACTED · 9% INFERRED · 1% AMBIGUOUS · INFERRED: 50 edges (avg confidence: 0.86)
- Token cost: 287,704 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Dependency Manifest|Dependency Manifest]]
- [[_COMMUNITY_Neon Functions & AI Gateway|Neon Functions & AI Gateway]]
- [[_COMMUNITY_Health Probe & Env Config|Health Probe & Env Config]]
- [[_COMMUNITY_Message Pipeline & Reminder Service|Message Pipeline & Reminder Service]]
- [[_COMMUNITY_Landing Page & Icons|Landing Page & Icons]]
- [[_COMMUNITY_Neon Storage, Branches & Egress|Neon Storage, Branches & Egress]]
- [[_COMMUNITY_Design System & Agent Rules|Design System & Agent Rules]]
- [[_COMMUNITY_Webhook Ingest & Failure Triage|Webhook Ingest & Failure Triage]]
- [[_COMMUNITY_TypeScript Compiler Config|TypeScript Compiler Config]]
- [[_COMMUNITY_Date Normalizer & Test Suites|Date Normalizer & Test Suites]]
- [[_COMMUNITY_Gemini Parser & Prompt|Gemini Parser & Prompt]]
- [[_COMMUNITY_Root Layout & Fonts|Root Layout & Fonts]]
- [[_COMMUNITY_Vercel Region Config|Vercel Region Config]]

## God Nodes (most connected - your core abstractions)
1. `runMessagePipeline()` - 18 edges
2. `neon-functions Skill` - 18 edges
3. `neon Skill (Overview)` - 17 edges
4. `compilerOptions` - 16 edges
5. `Env` - 15 edges
6. `prisma (global PrismaClient singleton)` - 14 edges
7. `POST()` - 12 edges
8. `parseReminderWithGemini()` - 12 edges
9. `processIncomingUserMessage()` - 12 edges
10. `scripts` - 10 edges

## Surprising Connections (you probably didn't know these)
- `The Server-Complete Rule` --semantically_similar_to--> `Cross-Isolate Fan-Out Strategies`  [INFERRED] [semantically similar]
  DESIGN.md → .agents/skills/neon-functions/SKILL.md
- `Zero Friction Is the Product` --semantically_similar_to--> `One Credential, Model Portability`  [INFERRED] [semantically similar]
  PRODUCT.md → .agents/skills/neon-ai-gateway/SKILL.md
- `nextConfig` --conceptually_related_to--> `POST()`  [AMBIGUOUS]
  next.config.ts → src/app/api/webhooks/whatsapp/route.ts
- `Deploy region pinned to sin1` --conceptually_related_to--> `POST()`  [INFERRED]
  vercel.json → src/app/api/jobs/sweep/route.ts
- `Live Gemini extraction harness` --conceptually_related_to--> `Env`  [INFERRED]
  tests/test-gemini-live.ts → src/lib/env.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Inbound message reliability pipeline (inline answer, QStash retry, sweeper replay, health backlog)** — whatsapp_route_post, whatsapp_route_processinline, whatsapp_route_handofftoqstash, process_message_route_post, sweep_route_post, health_route_get [EXTRACTED 1.00]
- **Reminder state machine (SCHEDULED → PROCESSING → SENT/FAILED, with sweeper unwedging)** — send_reminder_route_post, send_reminder_route_atomic_claim, send_reminder_route_failure_class_triage, sweep_route_post, sweep_route_qstash_window_deferral, health_route_backlog_depth_metric [EXTRACTED 1.00]
- **Impeccable design system (contract, tokens, fonts, icons, motion moment)** — app_layout_direction_contract, tailwind_config_theme, app_layout_rootlayout, components_icons_iconset, components_live_thread_livethread, app_page_homepage [INFERRED 0.85]
- **Single-invocation inbound WhatsApp reply flow** — lib_message_pipeline_runmessagepipeline, lib_whatsapp_markreadandshowtyping, lib_reminder_service_processincomingusermessage, lib_gemini_parsereminderwithgemini, lib_date_normalizer_validateandnormalizedate, lib_whatsapp_sendwhatsappmessage [EXTRACTED 1.00]
- **Reminder scheduling durability and sweeper fallback** — lib_reminder_service_schedulereminderdelivery, lib_qstash_scheduledelayedreminder, lib_qstash_iswithinqstashwindow, lib_qstash_qstash_max_delay_ms, lib_qstash_sweeper_deferral [EXTRACTED 1.00]
- **Failure classification and replayability policy** — lib_whatsapp_whatsappapierror, lib_whatsapp_failureclass, lib_whatsapp_meta_error_code_taxonomy, lib_message_pipeline_recordfailure, lib_message_pipeline_pipelineresult [EXTRACTED 1.00]
- **Streaming AI Agent Hosted on Neon** — neon_functions_skill_neon_function, neon_ai_gateway_skill_ai_gateway, neon_ai_gateway_skill_ai_sdk_provider, references_ai_sdk_streaming_agent, neon_object_storage_skill_object_storage, neon_functions_skill_agent_backend_direct_client [EXTRACTED 1.00]
- **Branch-Scoped Provisioning via neon.ts** — neon_skill_neon_ts, neon_skill_parse_env, neon_ai_gateway_skill_gateway_env_vars, neon_functions_skill_function_env_vars, neon_object_storage_skill_s3_env_vars, neon_skill_branch_first_dev_flow [EXTRACTED 1.00]
- **Remique Product and Visual Identity** — product_remique, product_language_wedge, design_lit_room, design_live_thread_panel, design_fired_moment_rule [INFERRED 0.85]

## Communities (15 total, 1 thin omitted)

### Community 0 - "Dependency Manifest"
Cohesion: 0.05
Nodes (36): dependencies, clsx, dotenv, @google/genai, luxon, next, @prisma/client, react (+28 more)

### Community 1 - "Neon Functions & AI Gateway"
Cohesion: 0.10
Nodes (35): neon-ai-gateway Skill, @neon/ai-sdk-provider, Gateway Dialect Routes (/v1, /openai/v1, /anthropic, /gemini), NEON_AI_GATEWAY_TOKEN / _BASE_URL, Mastra neon/<model> Magic String, /v1/models Live Catalog Endpoint, neon-functions Skill, Client-Direct Agent Backend Pattern (+27 more)

### Community 2 - "Health Probe & Env Config"
Cohesion: 0.12
Nodes (28): Vercel Project Link (remique), Backlog depth as the single alertable symptom, Free anonymous liveness, paid checks behind a secret, GET(), getTokenStatus(), isAuthorized(), globalForPrisma, Env (+20 more)

### Community 3 - "Message Pipeline & Reminder Service"
Cohesion: 0.13
Nodes (26): prisma (global PrismaClient singleton), loadPipelineMessage(), PipelineResult, PipelineStatus, recordFailure(), runMessagePipeline(), Single Shared Reply Implementation (webhook + QStash replay), Sweeper Deferral for Out-of-Window Reminders (+18 more)

### Community 4 - "Landing Page & Icons"
Cohesion: 0.10
Nodes (29): Impeccable direction contract (seed 14713d86), RootLayout(), capabilities, HomePage(), steps, timeWords, WhatsAppButton(), IconArrow() (+21 more)

### Community 5 - "Neon Storage, Branches & Egress"
Cohesion: 0.11
Nodes (31): Neon AI Gateway, Plan and Model-Catalog Gating, Neon Function, CDN-in-Front and Static-Hosting Boundary, Neon Object Storage, neon-postgres-branches Skill, CLI-First Tool Selection Order, Normal Branch (+23 more)

### Community 6 - "Design System & Agent Rules"
Cohesion: 0.11
Nodes (21): .vercel Folder README, AGENTS.md (Next.js Agent Rules), Next.js Agent Rules Block, CLAUDE.md (Project Instructions), DESIGN.md (Remique Design System), The Fired-Moment Rule, The Hairline Rule, The Lit Room (Creative North Star) (+13 more)

### Community 7 - "Webhook Ingest & Failure Triage"
Cohesion: 0.14
Nodes (17): PipelineMessage, nextConfig, Build/Postinstall runs prisma generate, remique package manifest, POST(), Retryable-only 500s to bound QStash backoff, Atomic reminder claim via conditional updateMany, permanent/operator/transient failure triage (+9 more)

### Community 8 - "TypeScript Compiler Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 9 - "Date Normalizer & Test Suites"
Cohesion: 0.27
Nodes (9): Date Normalizer & Validator test suite, E2E Natural Language Parser Logic test suite, normalizePhoneNumber(), Scheduling Horizon Guard (30s past buffer, 3-year ceiling), validateAndNormalizeDate(), ValidatedDateResult, Optimistic Attempt Claim (double-reply guard), QSTASH_MAX_DELAY_MS (7-day holding window) (+1 more)

### Community 10 - "Gemini Parser & Prompt"
Cohesion: 0.26
Nodes (10): Swappable GEMINI_MODEL (reply-latency budget), Banglish / Bengali Temporal Mappings Prompt, parseReminderWithGemini(), Gemini Structured responseSchema, Unknown-Intent Fallback on Gemini Failure, Per-User Hourly Rate Ceiling (MAX_MESSAGES_PER_HOUR), Live Gemini extraction harness, main() (+2 more)

### Community 11 - "Root Layout & Fonts"
Cohesion: 0.29
Nodes (6): bangla, display, metadata, mono, sans, viewport

## Ambiguous Edges - Review These
- `nextConfig` → `POST()`  [AMBIGUOUS]
  next.config.ts · relation: conceptually_related_to
- `Env` → `prisma (global PrismaClient singleton)`  [AMBIGUOUS]
  src/lib/db.ts · relation: conceptually_related_to
- `remique package manifest` → `Neon agent-skills lockfile`  [AMBIGUOUS]
  skills-lock.json · relation: conceptually_related_to

## Knowledge Gaps
- **87 isolated node(s):** `name`, `version`, `private`, `dev`, `build` (+82 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `nextConfig` and `POST()`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Env` and `prisma (global PrismaClient singleton)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `remique package manifest` and `Neon agent-skills lockfile`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `POST()` connect `Message Pipeline & Reminder Service` to `Health Probe & Env Config`, `Landing Page & Icons`, `Webhook Ingest & Failure Triage`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Why does `Formatted()` connect `Landing Page & Icons` to `Message Pipeline & Reminder Service`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `runMessagePipeline()` (e.g. with `loadPipelineMessage()` and `enqueueInboundMessage()`) actually correct?**
  _`runMessagePipeline()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _102 weakly-connected nodes found - possible documentation gaps or missing edges._