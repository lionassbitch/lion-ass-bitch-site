# Retention, legal hold, and privacy requests

## Policy

| Record | Retention |
| --- | --- |
| Unsigned drafts and abandoned statements (including uploaded files) | Purged `DRAFT_RETENTION_DAYS` (default 90) days after last activity. Metadata rows are kept as `abandoned` / `removed_before_signing`; audit entries (with hashes) are kept. |
| Signed statements, signatures, original media, PDFs, manifests | Retained indefinitely by default, or at least until `LEGAL_HOLD_UNTIL`. **Never auto-deleted and never overwritten.** |
| Audit log | Retained as long as any statement exists; never edited. |
| Sessions | Deleted 30 days after expiry. |
| Invite links | Kept (revocable) for the audit trail. |

The purge runs daily in-process (`RETENTION_JOB_ENABLED`) or on demand with
`npx tsx scripts/purge-drafts.ts`.

## Corrections

A witness never edits a signed statement. **My statements → Request a
correction** creates a new draft (version n+1) pre-filled from the signed
version, linked by `supersedes_id`/`root_id`. The new version must be consented
to and signed again. Both versions remain, each with its own evidence ID,
hashes and PDF; the dashboard and exports show the chain.

## Privacy and correction requests

Witnesses submit requests from **My statements** (types: access, correction,
deletion, withdrawal, other). Handling process for the case owner:

1. The request appears in **Dashboard → Privacy requests** with status
   `received`; an audit entry is written.
2. Acknowledge within a reasonable time and mark `in_review`.
3. Decide against this policy and any litigation hold:
   - **Access**: send the witness their PDF/bundle (they can also download it themselves).
   - **Correction**: ask the witness to create a correction version; do not edit anything.
   - **Withdrawal / deletion before signing**: the witness can discard the draft themselves; otherwise the purge job handles it.
   - **Deletion of a signed statement**: not possible through the application while a legal hold applies. If no hold applies and counsel agrees, follow the manual procedure below.
4. Record the outcome (`resolved` or `declined`) with a note the witness can read.

## Manual deletion of a signed statement (no legal hold)

Deliberately not available in the UI. With counsel's written approval:

1. Export the statement's bundle (`npm run export:records`) and archive it offline if required.
2. Delete the objects under `statements/<statementId>/` from the bucket.
3. As a database superuser, disable the protection triggers for the single
   transaction, delete the `signatures`, `media_assets` and `witness_statements`
   rows for that statement, and re-enable the triggers. Do **not** delete audit
   rows; instead append an audit entry (`retention.signed_statement_deleted`)
   via a one-off script so the chain records the deletion.
4. Note the action in the privacy request resolution.

Deleting audit history is never part of this procedure.
