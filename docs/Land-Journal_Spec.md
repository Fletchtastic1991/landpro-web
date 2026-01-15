# LandPro — Decision Memory / Land Journal
Version: v0.1
Status: Draft
Governed by: LandPro OS Core Invariants

## Purpose & Scope

The Land Journal is a parcel-scoped, user-visible record of explicit decisions,
actions, and declarations made during parcel analysis.

It exists to:
- Preserve user intent across analysis reruns
- Maintain consistency without inference
- Provide auditability and explainability

The Land Journal is not a learning system, does not infer facts,
and does not modify parcel geometry or report outputs.

## Core Principle

LandPro may remember what the user explicitly decided,
but may never remember what it inferred.

All memory must originate from explicit user action
or be purely structural system markers.

## Canonical Land Journal Schema (v0.1)

### LandJournal
- parcel_id
- entries[]

### LandJournalEntry

Required fields:
- entry_id — unique and stable
- timestamp — time of creation
- actor — "user" | "system"
- type — see Entry Types
- description — plain-language explanation
- evidence_refs[] — report sections, maps, uploads
- reversible — boolean
- status — "active" | "undone" | "superseded"

### Entry Types (Closed Enum)

Allowed entry types:
- USER_DECLARATION
- GEOMETRY_ACTION
- OVERRIDE
- REPORT_GENERATED
- REPORT_REPLACED
- USER_UNDO

Prohibited:
- Inferred conclusions
- Learned behavior
- Confidence adjustments
- Silent system decisions

## Invariant Alignment

- User-Owned Geometry (Invariant 4):
  Geometry changes are logged as GEOMETRY_ACTION entries
  and may never be modified silently.

- Reversibility (Invariant 5):
  All reversible entries may be undone only through
  an explicit USER_UNDO entry.

- Failure Visibility (Invariant 6):
  Missing or conflicting journal state must block analysis
  and be surfaced to the user.

- Explainability & Auditability (Invariants 12–13):
  All outputs must be traceable to active journal entries
  or explicitly state when unavailable.

- Context Lock (Invariant 16):
  Journals are parcel-scoped and may not transfer context
  across parcels.

