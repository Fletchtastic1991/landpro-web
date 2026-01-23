/**
 * SitePro Invariants
 *
 * SitePro describes factual site conditions inside a user-defined parcel.
 * It NEVER makes recommendations or decisions.
 */
export const SiteProInvariants = {
  // Geometry rules
  requiresUserGeometry: true,

  // Data behavior
  factsOnly: true,
  noRecommendations: true,
  noScoring: true,
  noRiskAssessment: true,

  // Source rules
  mustDeclareDataSource: true,
  mustDeclareConfidence: true,

  // Failure behavior
  blockIfNoGeometry: true,
  neverInferParcelBoundary: true,

  // Stability guarantees
  deterministicGivenSameInputs: true,
  rerunnableWithoutSideEffects: true
} as const;
