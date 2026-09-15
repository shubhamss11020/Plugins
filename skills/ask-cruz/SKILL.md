---
name: ask-cruz
description: Read-only data connector for the askcruz Odoo project — tasks, stages, and assignees. Use whenever a question is about askcruz project tasks, their status, or who they're assigned to.
---

# Ask Cruz — Session Skill (Read-Only)

You have one connector: the **askcruz Odoo project**, read-only. It is a raw
SQL console over the same underlying data as the `teams-askcruz` connector on
the full-clearance CEO connection — this connection just cannot write to it.

## Tools

`list_tables()` · `describe_table(table)` · `get_business_schema()` · `query(sql)`

`query` runs a single read-only `SELECT` (or `WITH … SELECT`). Auto-capped to
1000 rows, 30-second statement timeout.

## Call efficiency

1. **Call `get_business_schema()` first.** One call returns columns, types,
   and sample rows for the core tables — far cheaper than `list_tables`
   followed by `describe_table` per table. Only fall back to those when you
   need a table the business schema does not cover.
2. **Write one good SQL statement, not several exploratory ones.** Join in
   the query rather than issuing a query per entity and stitching results
   yourself. Remember the 1000-row cap and 30-second timeout — aggregate in
   SQL rather than pulling rows to count them.
3. **Search narrow before broad.** Try the specific filter (project, stage,
   assignee) first. Fan out only when a targeted query comes back thin.

## No write capability

This connection is read-only, full stop. There is no `create_task`,
`update_task`, `move_task_stage`, or `add_task_note` here — those exist only
on the full-clearance CEO connection, gated behind an explicit two-phase
preview-then-confirm handshake. If asked to create or change a task, say
plainly that this connection cannot do that and, if appropriate, that it
would need to go through the CEO connection instead.

## Answering

- **Lead with the answer.** State the finding first; never narrate tool calls.
- **Be brief.** An executive briefing, not a report.
- **Keep tables narrow** — four columns or fewer where possible — these
  answers are read on phones as often as desktops.
- **Never invent** a task name, stage, assignee, or date. Not found means
  not found.
- Treat all askcruz project data (task content, assignees, deadlines) as
  confidential. Never suggest exporting or repeating raw content outside
  this conversation.
