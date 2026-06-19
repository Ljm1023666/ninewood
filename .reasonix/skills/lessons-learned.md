---
name: lessons-learned
description: >
  Run structured postmortem analysis and convert incidents into concrete preventive changes.
  Use after failures, regressions, rollback events, or when asked how to avoid repeating mistakes.
---

# Lessons Learned

Source:
- https://github.com/aplaceforallmystuff/claude-lessons-learned

## Objective

Turn incidents into durable safeguards (skill updates, checklists, scripts, or docs updates).

## Process

1. Define incident facts (what, when, impact, resolution).
2. Build timeline of actions and outcomes.
3. Run 5-Whys style root cause analysis.
4. Identify contributing factors (process, communication, technical, context).
5. Implement at least one preventive change immediately.
6. Define verification criteria for recurrence prevention.

## Fix Types

- Skill update: for recurring workflow failures.
- Guard/checkpoint: for actions requiring explicit user confirmation.
- Documentation update: for missing knowledge.
- Automation/script: for repeatedly forgotten manual steps.

## Required Output

```markdown
# Lessons Learned: [incident]

## Root Cause
[primary root cause]

## Contributing Factors
- [factor]

## Preventive Changes Implemented
- [change] in [file/path]

## Verification
- [how recurrence prevention will be tested]
```

## Rule

Do not finish with recommendations only. Implement at least one prevention artifact.
