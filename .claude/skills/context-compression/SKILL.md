---
name: context-compression
description: >
  Compress long session context into structured summaries that preserve artifact trails.
  Use when sessions become long, token usage grows, or continuity across sessions is required.
---

# Context Compression

Source:
- https://github.com/muratcankoylan/agent-skills-for-context-engineering

## Core Principle

Optimize for **tokens per task**, not tokens per request.  
Do not over-compress if it causes expensive re-discovery.

## Compression Schema (must preserve)

```markdown
## Session Intent
[current objective]

## Files Modified
- [path]: [specific change]

## Decisions Made
- [decision]: [rationale]

## Errors and Fixes
- [exact error] -> [fix]

## Current State
[what is done / what is pending]

## Next Steps
1. [next step]
```

## Hard Requirements

- Keep exact file paths and identifiers verbatim.
- Keep exact error messages or codes when available.
- Preserve explicit user constraints and preferences.
- Merge incremental updates; do not regenerate summary from scratch every time.

## Anti-Patterns

- Dropping file paths or replacing them with generic descriptions.
- Omitting root-cause decisions.
- Keeping verbose tool output while losing final outcomes.
