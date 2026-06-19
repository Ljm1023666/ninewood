---
name: session-memory-loop
description: >
  End-of-session memory loop that compresses context and stores learnings in durable project memory files.
  Use when wrapping up work, handing off, or preparing for the next session.
---

# Session Memory Loop

This skill operationalizes continuity across sessions using local markdown memory artifacts.

## Memory Files

- `.claude/memory/SESSION-ANCHOR.md` (current compact state)
- `.claude/memory/MEMORY.md` (curated long-term constraints and stable decisions)
- `.claude/memory/LEARNINGS.md` (append-only lessons and recurring error patterns)

## End-of-Session Procedure

1. Run a short retrospective:
   - What was attempted
   - What was completed
   - What failed and why
2. Compress state into `SESSION-ANCHOR.md` using the structured template.
3. Append durable lessons to `LEARNINGS.md`:
   - one-line mistake pattern
   - one-line prevention rule
4. If a stable project rule changed, update `MEMORY.md`.
5. Return a startup note for next session:
   - "Open SESSION-ANCHOR first"
   - "Execute first next-step item"

## Startup Procedure (next session)

Before implementing:
1. Read `SESSION-ANCHOR.md`.
2. Read latest block in `LEARNINGS.md`.
3. Validate planned action against known constraints in `MEMORY.md`.

## Quality Bar

- Entries must be concrete and verifiable.
- Avoid vague phrases like "be more careful".
- Convert repeated mistakes into explicit guardrails.
