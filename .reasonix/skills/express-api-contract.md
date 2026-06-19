---
name: express-api-contract
description: >
  API contract skill for Express services with clear request validation, response shapes, and error codes.
  Use when adding or changing server routes, DTO fields, backend validation, or frontend-backend contract updates.
---

# Express API Contract

Use this skill to keep API behavior predictable across `server/` and `client-react/`.

## 1) Contract-first change flow

When changing an endpoint:
1. Define request and response shape first.
2. Update runtime validation on the server boundary.
3. Keep route handlers thin and move business logic to services.
4. Update frontend API client types and usage paths.
5. Verify backward compatibility or document breaking changes.

## 2) Request validation rules

- Validate `params`, `query`, and `body` at the route boundary.
- Reject malformed input with explicit 4xx errors.
- Do not trust client-provided IDs, roles, or ownership fields without authorization checks.
- Normalize and sanitize inputs where needed (trim strings, handle empty values explicitly).

## 3) Response shape rules

- Return stable, documented JSON structure.
- Keep field names consistent with existing API conventions.
- Avoid leaking internal fields (database internals, stack traces, secrets).
- Keep success and error payloads distinct and machine-readable.

## 4) Error contract

Use consistent status codes and an explicit payload schema.

Recommended error payload:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Readable summary",
    "details": []
  }
}
```

Guidelines:
- `400`: malformed request format
- `401`: unauthenticated
- `403`: authenticated but forbidden
- `404`: resource not found
- `409`: conflict (duplicate, state conflict)
- `422`: semantic validation failure
- `500`: unexpected internal failure (without internal leakage)

## 5) Data and persistence safety

- Use Prisma transactions for multi-step writes requiring atomicity.
- Enforce ownership checks before mutation operations.
- Do not let database errors bubble raw to clients.
- Map DB exceptions to stable API error codes.

## 6) Frontend sync checklist

For every contract change:
- Update API layer in `client-react/src/api/`.
- Update TypeScript types used by stores and views.
- Handle new error codes in UI states where relevant.
- Confirm loading/empty/error states still render correctly.

## 7) Verification checklist

- Route-level validation test added or updated.
- Success response shape verified.
- Error response shape verified.
- Authorization path verified.
- Regression check for existing clients complete.
