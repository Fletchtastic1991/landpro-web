/**
 * DecisionSummary Component
 * 
 * Derives a decision-oriented summary layer from existing land analysis data.
 * 
 * READINESS RULES (Strict Memory Core Integration):
 * 1. Development Readiness is PURE DERIVED from Memory Core - NOT from analysis
 * 2. Only explicit user-declared memory entries affect readiness
 * 3. Analysis output NEVER affects readiness state
 * 4. "Build-Ready" is a DECISION STATE - prohibited unless supported by Memory Core
 * 5. Missing prerequisites = conditional readiness (never "ready")
 * 
 * All other metrics (effort, uncertainty, risk) are derived from analysis data.
 * 
 * Per LandPro OS Core Invariants: No guessing, source transparency, user confidence > system confidence.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Target, 
  TrendingUp, 
  Scale, 
  MapPin, 
  Home, 
  Trees, 
  Tent,
  ShieldCheck,
  Clock,
  AlertCircle,
  Info
} from "lucide-react";
import { useReadiness } from "@/hooks/useReadiness";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface LandAnalysis {
  vegetation: {
    type: string;
    density: string;
    recommendations: string[];
  };
  terrain: {
    type: string;
    slope_estimate: string;
    drainage: string;
    recommendations: string[];
  };
  equipment: {
    recommended: string[];
    considerations: string[];
  };
  labor: {
    estimated_crew_size: number;
    estimated_hours: number;
    difficulty: string;
  };
  hazards: string[];
  cost_factors: {
    base_rate_per_acre: number;
    estimated_total: number;
    cost_range_low?: number;
    cost_range_high?: number;
    development_adjustment?: string;
    factors_affecting_cost: string[];
  };
  existing_development?: {
    status: string;
    indicators: string[];
    infrastructure_present: string[];
  };
  next_steps?: string[];
  summary: string;
}

interface DecisionSummaryProps {
  analysis: LandAnalysis;
  acreage: number | null;
  parcelId?: string; // Required for Memory Core-based readiness
}

// Derive clearing effort from analysis data
function deriveClearingEffort(analysis: LandAnalysis): 'Low' | 'Moderate' | 'High' {
  const density = analysis.vegetation?.density?.toLowerCase() || '';
  const difficulty = analysis.labor?.difficulty?.toLowerCase() || '';
  const slope = analysis.terrain?.slope_estimate?.toLowerCase() || '';
  const drainage = analysis.terrain?.drainage?.toLowerCase() || '';
  
  let score = 0;
  
  // Vegetation density
  if (density.includes('heavy') || density.includes('dense')) score += 2;
  else if (density.includes('moderate') || density.includes('medium')) score += 1;
  
  // Labor difficulty
  if (difficulty.includes('hard') || difficulty.includes('difficult') || difficulty.includes('high')) score += 2;
  else if (difficulty.includes('moderate') || difficulty.includes('medium')) score += 1;
  
  // Slope
  if (slope.includes('steep') || slope.includes('significant')) score += 1;
  
  // Drainage
  if (drainage.includes('poor')) score += 1;
  
  if (score >= 4) return 'High';
  if (score >= 2) return 'Moderate';
  return 'Low';
}

// Derive budget uncertainty from cost data completeness
function deriveBudgetUncertainty(analysis: LandAnalysis): 'Low' | 'Moderate' | 'High' {
  const costFactors = analysis.cost_factors;
  const hasRange = costFactors?.cost_range_low && costFactors?.cost_range_high;
  const hazardCount = analysis.hazards?.length || 0;
  const devStatus = analysis.existing_development?.status?.toLowerCase() || '';
  
  // If we have a range, check how wide it is
  if (hasRange) {
    const rangeRatio = costFactors.cost_range_high! / Math.max(costFactors.cost_range_low!, 1);
    if (rangeRatio > 2.5) return 'High';
    if (rangeRatio > 1.5) return 'Moderate';
  }
  
  // More hazards = more uncertainty
  if (hazardCount >= 3) return 'High';
  if (hazardCount >= 1) return 'Moderate';
  
  // Unknown development status adds uncertainty
  if (devStatus.includes('unknown') || !devStatus) return 'Moderate';
  
  return 'Low';
}

// NOTE: Development Readiness is now computed via useReadiness hook from Memory Core
// The old deriveDevelopmentReadiness function has been removed to enforce:
// - One-Way Data Flow: Memory Core → Readiness
// - Explicit Memory Only: Only user-declared entries affect readiness
// - No Auto-Promotion: Analysis reruns NEVER change readiness
// See useReadiness hook and src/lib/readiness for implementation

// Identify top risk drivers
function deriveRiskDrivers(analysis: LandAnalysis): string[] {
  const drivers: { factor: string; weight: number }[] = [];
  
  const density = analysis.vegetation?.density?.toLowerCase() || '';
  const slope = analysis.terrain?.slope_estimate?.toLowerCase() || '';
  const drainage = analysis.terrain?.drainage?.toLowerCase() || '';
  const difficulty = analysis.labor?.difficulty?.toLowerCase() || '';
  const hazards = analysis.hazards || [];
  const equipment = analysis.equipment?.considerations || [];
  
  // Heavy vegetation
  if (density.includes('heavy') || density.includes('dense')) {
    drivers.push({ factor: 'Dense vegetation increases removal time and equipment requirements', weight: 3 });
  }
  
  // Slope challenges
  if (slope.includes('steep') || slope.includes('significant') || slope.includes('moderate')) {
    drivers.push({ factor: 'Terrain slope affects equipment access and safety considerations', weight: 2 });
  }
  
  // Drainage issues
  if (drainage.includes('poor')) {
    drivers.push({ factor: 'Poor drainage may require grading work and affects site timing', weight: 2 });
  }
  
  // High labor difficulty
  if (difficulty.includes('hard') || difficulty.includes('difficult') || difficulty.includes('high')) {
    drivers.push({ factor: 'Labor-intensive conditions extend timeline and crew requirements', weight: 2 });
  }
  
  // Hazards as risk drivers
  if (hazards.length > 0) {
    drivers.push({ factor: `${hazards.length} identified hazard${hazards.length > 1 ? 's' : ''} require mitigation before clearing`, weight: hazards.length });
  }
  
  // Equipment constraints
  if (equipment.some(c => c.toLowerCase().includes('access') || c.toLowerCase().includes('limited'))) {
    drivers.push({ factor: 'Access constraints limit equipment options and staging areas', weight: 2 });
  }
  
  // Sort by weight and take top 3
  return drivers
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map(d => d.factor);
}

// Derive cost sensitivity
function deriveCostSensitivity(analysis: LandAnalysis): { level: 'Stable' | 'Directional' | 'Highly Sensitive'; unknowns: string } {
  const costFactors = analysis.cost_factors;
  const hazards = analysis.hazards || [];
  const equipment = analysis.equipment?.considerations || [];
  
  const unknowns: string[] = [];
  
  // Check for subsurface mentions
  if (hazards.some(h => h.toLowerCase().includes('rock') || h.toLowerCase().includes('underground') || h.toLowerCase().includes('buried'))) {
    unknowns.push('subsurface conditions');
  }
  
  // Check for access unknowns
  if (equipment.some(c => c.toLowerCase().includes('access') || c.toLowerCase().includes('verify'))) {
    unknowns.push('site access viability');
  }
  
  // Check for utility concerns
  if (hazards.some(h => h.toLowerCase().includes('utility') || h.toLowerCase().includes('line') || h.toLowerCase().includes('pipe'))) {
    unknowns.push('utility locations');
  }
  
  // Check for permit/regulatory
  if (hazards.some(h => h.toLowerCase().includes('permit') || h.toLowerCase().includes('wetland') || h.toLowerCase().includes('protected'))) {
    unknowns.push('regulatory requirements');
  }
  
  // Default unknown if none found
  if (unknowns.length === 0) {
    unknowns.push('on-site conditions not visible from imagery');
  }
  
  // Determine level
  const hasRange = costFactors?.cost_range_low && costFactors?.cost_range_high;
  if (hasRange) {
    const rangeRatio = costFactors.cost_range_high! / Math.max(costFactors.cost_range_low!, 1);
    if (rangeRatio > 2) return { level: 'Highly Sensitive', unknowns: unknowns[0] };
    if (rangeRatio > 1.4) return { level: 'Directional', unknowns: unknowns[0] };
  }
  
  if (hazards.length >= 2 || unknowns.length >= 2) {
    return { level: 'Directional', unknowns: unknowns[0] };
  }
  
  return { level: 'Stable', unknowns: unknowns[0] };
}

// Derive regional context
function deriveRegionalContext(analysis: LandAnalysis): 'Easier than typical' | 'Typical' | 'More challenging than typical' {
  const density = analysis.vegetation?.density?.toLowerCase() || '';
  const slope = analysis.terrain?.slope_estimate?.toLowerCase() || '';
  const drainage = analysis.terrain?.drainage?.toLowerCase() || '';
  const difficulty = analysis.labor?.difficulty?.toLowerCase() || '';
  
  let challengeScore = 0;
  
  // Add challenge points
  if (density.includes('heavy') || density.includes('dense')) challengeScore += 2;
  else if (density.includes('moderate')) challengeScore += 1;
  else if (density.includes('light') || density.includes('sparse')) challengeScore -= 1;
  
  if (slope.includes('steep')) challengeScore += 2;
  else if (slope.includes('moderate')) challengeScore += 1;
  else if (slope.includes('flat') || slope.includes('gentle')) challengeScore -= 1;
  
  if (drainage.includes('poor')) challengeScore += 1;
  else if (drainage.includes('good')) challengeScore -= 1;
  
  if (difficulty.includes('hard') || difficulty.includes('high')) challengeScore += 1;
  else if (difficulty.includes('easy') || difficulty.includes('low')) challengeScore -= 1;
  
  if (challengeScore >= 3) return 'More challenging than typical';
  if (challengeScore <= -1) return 'Easier than typical';
  return 'Typical';
}

// Derive confidence levels
function deriveConfidence(analysis: LandAnalysis): {
  vegetation: 'High' | 'Medium' | 'Low';
  terrain: 'High' | 'Medium' | 'Low';
  cost: 'High' | 'Medium' | 'Low';
  subsurface: 'High' | 'Medium' | 'Low';
} {
  const veg = analysis.vegetation;
  const terrain = analysis.terrain;
  const hazards = analysis.hazards || [];
  const costFactors = analysis.cost_factors;
  
  // Vegetation confidence based on specificity
  const vegConfidence = (veg?.type && veg?.density && veg?.recommendations?.length > 0) ? 'High' : 
    (veg?.type || veg?.density) ? 'Medium' : 'Low';
  
  // Terrain confidence
  const terrainConfidence = (terrain?.type && terrain?.slope_estimate && terrain?.drainage) ? 'High' :
    (terrain?.type || terrain?.slope_estimate) ? 'Medium' : 'Low';
  
  // Cost confidence based on range width and data completeness
  let costConfidence: 'High' | 'Medium' | 'Low' = 'Medium';
  if (costFactors?.cost_range_low && costFactors?.cost_range_high) {
    const ratio = costFactors.cost_range_high / Math.max(costFactors.cost_range_low, 1);
    if (ratio < 1.3) costConfidence = 'High';
    else if (ratio > 2) costConfidence = 'Low';
  }
  
  // Subsurface is always low unless explicitly verified
  const hasSubsurfaceData = hazards.some(h => 
    h.toLowerCase().includes('no rock') || 
    h.toLowerCase().includes('verified') ||
    h.toLowerCase().includes('survey')
  );
  const subsurfaceConfidence: 'High' | 'Medium' | 'Low' = hasSubsurfaceData ? 'Medium' : 'Low';
  
  return {
    vegetation: vegConfidence,
    terrain: terrainConfidence,
    cost: costConfidence,
    subsurface: subsurfaceConfidence
  };
}

function getEffortBadgeColor(level: string): string {
  switch (level) {
    case 'Low': return 'bg-green-100 text-green-800 border-green-200';
    case 'Moderate': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'High': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-muted text-muted-foreground';
  }
}

function getReadinessBadgeColor(level: string): string {
  switch (level) {
    case 'conditional': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'early_stage': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'raw': return 'bg-slate-100 text-slate-800 border-slate-200';
    case 'not_ready': return 'bg-slate-100 text-slate-600 border-slate-200';
    case 'blocked': return 'bg-red-100 text-red-800 border-red-200';
    // Legacy fallback mappings
    case 'Build-Ready': return 'bg-amber-100 text-amber-800 border-amber-200'; // Now conditional
    case 'Early-Stage': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Raw': return 'bg-slate-100 text-slate-800 border-slate-200';
    default: return 'bg-muted text-muted-foreground';
  }
}

function getSensitivityBadgeColor(level: string): string {
  switch (level) {
    case 'Stable': return 'bg-green-100 text-green-800 border-green-200';
    case 'Directional': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Highly Sensitive': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-muted text-muted-foreground';
  }
}

function getRegionalBadgeColor(context: string): string {
  switch (context) {
    case 'Easier than typical': return 'bg-green-100 text-green-800 border-green-200';
    case 'Typical': return 'bg-slate-100 text-slate-800 border-slate-200';
    case 'More challenging than typical': return 'bg-amber-100 text-amber-800 border-amber-200';
    default: return 'bg-muted text-muted-foreground';
  }
}

function getConfidenceBadgeColor(level: string): string {
  switch (level) {
    case 'High': return 'bg-green-100 text-green-800 border-green-200';
    case 'Medium': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Low': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-muted text-muted-foreground';
  }
}

export default function DecisionSummary({ analysis, acreage, parcelId }: DecisionSummaryProps) {
  // READINESS: Computed from Memory Core (NOT from analysis)
  // This follows strict rules: one-way data flow, explicit memory only, no auto-promotion
  const { 
    label: readinessLabel, 
    level: readinessLevel,
    conditionalStatement,
    missingRequirements,
    blockers,
    hasMissingRequirements,
    hasBlockers,
    isComputing: isReadinessLoading,
  } = useReadiness(parcelId);

  // OTHER METRICS: Derived from analysis data (unchanged)
  const clearingEffort = deriveClearingEffort(analysis);
  const budgetUncertainty = deriveBudgetUncertainty(analysis);
  const riskDrivers = deriveRiskDrivers(analysis);
  const costSensitivity = deriveCostSensitivity(analysis);
  const regionalContext = deriveRegionalContext(analysis);
  const confidence = deriveConfidence(analysis);

  // Derive spend discipline actions
  const beforeSpending: string[] = [];
  const canWait: string[] = [];

  // Populate before-spending actions based on unknowns and hazards
  if (confidence.subsurface === 'Low') {
    beforeSpending.push('Walk the property to assess ground conditions');
  }
  if (analysis.hazards?.some(h => h.toLowerCase().includes('utility') || h.toLowerCase().includes('line'))) {
    beforeSpending.push('Request utility locates before any ground disturbance');
  }
  if (analysis.hazards?.some(h => h.toLowerCase().includes('permit') || h.toLowerCase().includes('wetland'))) {
    beforeSpending.push('Verify permit requirements with local jurisdiction');
  }
  if (analysis.equipment?.considerations?.some(c => c.toLowerCase().includes('access'))) {
    beforeSpending.push('Confirm equipment access routes and staging areas');
  }
  if (beforeSpending.length === 0) {
    beforeSpending.push('Conduct a site visit to verify imagery-based observations');
  }

  // Populate can-wait actions
  canWait.push('Detailed equipment scheduling');
  canWait.push('Final contractor selection');
  if (analysis.terrain?.drainage?.toLowerCase() !== 'poor') {
    canWait.push('Drainage improvements (if not affecting clearing access)');
  }

  // Display label for readiness - defaults to "Not Ready" if no parcelId provided
  const displayReadinessLabel = parcelId ? (readinessLabel ?? 'Loading...') : 'No Parcel Selected';
  const displayReadinessLevel = readinessLevel ?? 'not_ready';

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2 pt-4 px-5">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-5 w-5 text-muted-foreground" />
          Decision Summary
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Derived from analysis data. Readiness requires explicit user decisions.
        </p>
      </CardHeader>
      <CardContent className="pb-4 px-5 space-y-5">
        {/* Decision Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <div className="text-sm text-muted-foreground">Clearing Effort</div>
            <Badge className={`${getEffortBadgeColor(clearingEffort)} text-sm`}>
              {clearingEffort}
            </Badge>
          </div>
          <div className="space-y-1.5">
            <div className="text-sm text-muted-foreground">Budget Uncertainty</div>
            <Badge className={`${getEffortBadgeColor(budgetUncertainty)} text-sm`}>
              {budgetUncertainty}
            </Badge>
          </div>
          <div className="space-y-1.5">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              Development Readiness
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs">
                      Readiness is derived from recorded decisions, not analysis. 
                      Record milestones (surveys, clearing, permits) to advance readiness.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Badge className={`${getReadinessBadgeColor(displayReadinessLevel)} text-sm`}>
              {isReadinessLoading ? 'Loading...' : displayReadinessLabel}
            </Badge>
            {conditionalStatement && (
              <p className="text-xs text-muted-foreground mt-1">
                {conditionalStatement}
              </p>
            )}
          </div>
        </div>

        {/* Missing Requirements / Blockers - shown when present */}
        {(hasMissingRequirements || hasBlockers) && parcelId && (
          <>
            <div className="border-t" />
            <div className="space-y-2">
              {hasBlockers && (
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-red-700 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Blockers
                  </h4>
                  <ul className="space-y-1">
                    {blockers.map((b: any) => (
                      <li key={b.record_id} className="text-xs text-red-600 flex items-start gap-2">
                        <span className="flex-shrink-0">•</span>
                        {b.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {hasMissingRequirements && !hasBlockers && (
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-amber-700 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Missing for Build-Ready
                  </h4>
                  <ul className="space-y-1">
                    {missingRequirements.slice(0, 3).map((m: any) => (
                      <li key={m.milestone} className="text-xs text-amber-600 flex items-start gap-2">
                        <span className="flex-shrink-0">•</span>
                        {m.label}
                      </li>
                    ))}
                    {missingRequirements.length > 3 && (
                      <li className="text-xs text-amber-600">
                        +{missingRequirements.length - 3} more
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}

        {/* Divider */}
        <div className="border-t" />

        {/* Primary Risk Drivers */}
        {riskDrivers.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-600" />
              Primary Risk Drivers
            </h4>
            <ul className="space-y-1.5">
              {riskDrivers.map((driver, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2 leading-relaxed">
                  <span className="text-amber-600 flex-shrink-0 mt-0.5">•</span>
                  {driver}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Cost Sensitivity & Regional Context */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Cost Sensitivity</span>
            </div>
            <Badge className={`${getSensitivityBadgeColor(costSensitivity.level)} text-sm`}>
              {costSensitivity.level}
            </Badge>
            <p className="text-xs text-muted-foreground">
              Largest unknown: {costSensitivity.unknowns}
            </p>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Regional Context</span>
            </div>
            <Badge className={`${getRegionalBadgeColor(regionalContext)} text-sm`}>
              {regionalContext}
            </Badge>
            <p className="text-xs text-muted-foreground">
              Based on terrain, vegetation, and access
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t" />

        {/* Intended Use Implications */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Home className="h-4 w-4 text-muted-foreground" />
            Clearing Priorities by Intended Use
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Home className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm font-medium">Homesite</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Focus on building envelope and driveway corridor. Preserve perimeter screening where terrain allows.
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Trees className="h-3 w-3 text-green-600" />
                <span className="text-sm font-medium">Agricultural</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Full clearing with stump removal. Drainage and soil prep become primary concerns.
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Tent className="h-3 w-3 text-amber-600" />
                <span className="text-sm font-medium">Recreational</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Selective clearing for trails and gathering areas. Preserve natural character.
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t" />

        {/* Confidence Calibration */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            Confidence Calibration
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Vegetation</div>
              <Badge className={`${getConfidenceBadgeColor(confidence.vegetation)} text-xs`}>
                {confidence.vegetation}
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Terrain & Drainage</div>
              <Badge className={`${getConfidenceBadgeColor(confidence.terrain)} text-xs`}>
                {confidence.terrain}
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Cost Estimate</div>
              <Badge className={`${getConfidenceBadgeColor(confidence.cost)} text-xs`}>
                {confidence.cost}
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Subsurface Risks</div>
              <Badge className={`${getConfidenceBadgeColor(confidence.subsurface)} text-xs`}>
                {confidence.subsurface}
              </Badge>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t" />

        {/* Spend Discipline */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium">Before Any Spending</span>
            </div>
            <ul className="space-y-1.5">
              {beforeSpending.map((action, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2 leading-relaxed">
                  <span className="text-amber-600 flex-shrink-0">•</span>
                  {action}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Can Wait Until Later</span>
            </div>
            <ul className="space-y-1.5">
              {canWait.map((action, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2 leading-relaxed">
                  <span className="text-muted-foreground flex-shrink-0">•</span>
                  {action}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-xs text-muted-foreground/70 pt-2">
          Decision summary derived from parcel analysis. Not a guarantee. Verify conditions on-site.
        </p>
      </CardContent>
    </Card>
  );
}
