### 1. Authentication & Role Separation

Our backend uses **JWT bearer authentication** (`HS256`, 12h expiry). Tokens embed role and permission data, re-validated from the DB on each request via `requireJwt` and `restrictTo`.

**Reviewer vs. Approver separation** is enforced in two ways:

- **Transition Permissions:** Distinct permissions for `start_review`/`escalate_final` (reviewers) vs. `approve`/`reject` (approvers).
- **Conflict Rule:** Assigned reviewers cannot perform final `APPROVED`/`REJECTED` actions.

We chose stateless JWTs for simpler horizontal scaling, but this means immediate token revocation is weaker than server-side sessions without additional infrastructure.

### 2. State Integrity

Illegal transitions are blocked by an explicit `VALID_TRANSITIONS` allow-list state machine, supplemented by per-transition permission checks.

Application status updates use **optimistic concurrency**: `expectedVersion` must match the current `version`, or a `409 CONFLICT` occurs. Document writes employ **pessimistic row locking** (`pessimistic_write`) during version updates to prevent concurrent collisions.

This trade-off reduces lock contention for application workflow, but clients must handle retries on version conflicts.

### 3. Append-Only Audit

Every state transition inserts an `audit_logs` row within the **same transaction** as the state change, ensuring no transition without audit. Logs record explicit `from_state` and `to_state`; document events are logged with `event_action` and metadata.

Our current "tamper-proof" approach relies on **application-level append-only discipline** (insert-only code paths, timestamped rows). This is pragmatic but offers weaker guarantees than cryptographic immutability (e.g., hash chains or DB-level WORM triggers).

### 4. Document Versioning

Uploads are hard-capped at **5MB** via Multer middleware; oversize files return `413 FILE_TOO_LARGE`.

Resubmissions are grouped by `group_key`. The previous current version is marked `is_current=false`, the new version becomes `MAX(version)+1`, and the new row becomes current. Version history is preserved and queryable (`includeHistory`), with audit metadata capturing `group_key` and version.

Local disk storage was chosen for simplicity and speed, but it is less scalable and operationally robust than object storage (e.g., S3).

### 5. Error Handling

Unauthorized/forbidden conditions (missing/invalid token, insufficient permission, rule violations) are normalized to **403** (`UNAUTHORIZED` code). Missing resources/routes return **404** (`NOT_FOUND`). Unhandled/non-operational errors default to **500** (`INTERNAL_ERROR`).

Thus, unauthorized access consistently results in a **403**, not 401.
