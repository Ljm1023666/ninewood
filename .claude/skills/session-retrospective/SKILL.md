---
name: session-retrospective
description: >
  Generate a structured end-of-session retrospective with outcomes, mistakes, fixes, and reusable techniques.
  Use when asked for session summary, retrospective, lessons learned, or what went wrong.
---

# Session Retrospective

Sources:
- https://github.com/accidentalrebel/claude-skill-session-retrospective
- https://github.com/bitwarden/ai-plugins (retrospecting skill)

## Goal

Create a concise retrospective that can be reused in future sessions.

## Workflow

1. Summarize session goals and what was completed.
2. List major problems, exact errors, and how each was resolved.
3. Capture mistakes and corrections (assumption failures, sequencing mistakes, tool misuse).
4. Extract 3-5 transferable techniques worth reusing.
5. Produce a short "next session bootstrap" section.

## Output Template

```markdown
# Session Retrospective: [title]

## Goal
[What this session tried to achieve]

## Completed
- [result 1]
- [result 2]

## Problems and Fixes
- [problem/error] -> [root cause] -> [fix]

## Mistakes and Corrections
- [mistake] -> [correction]

## Reusable Techniques
- [technique]: [when to use]

## Next Session Bootstrap
- Resume from: [state]
- First action: [next step]
```

## Quality Rules

- Use concrete evidence: command names, file paths, and error messages.
- Keep it short and actionable.
- Prefer root causes over symptoms.
