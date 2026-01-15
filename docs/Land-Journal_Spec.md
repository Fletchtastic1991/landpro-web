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

## 2B. Behavioral Rules (v0.1)

This section defines how the Land Journal (Decision Memory) behaves over time.
These rules are mandatory and enforce determinism, auditability, and human decision primacy.
They are fully constrained by LandPro OS Invariants.

---

### 2B.1 Journal Write Triggers (Closed Set)

A Land Journal entry may be written **only** when one of the following occurs:

1. User creates, edits, or redraws parcel geometry
2. User explicitly declares a parcel condition or fact
3. User explicitly overrides a system-derived classification
4. A report is generated or replaced (system marker only)
5. User explicitly undoes a prior decision

The journal is **never** written to during:
- Page load
- Passive viewing
- AI explanation
- Background recalculation
- Confidence refinement
- Re-running analysis with unchanged inputs

---

### 2B.2 Analysis Rerun Stability

Re-running analysis with identical inputs:

- Does NOT modify existing journal entries
- Does NOT reinterpret prior decisions
- Does NOT change classifications
- Does NOT write new entries unless output materially differs

If output differs:
- A `REPORT_GENERATED` system entry may be written
- Prior reports are preserved and marked as superseded

This rule enforces narrative and decision stability.

---

### 2B.3 Geometry Change Behavior

When parcel geometry changes:

1. Previous geometry entries remain immutable
2. A new `GEOMETRY_ACTION` entry is written
3. All prior reports are marked as superseded
4. A new report is generated
5. A `REPORT_REPLACED` system entry is written

The system must not silently reinterpret or invalidate prior user declarations.
If a prior declaration no longer applies, the conflict must be surfaced to the user.

---

### 2B.4 Conflict Detection and Handling

A conflict exists when:
- Two active user declarations contradict
- A user declaration contradicts geometry-derived facts
- A user override contradicts a newer declaration

Required behavior:
- Final output is blocked
- Conflict is explicitly presented to the user
- User must resolve via undo or correction

Forbidden behavior:
- Silent arbitration
- Automatic prioritization
- Averaging or probabilistic resolution
- AI judgment calls

---

### 2B.5 System Write Permissions (Strictly Limited)

The system may write **only** the following journal entries:

- `REPORT_GENERATED`
- `REPORT_REPLACED`
- Structural timestamps
- Structural references

The system may **never** write:
- Interpretations
- Classifications
- Assumptions
- Confidence updates
- Semantic conclusions

All meaningful decisions must originate from the user.

---

### 2B.6 Undo Semantics

Undo actions:
- Do not delete history
- Write a `USER_UNDO` entry
- Mark the target entry as `undone`
- Trigger report regeneration if applicable

The journal is append-only and audit-safe.

---

### 2B.7 AI Interaction Constraints

The AI may:
- Read journal entries
- Explain historical decisions
- Reference entry IDs

The AI may not:
- Write to the journal
- Modify entries
- Resolve conflicts autonomously

If change is required, the AI must instruct the user on available actions.
