/**
 * DecisionSummary Component
 * 
 * Derives a decision-oriented summary layer from existing land analysis data.
 * Works strictly from information already present — no new API calls or assumptions.
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
  AlertCircle
} from "lucide-react";

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

// Derive development readiness
function deriveDevelopmentReadiness(analysis: LandAnalysis): 'Raw' | 'Early-Stage' | 'Build-Ready' {
  const devStatus = analysis.existing_development?.status?.toLowerCase() || '';
  const density = analysis.vegetation?.density?.toLowerCase() || '';
  const infrastructure = analysis.existing_development?.infrastructure_present || [];
  
  if (devStatus.includes('developed') || infrastructure.length >= 3) return 'Build-Ready';
  if (devStatus.includes('partial') || infrastructure.length >= 1) return 'Early-Stage';
  if (density.includes('light') || density.includes('sparse') || density.includes('minimal')) return 'Early-Stage';
  return 'Raw';
}

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
    case 'Build-Ready': return 'bg-green-100 text-green-800 border-green-200';
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

export default function DecisionSummary({ analysis, acreage }: DecisionSummaryProps) {
  // Derive all decision metrics from existing analysis
  const clearingEffort = deriveClearingEffort(analysis);
  const budgetUncertainty = deriveBudgetUncertainty(analysis);
  const readiness = deriveDevelopmentReadiness(analysis);
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

  return (
    <Card className="border-slate-200 bg-slate-50/50 shadow-sm">
      <CardHeader className="pb-3 pt-5 px-5">
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5 text-slate-600" />
          Decision Summary
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Derived from analysis data. Acknowledges uncertainty where it exists.
        </p>
      </CardHeader>
      <CardContent className="pb-5 px-5 space-y-6">
        {/* Decision Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-background border">
            <div className="text-sm text-muted-foreground mb-2">Clearing Effort</div>
            <Badge className={`${getEffortBadgeColor(clearingEffort)} text-sm`}>
              {clearingEffort}
            </Badge>
          </div>
          <div className="p-4 rounded-lg bg-background border">
            <div className="text-sm text-muted-foreground mb-2">Budget Uncertainty</div>
            <Badge className={`${getEffortBadgeColor(budgetUncertainty)} text-sm`}>
              {budgetUncertainty}
            </Badge>
          </div>
          <div className="p-4 rounded-lg bg-background border">
            <div className="text-sm text-muted-foreground mb-2">Development Readiness</div>
            <Badge className={`${getReadinessBadgeColor(readiness)} text-sm`}>
              {readiness}
            </Badge>
          </div>
        </div>

        {/* Primary Risk Drivers */}
        {riskDrivers.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-600" />
              Primary Risk Drivers
            </h4>
            <ul className="space-y-2">
              {riskDrivers.map((driver, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-amber-600 flex-shrink-0 mt-0.5">•</span>
                  {driver}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Cost Sensitivity & Regional Context */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-background border space-y-2">
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
          <div className="p-4 rounded-lg bg-background border space-y-2">
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

        {/* Intended Use Implications */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Home className="h-4 w-4 text-blue-600" />
            Clearing Priorities by Intended Use
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-background border">
              <div className="flex items-center gap-2 mb-2">
                <Home className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium">Homesite</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Focus on building envelope and driveway corridor. Preserve perimeter screening where terrain allows.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-background border">
              <div className="flex items-center gap-2 mb-2">
                <Trees className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Agricultural</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Full clearing with stump removal. Drainage and soil prep become primary concerns.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-background border">
              <div className="flex items-center gap-2 mb-2">
                <Tent className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium">Recreational</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Selective clearing for trails and gathering areas. Preserve natural character.
              </p>
            </div>
          </div>
        </div>

        {/* Confidence Calibration */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-slate-600" />
            Confidence Calibration
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center p-3 rounded-lg bg-background border">
              <div className="text-xs text-muted-foreground mb-1">Vegetation</div>
              <Badge className={`${getConfidenceBadgeColor(confidence.vegetation)} text-xs`}>
                {confidence.vegetation}
              </Badge>
            </div>
            <div className="text-center p-3 rounded-lg bg-background border">
              <div className="text-xs text-muted-foreground mb-1">Terrain & Drainage</div>
              <Badge className={`${getConfidenceBadgeColor(confidence.terrain)} text-xs`}>
                {confidence.terrain}
              </Badge>
            </div>
            <div className="text-center p-3 rounded-lg bg-background border">
              <div className="text-xs text-muted-foreground mb-1">Cost Estimate</div>
              <Badge className={`${getConfidenceBadgeColor(confidence.cost)} text-xs`}>
                {confidence.cost}
              </Badge>
            </div>
            <div className="text-center p-3 rounded-lg bg-background border">
              <div className="text-xs text-muted-foreground mb-1">Subsurface Risks</div>
              <Badge className={`${getConfidenceBadgeColor(confidence.subsurface)} text-xs`}>
                {confidence.subsurface}
              </Badge>
            </div>
          </div>
        </div>

        {/* Spend Discipline */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-red-50/50 border border-red-200/50 space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">Before Any Spending</span>
            </div>
            <ul className="space-y-1">
              {beforeSpending.map((action, i) => (
                <li key={i} className="text-xs text-red-700 flex items-start gap-2">
                  <span className="flex-shrink-0">•</span>
                  {action}
                </li>
              ))}
            </ul>
          </div>
          <div className="p-4 rounded-lg bg-green-50/50 border border-green-200/50 space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Can Wait Until Later</span>
            </div>
            <ul className="space-y-1">
              {canWait.map((action, i) => (
                <li key={i} className="text-xs text-green-700 flex items-start gap-2">
                  <span className="flex-shrink-0">•</span>
                  {action}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-xs text-muted-foreground/70 text-center pt-2">
          Decision summary derived from parcel analysis. Not a guarantee. Verify conditions on-site.
        </p>
      </CardContent>
    </Card>
  );
}
