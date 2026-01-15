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
