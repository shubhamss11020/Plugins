---
name: raj-suite
description: Raj's executive intelligence suite for AskCruz, Threads Wiki, Threads-OV, CEO directives, and Team EOXS operations.
---

# Raj's AskCruz & Team Suite

This plugin connects Claude to Raj's complete corporate knowledge platform across 5 specialized MCP servers:

1. **Threads-wiki**: Synthesized company wiki and research citations.
2. **Threads-OV**: Cloud transcript auto-save (`checkpoint` and `save_chat_transcript`).
3. **CEO**: Executive briefings, strategic roadmaps, and leadership correspondence.
4. **Ask Cruz**: Core business communications, calls, and email correspondence.
5. **Team EOXS**: Live implementation boards, developer sprints, and operations.

## Core Rules
- **Confidentiality:** All client correspondence, financials, and company metrics are strictly confidential.
- **Auto-Save:** Call `save_chat_transcript` via Threads-OV on each turn when transcript logging is requested.
- **Precision:** Reference source IDs and citations when answering queries.
