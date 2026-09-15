---
name: threads-wiki
description: Read-only SQL access to the eoxs_frontend_threads database — the raw Claude conversation transcripts and the wiki synthesized from them. Companion to the threads-ov skill, which covers the same data via purpose-built tools.
---

# Threads Wiki Skill

This connector is **read-only raw SQL** against `eoxs_frontend_threads` — the
same underlying database that the `threads-ov` connector's purpose-built
tools (`get_claude_chat_query`, `get_chat_summary`, `search_ov2_wiki`, etc.)
read from. Use this connector when you need a query shape those tools don't
cover (custom joins, aggregation, filtering across many rows); use
`threads-ov`'s own tools first when a purpose-built one already answers the
question — they're cheaper and don't require writing SQL.

## Tools

`list_tables()` · `describe_table(table)` · `get_business_schema()` · `query(sql)`

`query` runs a single read-only `SELECT` (or `WITH … SELECT`).

## Schema

Three schemas in `eoxs_frontend_threads`:

- **`public`** — raw threads and their messages (Claude conversation transcripts)
- **`wiki`** — published/promoted pages synthesized from those threads
- **`wiki_staging`** — drafts not yet promoted (do not treat as published fact)

Call `get_business_schema()` first — it returns column types and sample
queries for the core tables, cheaper than `list_tables` + `describe_table`
per table.

## Access control

**Arbitrary SQL here is not filtered by access tier the way the
purpose-built `threads-ov` tools are.** Treat everything you read as
internal material, and answer only the question asked rather than
volunteering unrelated content you happen to see in a broader query result.

## Call efficiency

1. `get_business_schema()` once at the start of a session using this connector.
2. Write one targeted query rather than several exploratory ones — join in
   SQL rather than pulling rows and stitching them together yourself.
3. Distinguish `wiki` (published) from `wiki_staging` (draft) results when
   citing — never present a staging/draft page as settled synthesis.

## Answering

- Follow citations back to the raw thread/message when exact wording matters.
- Treat all corporate documentation and conversation content as confidential.
- Never invent a thread, page, or figure. Not found means not found.
