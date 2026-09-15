---
name: threads-ov-unified-routing
description: Unified reference for Threads OV conversation archiving. Two incompatible systems (Threads OV (file-based) vs Thread Wiki (database-backed)) run in parallel. Includes decision tree to determine which to use, full skill documentation for both, and comparison tables. Start with Part 0 (routing) to determine your system, then read the relevant section (Part 1 for Threads OV, Part 2 for Thread Wiki).
aliases: [Threads OV, conversation archiving, transcript vault, routing guide]
---

# Threads OV — Unified Skill File with System Routing

**CRITICAL:** This is TWO incompatible systems, not one. They have different save contracts, different tools, and different use cases. **Start with Part 0 to determine which system you're using.**

---

# Part 0: Which System Am I Using? (Decision Tree)

## Quick Decision Matrix

| Question | Answer → Go To |
|----------|---|
| **Do you see `checkpoint` tool available?** | Yes → Threads OV (Part 1) / No → Thread Wiki (Part 2) |
| **What does `save_chat_transcript` want?** | Full conversation content → Threads OV / Just new exchange → Thread Wiki |
| **Do you need to cross-link to OV2?** | Yes → Threads OV / No (or doing it elsewhere) → Thread Wiki |
| **Are you working in EOXS context?** | Yes → Thread Wiki / No → Threads OV |
| **Do you have access to tier-based thread reads?** | Yes → Thread Wiki / No → Threads OV |
| **Is synthesis automated?** | Yes → EOXS / No (manual) → GITHUB |

## Detailed Routing Guide

### You Use GITHUB-BACKED (Part 1) If:

- ✅ You see these tools: `checkpoint`, `save_chat_transcript`, `save_analysis`, `propose_ov2_xref`, `apply_ov2_xref`
- ✅ Your connector is labeled "claude-notes-vault" or "Threads OV" or similar
- ✅ You want to cross-link findings into OV2's wiki (CROSS-LINK workflow)
- ✅ You work standalone (not EOXS context)
- ✅ Synthesis is manual ("sync threads" = you run SYNTHESIZE workflow)
- ✅ `save_chat_transcript` asks for full conversation content

**Read: Part 1 (Threads OV)**

### You Use EOXS DATABASE-BACKED (Part 2) If:

- ✅ You see these tool sets: main server (save_chat_transcript, get_thread, list_threads), wiki_mcp (search_wiki, etc.), db_mcp (query, etc.)
- ✅ Your connector is labeled "Thread Wiki", "Frontend Threads", or shows multiple connectors
- ✅ You do NOT need to cross-link to OV2 (different system handles that)
- ✅ You work in EOXS context (alongside eoxs-db, eoxs-teams)
- ✅ Synthesis is automated (scheduled pipeline)
- ✅ `save_chat_transcript` asks for ONLY the new exchange (not full history)
- ✅ You can read other users' threads if you share department/tier

**Read: Part 2 (Thread Wiki)**

## If You're Still Unsure

**Try this test:**

Call `save_chat_transcript(thread_name="test", content="test")` or `save_chat_transcript(thread_name="test", new_messages="test")`

- If the first works → **Threads OV** (Part 1)
- If the second works → **Thread Wiki** (Part 2)

Or ask: "What does `save_chat_transcript` expect for the second parameter?" and read the answer from the error message.

---

# Part 1: Threads OV 
## Overview

File-based, git-tracked conversation archiving. Standalone system. Cross-links findings to OV2's wiki via CROSS-LINK workflow. Manual synthesis. Single-user (one per connector URL).

---

## 1.1 Mandatory Auto-Save: Full Overwrite

### Save Contract

**`save_chat_transcript(thread_name, content)`** — Call at END of every response. Overwrites entire file each time.

- **Parameter 1: `thread_name`** — stable identifier for conversation (chosen once, never change mid-conversation)
- **Parameter 2: `content`** — FULL verbatim transcript of entire conversation so far (not just new exchange)

File: `raw/claude-chat-queries/<user>_<created-date>_<thread_name>.md` (commits + pushes)

### First Turn

Choose stable `thread_name` (e.g., `askcruz-pricing-q4-2024`). Identifies conversation, not current message. Never change mid-conversation.

### Every Turn (Including First)

```
checkpoint(thread_name="<stable-name>")
save_chat_transcript(thread_name="<stable-name>", content="<FULL verbatim conversation text>")
```

**Both calls, every turn.** Checkpoint is the no-op trigger; save_chat_transcript is the actual save.

### `content` Must Be Verbatim

**WRONG:** `[Asked options; queried CRM; found invoice.]` — narrates instead of captures.

**RIGHT:** Paste complete conversation word for word, including all tables and analysis. A 2000-word response gets pasted in full.

### Three Failure Modes to Avoid

- **(a)** Save once at start, treat as covering rest — it doesn't. Every turn overwrites with new full transcript.
- **(b)** Go silent on unrelated topics — an unrelated question is not a cue to change `thread_name`.
- **(c)** Pass narrated summary instead of verbatim — thread saved this way was never really captured.

---

## 1.2 Active Tools (GitHub: 5 Total)

### Write

- **`save_chat_transcript(thread_name: str, content: str)`**
  - Overwrites `raw/claude-chat-queries/<user>_<created-date>_<thread_name>.md`
  - Commits + pushes to GitHub
  - MANDATORY: call after every response

- **`checkpoint(thread_name: str)`**
  - Returns: `"Checkpoint noted for thread '<thread_name>'."`
  - Lightweight no-op; triggers save reminder
  - MANDATORY: call at END of every turn, before save_chat_transcript
  - Do NOT skip assuming save_chat_transcript covers it

- **`save_analysis(title: str, content: str)`**
  - Saves finished write-up to `wiki/analyses/`
  - **Always ask user for explicit approval first**
  - Never auto-save

### OV2 Cross-Reference

- **`propose_ov2_xref(ov2_page_path: str, pointer_line: str, chat_summary_title: str)`**
  - Stages proposed 1–2 line cross-reference to OV2 page
  - Local staging only (`.ov2-xref-staging/`), never touches OV2 yet
  - Parameters:
    - `ov2_page_path`: e.g., `"wiki/HR/Compensation_Policy.md"`
    - `pointer_line`: exact 1–2 line text (no bullets/headers)
    - `chat_summary_title`: exact Threads OV page title

- **`apply_ov2_xref(staged_id: str)`**
  - Applies approved staged cross-reference to OV2's repo
  - **Only call after user has explicitly approved this item**
  - Requires `OV2_GITHUB_TOKEN`
  - Returns: path written or error

---

## 1.3 Workflow: CROSS-LINK (Verify → Propose → Approve → Apply)

When a chat-summary page has insight relevant to OV2.

### Step 1: Verify

Confirm OV2 page exists, covers same topic, chat-summary adds something **genuinely new** (not a restatement).

### Step 2: Draft Pointer Line

Single citation-style sentence (1–2 max):
- "This issue also came up in a Claude conversation — see Threads OV: 'Sabre Alloys AR Verification'."
- "Related discussion in Threads OV: 'Q4 Compensation Review — Retention Strategy'."

No raw content, no dates, just enough to decide if worth following.

### Step 3: Stage

```
propose_ov2_xref(
  ov2_page_path="wiki/company-operations/HR/Compensation.md",
  pointer_line="Related discussion in Threads OV: 'Q4 Compensation Review — Retention Strategy'.",
  chat_summary_title="Q4 Compensation Review — Retention Strategy"
)
```

Local only. Nothing reaches OV2 yet.

### Step 4: Present & Approve

List staged and ask user which to apply. Never assume approval from silence.

### Step 5: Apply (Only Approved)

```
apply_ov2_xref(staged_id="7")
```

Report each result individually. Never batch-apply silently.

---

## 1.4 File Structure & Synthesis

### Structure

```
claude-notes-vault/
├── raw/claude-chat-queries/     ← saved transcripts: <user>_<date>_<thread>.md
├── wiki/
│   ├── chat-summaries/          ← synthesized topic pages (manual edit)
│   └── analyses/                ← one-off analyses (via save_analysis)
├── .ov2-clone/                  ← LOCAL ONLY, OV2 working copy
└── .ov2-xref-staging/           ← LOCAL ONLY, staged cross-refs
```

### Manual SYNTHESIZE (On Demand)

When user says "sync threads" / "synthesize":

1. Identify unsynthesized transcripts (not cited in existing chat-summary `## Sources`)
2. Cluster by topic/entity, not date
3. Write/update `wiki/chat-summaries/<Title>.md`:

```markdown
---
title: "<Descriptive Title>"
type: chat-summary
sources: [raw/claude-chat-queries/<file1>.md, ...]
created: YYYY-MM-DD
updated: YYYY-MM-DD
---

# <Descriptive Title>

_One-sentence description._

## Summary
Synthesized narrative, dates, key claims.

## Tribal Knowledge Extracted
- <term/rule/workaround> — <what it means> — (source: raw/claude-chat-queries/<file>.md)

Omit only if careful read finds nothing.

## Key Points
- Specific, dated claims.

## Sources
- raw/claude-chat-queries/<file1>.md — one-line description

## Candidate OV2 Cross-References
- <entity/topic> — <why relevant to OV2>
```

4. Commit + push
5. Update `index.md`

---

## 1.5 Configuration & Identity

Multiple users connect via secrets in connector URLs:
```
https://<host>/<their-secret>/sse
```

Environment maps secrets to usernames:
```json
CLAUDE_OV_USERS={"abc123": "raj", "def456": "ayan"}
```

**Rule:** Never trust model-supplied `user` parameter. Server-side resolution via URL is only source of truth.

---

## 1.6 Quality Standards

- **Specificity**: concrete claims with dates/sources
- **Citation**: every chat-summary needs `## Sources` (not optional)
- **Tribal knowledge**: hunt for undocumented rules, informal terms, workarounds
- **Compression**: summaries are distillations, not transcripts
- **Approval**: only `save_chat_transcript` is auto; `save_analysis` and `apply_ov2_xref` need explicit approval

---

## 1.7 Guardrails

- Pointer lines to OV2: 1–2 sentences max
- Never call `apply_ov2_xref` speculatively — staging is free, applying is real
- `GITHUB_TOKEN` pushes here; `OV2_GITHUB_TOKEN` (separate) pushes to OV2
- Never trust model `user` value — URL resolution only
- Threads OV is Claude conversations only — no emails, calls, tickets, CRM

---

## 1.8 Examples

### Example 1: Save Conversation

**Turn 1:**
```
checkpoint(thread_name="askcruz-pricing-q4-2024")
save_chat_transcript(
  thread_name="askcruz-pricing-q4-2024",
  content="User: Help me think... [FULL conversation verbatim]"
)
```

**Turn 2:** (same thread_name, full transcript including new turn)
```
checkpoint(thread_name="askcruz-pricing-q4-2024")
save_chat_transcript(
  thread_name="askcruz-pricing-q4-2024",
  content="User: Help me think... [FULL conversation verbatim, now including turn 2]"
)
```

### Example 2: Propose & Apply Cross-Link

```
propose_ov2_xref(
  ov2_page_path="wiki/Product/AskCruz_Strategy.md",
  pointer_line="Pricing model discussion in Threads OV: 'AskCruz Pricing Model — Q4 2024'.",
  chat_summary_title="AskCruz Pricing Model — Q4 2024"
)
```

Present to user. After approval:
```
apply_ov2_xref(staged_id="123")
```

---

# Part 2: Thread Wiki 
## Overview

Postgres-backed, append-only conversation archiving for EOXS. Four-connector cluster (main server + wiki_mcp + db_mcp). Automated synthesis. Tier-based access. No cross-linking (github system handles that).

---

## 2.1 Save Contract: Append-Only (DIFFERENT from GitHub)

### Critical Difference from GitHub

**INCOMPATIBLE SIGNATURE:**
- **Threads OV:** `save_chat_transcript(thread_name, content)` — full overwrite
- **Thread Wiki:** `save_chat_transcript(thread_name, new_messages)` — append ONE exchange only

### EOXS Save

**`save_chat_transcript(thread_name, new_messages)`** — Append one new message row.

- **Parameter 1: `thread_name`** — stable identifier (chosen once, never change)
- **Parameter 2: `new_messages`** — ONLY newest exchange (user msg + assistant reply). NOT full history.
  - Database already has everything from prior calls
  - Append-only: each call adds one row, never destructive
  - Server-side dedup if retried with identical content

Row added to: `public.thread_messages` (identified by `thread_name` + `username`)

### Why Append-Only

The Threads OV system overwrites the entire file per save. If a buggy caller passes only the latest exchange, everything prior is silently dropped. Append-only construction prevents this — each save is a new row, never destructive. A client bug cannot drop prior messages.

### Call Pattern (Every Turn)

```
save_chat_transcript(
  thread_name="<stable-name>",
  new_messages="User: [latest message]\n\nAssistant: [latest response]"
)
```

Do NOT send full conversation history. System has it already.

### Dual-Write Path

This system runs **alongside** Threads OV. Each `save_chat_transcript` call writes to:
1. Git-tracked file in `raw/claude-chat-queries/` (backup)
2. Postgres row (primary EOXS record)

Both happen transparently.

---

## 2.2 Active Tools: 11 Total Across 4 Connectors

### Main Server (3 tools)

- **`save_chat_transcript(thread_name: str, new_messages: str)`**
  - Appends one message row to `public.thread_messages`
  - `thread_name`: stable conversation ID (never change)
  - `new_messages`: single newest exchange only (user + assistant)
  - `<user>` resolved server-side from URL (cannot override)
  - Content-based dedup on retry
  - Returns: `{thread_id, created_at, message_count}`

- **`get_thread(thread_name: str, owner_username?: str)`**
  - Returns full transcript, chronological order
  - `thread_name`: which conversation
  - `owner_username`: optional. If omitted, reads YOUR threads. If provided, reads another user's thread if you share department/tier
  - Returns: full text or "not found" (either doesn't exist or access denied — same response)
  - Access tier checked: tier mismatch returns "not found" (not auth error)

- **`list_threads()`**
  - Lists every thread visible to you: yours + anyone else's in your department/tier
  - Each entry: `{thread_name, username, created_at, message_count}`
  - Most recent first

### wiki_mcp Server (4 tools)

- **`search_wiki(query: str)`**
  - Full-text search synthesized chat-summary pages
  - Returns: ranked results with title, score, snippet

- **`get_wiki_page(title: str)`**
  - Fetch one page by exact title
  - Returns: full markdown + frontmatter

- **`list_wiki_pages()`**
  - List all synthesized pages
  - Returns: `{title, created_at, updated_at, source_thread_count}`

- **`get_source_thread(page_id: int)`**
  - Find threads that built a specific wiki page
  - Returns: `{thread_name, username, created_at}`

### db_mcp Server (4 tools)

- **`list_tables()`**
  - Show all readable tables + row counts
  - Returns: `{table_name, row_count}`

- **`describe_table(table: str)`**
  - Columns, types, constraints for one table
  - `table`: "threads", "thread_messages", "wiki.pages", etc.

- **`get_business_schema()`**
  - Schema overview + starter query examples
  - **Call once at session start**

- **`query(sql: str)`**
  - Execute read-only SELECT (or WITH ... SELECT)
  - Auto-capped: 1000 rows, 30-second timeout
  - No writes (read-only account)
  - Returns: result set as JSON rows
  - **Use starter queries from `get_business_schema()` as templates**

---

## 2.3 Database Schema & Common Queries

### Call `get_business_schema()` First

One call returns overview + working starter queries. Edit WHERE clause for your needs.

### Key Tables

- **`public.threads`**: `id, username, thread_name, created_at, access_tier`
- **`public.thread_messages`**: `id, thread_id, username, content, created_at, role` (user/assistant)
- **`wiki.pages`**: `id, title, body, body_tsv` (full-text), `created_at, updated_at`
- **`wiki.page_threads`**: `page_id, thread_id` (links pages to sources)
- **`wiki_staging.pages`**: Drafts. Columns include `status` (draft/reviewed/promoted/rejected)

### Recipe Examples

**Search by content:**
```sql
SELECT t.id, t.username, t.thread_name, t.created_at::date AS d
FROM threads t 
JOIN thread_messages m ON m.thread_id = t.id
WHERE m.content ILIKE '%toll processing%'
ORDER BY t.created_at DESC
LIMIT 10;
```

**Read full conversation:**
```sql
SELECT string_agg(content, E'\n' ORDER BY created_at, id)
FROM thread_messages 
WHERE thread_id = 42;
```

**Search synthesized wiki (full-text):**
```sql
SELECT id, title, ts_rank(body_tsv, q) AS rank
FROM wiki.pages, websearch_to_tsquery('english', 'sabre compensation') q
WHERE body_tsv @@ q 
ORDER BY rank DESC;
```

If `websearch_to_tsquery` returns zero rows, retry with:
```sql
... to_tsquery('english', 'sabre | compensation | strategy') ...
```

---

## 2.4 Access Control & Tiers

### Per-User Setup

Multiple users connect via secrets:
```
https://<host>/<their-secret>/sse
```

Environment maps secrets to usernames:
```json
FRONTEND_THREAD_USERS={"abc123": "raj", "def456": "ayan"}
```

### Access Tiers

Threads stamped with `access_tier` at creation (inherited from saving user's tier):

- **`tier1` (personal)**: Only Raj can read his own tier1 threads
- **`tier2` / `tier2_confidential` (departmental)**: User can read every thread from anyone in same department

Tier set once, never changes on later appends.

### Confidentiality

- **Amounts & monitoring data stripped upstream** (see eoxs-data-general skill). Archive cannot expose them.
- **Archiving is internal record-keeping**, not disclosure. EOXS infrastructure.
- **Username resolved server-side**, cannot be overridden. Cannot be misattributed.

---

## 2.5 Automated Synthesis Pipeline

### How It Works

Scheduled process:
1. Identifies unsynthesized threads (not cited in any wiki page)
2. Clusters by topic/entity
3. Drafts pages into `wiki_staging.pages` with status='draft' or 'reviewed'
4. Second agent reviews; approved → status='promoted' (visible in `wiki.pages`)
5. Rejected → status='rejected' in staging — **never quote rejected pages**

### You Don't Run It By Hand

Pipeline is automatic. Check status:

```sql
-- Current state of drafts
SELECT status, count(*) FROM wiki_staging.pages GROUP BY status;

-- Uncited threads waiting for pipeline
SELECT count(*) FROM threads t
LEFT JOIN (
  SELECT DISTINCT thread_id FROM wiki_staging.page_threads pt
  JOIN wiki_staging.pages p ON p.id = pt.page_id
  WHERE p.status IN ('promoted', 'draft', 'reviewed')
) d ON d.thread_id = t.id
WHERE d.thread_id IS NULL;
```

### Timing

~15-minute lag between save and database availability (sync job). Do not save and immediately query — it won't be there yet.

---

## 2.6 Four-Connector Architecture

| Connector | Server | Purpose | Tools |
|-----------|--------|---------|-------|
| **main** | `mcp_server.py` | Save + read transcripts | save_chat_transcript, get_thread, list_threads |
| **wiki_mcp** | `wiki_mcp/server.py` | Search/fetch synthesis | search_wiki, get_wiki_page, list_wiki_pages, get_source_thread |
| **db_mcp** | `db_mcp/server.py` | Raw SQL queries | list_tables, describe_table, get_business_schema, query |
| **(optional)** | filesystem sync | Backup to git | n/a |

Each connector has its own secret in the URL. All four mounted separately.

### Recommended Usage

- **Save?** → `save_chat_transcript` (main)
- **Read full convo?** → `get_thread` (main, faster) OR `query()` (db_mcp, flexible)
- **Search wiki?** → `search_wiki` (wiki_mcp)
- **Custom SQL?** → `query()` (db_mcp) — call `get_business_schema()` first

---

## 2.7 Workflow Patterns

### "What did we talk about X?"

```sql
SELECT t.id, t.username, t.thread_name, t.created_at::date AS d
FROM threads t
JOIN thread_messages m ON m.thread_id = t.id
WHERE m.content ILIKE '%sabre%' 
  AND (m.content ILIKE '%compensation%' OR m.content ILIKE '%structure%')
ORDER BY t.created_at DESC
LIMIT 5;
```

Then read full convo:
```sql
SELECT string_agg(content, E'\n' ORDER BY created_at, id)
FROM thread_messages 
WHERE thread_id = <id>;
```

### "Search synthesis pages"

```
search_wiki("Q4 planning budget strategy")
```

Then fetch:
```
get_wiki_page(title="<exact-title-from-search>")
```

### "Check pipeline status"

```sql
SELECT status, count(*) FROM wiki_staging.pages GROUP BY status;
```

---

## 2.8 Guardrails

- **No cross-linking to OV2** (github system's job)
- **Append-only writes only** — each call adds row, never destructive
- **db_mcp is read-only** — no UPDATE/DELETE via query()
- **Threads OV is Claude conversations only** — no emails, calls, tickets, CRM
- **Tier set once at thread creation**, never changes on later appends
- **"Not found" is ambiguous** — either doesn't exist or no access. Never probe boundaries.
- **No model-supplied identity** — server resolves username from URL

---

## 2.9 Examples

### Save & Search

**Turn 1:**
```
save_chat_transcript(
  thread_name="q4-2026-planning",
  new_messages="User: Save our discussion... \n\nAssistant: I'll save this..."
)
```

**Then search:**
```sql
SELECT t.id, t.username, t.thread_name, t.created_at::date
FROM threads t
JOIN thread_messages m ON m.thread_id = t.id
WHERE m.content ILIKE '%q4%planning%' 
   OR m.content ILIKE '%budget%planning%'
ORDER BY t.created_at DESC
LIMIT 10;
```

---

# Part 3: Comparison & Troubleshooting

## System Comparison

| Aspect | Threads OV | Thread Wiki |
|--------|--------|------|
| **Save contract** | `(thread_name, content)` full overwrite | `(thread_name, new_messages)` append |
| **Checkpoint tool** | Yes (exists) | No (not needed) |
| **Cross-linking to OV2** | Yes (CROSS-LINK workflow) | No (github system handles) |
| **Synthesis** | Manual (on-demand) | Automated (scheduled) |
| **Storage** | Git markdown + database | Postgres append-only |
| **Read tools** | File-based (deprecated) | SQL queries + wiki search |
| **Access control** | Single-user per URL | Tier-based (tier1/tier2) |
| **Context** | Standalone | EOXS-specific |
| **Lag** | Immediate (git) | ~15 min (sync) |
| **Total tools** | 5 | 11 |

## "I'm Confused — Which System Am I Using?"

**Test 1: What tools do you see?**
- Only: `save_chat_transcript`, `checkpoint`, `save_analysis`, `propose_ov2_xref`, `apply_ov2_xref` → **Threads OV**
- Multiple connectors with 11+ tools (main, wiki_mcp, db_mcp) → **Thread Wiki**

**Test 2: Try calling `save_chat_transcript` with different parameters:**
```
save_chat_transcript(thread_name="test", content="test")
```
Works? → **Threads OV**

```
save_chat_transcript(thread_name="test", new_messages="test")
```
Works? → **Thread Wiki**

**Test 3: Does your connector URL include a "secret" that's different from other users' URLs?**
- Yes → **Thread Wiki** (per-user secrets)
- No, single URL → **Threads OV**

---

## Common Mistakes

### "I Saved to GitHub System But It's Not In EOXS Queries"

Two separate systems. Saves to one do NOT automatically appear in the other (though dual-write path tries to sync them). Check you're querying the right system.

### "I'm Using EOXS But Calling `checkpoint` — Error!"

`checkpoint` exists in Threads OV system only. EOXS doesn't need it (append-only design). Remove that call if using EOXS.

### "I Called `save_chat_transcript` with Full Content But It Only Saved Last Exchange"

You're using EOXS. EOXS expects ONLY the new exchange (`new_messages`), not full content. Edit to pass just the newest user + assistant messages.

### "I Called `save_chat_transcript` with Just New Exchange But It Dropped Prior Messages"

You're using GitHub. GitHub expects FULL content each time. Edit to pass entire conversation verbatim.

### "I Tried to Cross-Link But Got Error"

Cross-linking is Threads OV system only. If using EOXS, you cannot call `propose_ov2_xref` / `apply_ov2_xref`. Document findings in your own notes or contact github-based system owner.

### "A Wiki Page Has Status='rejected' — Can I Quote It?"

EOXS system: **Never quote rejected pages.** They're drafts a reviewer refused. Only quote status='promoted' pages (visible in `wiki.pages`).

---

## Troubleshooting by System

### GITHUB System

**"I saved but it's not searchable"**
- Confirm the commit was pushed (`git log` on the repo)
- File-based read tools are deprecated; archive has no search (use database if available)

**"Can I delete or edit a saved transcript?"**
- No tool for it. Edit on disk manually and commit/push if needed. Files are meant immutable once written.

**"Cross-link is failing with auth error"**
- `OV2_GITHUB_TOKEN` is missing or invalid. Configuration gap, not a workaround.

### EOXS System

**"I saved but can't query immediately"**
- Expected. ~15-minute lag. Do not re-save. Wait and retry.

**"Query returned zero rows but I'm sure the data exists"**
- Check tier: if you don't share the thread's tier, it's invisible (returns "not found").
- Adjust WHERE clause: try broader criteria.
- Call `list_threads()` first to confirm it exists.

**"Can I edit or delete a message?"**
- No. Append-only means immutable. Clarify in next message if needed. Rows are permanent.

---

## Session Start Checklist

1. **Read Part 0 above** — determine which system you're using
2. **Read the relevant part** (Part 1 for Threads OV, Part 2 for Thread Wiki)
3. **Do not narrate setup** — just start using the correct system

---

# Part 4: Standing Instruction — Auto-Fetch Data Sources

**For all Claude instances connected to OV vault + AskCruz**

---

## When Answering Questions About Customers, Products, or Entities

**Follow this order automatically (do not wait for user to ask):**

### 1. Check Threads First
- Search Thread Testing MCP: `list_threads()` for entity mentions
- Search Threads-OV MCP: team-tier threads
- Extract: what was actually said, when, context
- Tool: `list_threads()` + grep for entity code/name

### 2. Then Check Wiki
- Search synthesized pages: `search_wiki(entity)`
- Extract: prior analysis, strategy notes, known issues
- Tool: `search_wiki()` from Threads OV

### 3. Pull Data From All Sources
- Do not stop after threads + wiki
- Also check: calls, emails, customer records, usage docs
- Merge all findings before answering
- Cite which source provided each claim

---

## Configuration

```yaml
data_sources:
  enabled: true
  auto_fetch: true
  
  fetch_order:
    1: "threads"
    2: "wiki"
    3: "calls"
    4: "emails"
    5: "customer_records"
    6: "usage_docs"
  
  behavior: |
    - Always check threads first
    - Always check wiki second
    - Fetch from all sources simultaneously
    - Do not require explicit user request
    - Merge and cite all findings
    - Surface conflicts (if any source disagrees)
  
  scope: "universal"
  applies_to: "all Claude instances using this vault"
```

---

## Quick Checklist Before Answering

**Before answering ANY entity question:**

- [ ] Threads checked? (`list_threads()` + grep)
- [ ] Wiki checked? (`search_wiki()`)
- [ ] All sources merged?
- [ ] Sources cited?

**Do not answer without checking threads + wiki first.**

---

## Entity Questions (Auto-Fetch Applies)

✅ "What should we tell [CUSTOMER]?"  
✅ "Is [PRODUCT] pricing competitive?"  
✅ "What's [CUSTOMER]'s pain point?"  
✅ "Should we pursue [PROJECT]?"  
✅ "What did [CUSTOMER] say about Claude?"  

❌ Does NOT apply to: technical questions, code reviews, general explanations

---

**Last Updated:** September 11, 2026  
**Scope:** Both Threads OV systems (GitHub + EOXS) + Standing auto-fetch instruction  
**Reference:** 5 (GitHub) + 11 (EOXS) core tools + auto-data-source-discovery
