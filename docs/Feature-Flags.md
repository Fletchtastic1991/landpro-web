# LandPro Feature Flags
Version: v0.1
Status: Authoritative

This document defines feature gating rules for LandPro OS.
All runtime features must be explicitly declared here before activation.

Undeclared features are considered disabled by default.

---

## Flag Principles

1. Features are opt-in, not assumed
2. Disabled features must not execute any logic
3. Flags may restrict UI, logic, or both
4. Feature flags may not override invariants
5. Flags exist to preserve system integrity, not speed

---

## Core Flags (v0.1)

### MAP_BASE
Status: ENABLED  
Description: Displays base map tiles only  
Dependencies: None  
Notes: No drawing, no interaction

---

### MAP_DRAW
Status: DISABLED  
Description: User-drawn parcel geometry  
Dependencies:
- MAP_BASE
- Invariant 1 (No Guessing)
- Invariant 4 (User-Owned Geometry)
Journal Writes:
- GEOMETRY_ACTION

---

### PARCEL_LOOKUP
Status: DISABLED  
Description: County / authoritative parcel fetch  
Dependencies:
- Invariant 2 (Source Transparency)
- Invariant 6 (Failure Visibility)
Notes: Must never auto-merge with user geometry

---

### REPORT_GENERATION
Status: DISABLED  
Description: Generate authoritative LandPro report  
Dependencies:
- Completed geometry
- Land Journal active
Journal Writes:
- REPORT_GENERATED
- REPORT_REPLACED

---

### AI_EXPLANATION
Status: DISABLED  
Description: Read-only explanation layer  
Dependencies:
- Report Supremacy (Invariant 14)
- Read-Only Reasoning (Invariant 15)
Notes: No writes, no assumptions

---

### USER_ACCOUNTS
Status: DISABLED  
Description: Auth, persistence, identity  
Dependencies:
- None (isolated)
Notes: Must not affect analysis behavior

---

## Reactivation Rule

A feature may be enabled only if:
1. All dependencies are satisfied
2. Its journal interactions are defined
3. It cannot violate any invariant
4. It does not silently re-enable another feature

---

## Enforcement

Any feature found executing while marked DISABLED
is considered a system defect.

## Feature Reintroduction Order (v0.1)

Features must be reintroduced in the following sequence.
Skipping steps or enabling features out of order is prohibited.

Each phase must be stable before proceeding.

---

### Phase 0 — Documentation Lock (CURRENT STATE)

Enabled:
- None

Requirements:
- Invariants finalized
- Land Journal schema defined
- Behavioral rules committed
- Feature flags declared

Outcome:
- System rules are authoritative
- No runtime logic assumed

---

### Phase 1 — Map Foundation

Enable:
- MAP_BASE

Validation Criteria:
- Map renders reliably
- No interaction
- No journal writes
- No data inference

Failure Mode:
- Rendering issues only (safe)

---

### Phase 2 — User Geometry (Critical Boundary)

Enable:
- MAP_DRAW

Validation Criteria:
- Geometry exists only via explicit user action
- Geometry is immutable without permission
- Undo works
- Journal writes only GEOMETRY_ACTION

Hard Stop Conditions:
- Any automatic geometry creation
- Any modification without user intent
- Any silent redraw

---

### Phase 3 — Journal Activation

Enable:
- Decision Memory (Land Journal writes)

Validation Criteria:
- Append-only behavior confirmed
- Undo produces USER_UNDO entries
- No AI writes
- No system interpretations

Hard Stop Conditions:
- Overwrites
- Silent edits
- Missing history

---

### Phase 4 — Report Generation

Enable:
- REPORT_GENERATION

Validation Criteria:
- Report reflects current geometry only
- Prior reports preserved
- REPORT_REPLACED written when applicable
- Conflicts block output

Hard Stop Conditions:
- Silent report changes
- Unexplained reclassification
- Conflicting data allowed through

---

### Phase 5 — AI Explanation Layer

Enable:
- AI_EXPLANATION

Validation Criteria:
- AI references report sections only
- No new facts introduced
- Unanswerable questions explicitly refused

Hard Stop Conditions:
- AI conclusions
- AI confidence inflation
- AI memory writes

---

### Phase 6 — External Data (Optional / Future)

Enable:
- PARCEL_LOOKUP

Validation Criteria:
- Source transparency displayed
- No auto-merge with user geometry
- Failure clearly surfaced

Hard Stop Conditions:
- Blended sources
- Silent upgrades/downgrades

---

### Phase 7 — User Accounts (Isolated)

Enable:
- USER_ACCOUNTS

Validation Criteria:
- No impact on analysis
- No gating of accuracy
- No behavioral changes

Hard Stop Conditions:
- Paywall-driven logic
- Data tier bias
