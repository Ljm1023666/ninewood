---
name: systematic-debugging
description: >
  Structured debugging workflow for reproduce-isolate-hypothesize-verify cycles.
  Use when troubleshooting runtime bugs, regressions, flaky behavior, or environment-specific failures.
---

# Systematic Debugging

Source:
- https://github.com/spencerpauly/awesome-cursor-skills
- `resources/systematic-debugging/SKILL.md`

## 1) Reproduce first

- Capture exact reproduction steps.
- Record expected behavior vs actual behavior.
- Confirm reproducibility and frequency.
- Record environment details: OS, runtime versions, browser/Electron, and database state.

If the issue cannot be reproduced reliably, gather more evidence before changing code.

## 2) Isolate the failing area

### Binary search the system
- Disable or bypass half of the path and retest.
- Narrow down by layer: frontend, backend, database, network.

### Use git history for regressions
```bash
git bisect start
git bisect bad
git bisect good <known-good-commit>
# test midpoint commit, then mark:
git bisect good
# or:
git bisect bad
git bisect reset
```

### Layer checks
- Frontend: verify Network + Console.
- API: validate behavior using `curl` on the same endpoint.
- Database: query directly and trace transformed fields.
- UI component: isolate with a minimal render harness.

## 3) Form a testable hypothesis

Use a precise statement:
- "The bug is caused by X because evidence Y."

Avoid vague claims. Every hypothesis must be falsifiable.

## 4) Run the smallest possible test

- Add minimal logs or breakpoints at the suspected point.
- Verify only the values required by the hypothesis.
- If disproven, return to isolation instead of patching blindly.

## 5) Apply minimal fix and verify

- Fix the root cause, not the visible symptom.
- Re-run original reproduction steps.
- Perform nearby regression checks.
- Add the smallest viable regression test (unit, integration, or E2E).

## Common bug patterns

- Off-by-one: pagination, date ranges, indices.
- Null or undefined: missing guards or initialization.
- Race condition: async ordering issues.
- Stale closure in React effects/callbacks.
- Missing `await` in async code paths.
- Environment mismatch between local and CI/production.

## Operating rules

- No conclusion without evidence.
- If no progress in 15 minutes, return to isolation.
- Log attempted steps and outcomes to avoid repeated dead ends.
