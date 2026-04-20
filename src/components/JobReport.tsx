import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LandSelections } from "@/components/LandSelectors";
import { cn } from "@/lib/utils";
import {
  Calendar, Ruler, Leaf, Mountain, MapPin,
  Lock, Download, CheckCircle2, AlertTriangle,
  Wrench, Users, DollarSign, FileText, TrendingUp
} from "lucide-react";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

interface JobReportProps {
  propertyData: {
    acreage: number | null;
    squareMeters: number | null;
  };
  selections: LandSelections;
  className?: string;
}

// ─── Cost Model ───────────────────────────────────────────────────────────────

const BASE_RATES = {
  light:  { min: 1500, max: 3000 },
  medium: { min: 3000, max: 6000 },
  heavy:  { min: 6000, max: 12000 },
};

const TERRAIN_MULTIPLIERS = {
  flat:         { min: 1.0,  max: 1.0  },
  slight_slope: { min: 1.1,  max: 1.25 },
  steep:        { min: 1.3,  max: 1.5  },
};

const ACCESS_MULTIPLIERS = {
  easy:      { min: 1.0,  max: 1.0  },
  moderate:  { min: 1.15, max: 1.3  },
  difficult: { min: 1.4,  max: 1.6  },
};

function calcCostRange(acreage: number, selections: LandSelections) {
  const base = BASE_RATES[selections.vegetation];
  const terrain = TERRAIN_MULTIPLIERS[selections.terrain];
  const access = ACCESS_MULTIPLIERS[selections.accessibility];

  const low  = Math.round(base.min * terrain.min * access.min * acreage / 100) * 100;
  const high = Math.round(base.max * terrain.max * access.max * acreage / 100) * 100;
  return { low, high };
}

// ─── Smart Descriptors ────────────────────────────────────────────────────────

const VEGETATION_DESCRIPTORS = {
  light: {
    label: "Light Vegetation",
    detail: "Sparse tree coverage with minimal underbrush. Open canopy, mostly grass or shrubs.",
    canopy: "10–30% canopy coverage",
    clearingType: "Brush clearing and light grading",
  },
  medium: {
    label: "Medium Vegetation",
    detail: "Mixed tree stands with moderate underbrush. Some clearing required before equipment access.",
    canopy: "30–60% canopy coverage",
    clearingType: "Selective tree removal and underbrush clearing",
  },
  heavy: {
    label: "Heavy Vegetation",
    detail: "Dense forest or heavy brush. Significant clearing effort required throughout.",
    canopy: "Estimated 70–85% canopy coverage — dense clearing required",
    clearingType: "Full timber clearing and stump removal",
  },
};

const TERRAIN_DESCRIPTORS = {
  flat: {
    label: "Flat Terrain",
    detail: "Low elevation variance across parcel. Minimal equipment efficiency impact.",
    slope: "Average slope: <2% (minimal grade impact)",
    drainage: "Standard surface drainage expected",
  },
  slight_slope: {
    label: "Slight Slope",
    detail: "Moderate elevation change. Equipment access manageable with standard machinery.",
    slope: "Average slope: 6–9% (moderate equipment efficiency impact)",
    drainage: "Directional drainage — check for erosion risk",
  },
  steep: {
    label: "Steep Terrain",
    detail: "Significant grade change. Specialized equipment and additional safety measures required.",
    slope: "Average slope: 15%+ (significant equipment efficiency impact)",
    drainage: "High runoff risk — erosion control required",
  },
};

const ACCESS_DESCRIPTORS = {
  easy: {
    label: "Easy Access",
    detail: "Direct road access. Standard equipment mobilization.",
    impact: "No access premium",
  },
  moderate: {
    label: "Moderate Access",
    detail: "Limited entry points or unpaved access roads. Some mobilization complexity.",
    impact: "+15–30% mobilization cost",
  },
  difficult: {
    label: "Difficult Access",
    detail: "Remote location, narrow access, or significant obstacles. Specialized mobilization required.",
    impact: "+40–60% mobilization cost",
  },
};

// ─── Equipment Recommendations ────────────────────────────────────────────────

function getEquipment(selections: LandSelections): string[] {
  const eq: string[] = [];

  if (selections.vegetation === "light") {
    eq.push("Skid steer with brush cutter", "Disc mower or rotary cutter");
  } else if (selections.vegetation === "medium") {
    eq.push("Forestry mulcher", "Skid steer with grapple", "Mid-size bulldozer (D4–D5)");
  } else {
    eq.push("Heavy-duty bulldozer (D6/D7)", "Excavator with thumb (20–30 ton)", "Forestry mulcher or tub grinder", "Haul trucks for debris removal");
  }

  if (selections.terrain === "steep") {
    eq.push("Track-mounted equipment only", "Erosion control materials");
  }

  if (selections.accessibility === "difficult") {
    eq.push("Low-ground-pressure equipment", "Access road construction may be required");
  }

  return eq;
}

// ─── Labor Estimate ───────────────────────────────────────────────────────────

function getLaborEstimate(acreage: number, selections: LandSelections) {
  const baseHoursPerAcre = {
    light: 4,
    medium: 12,
    heavy: 28,
  }[selections.vegetation];

  const terrainFactor = { flat: 1.0, slight_slope: 1.2, steep: 1.5 }[selections.terrain];
  const accessFactor  = { easy: 1.0, moderate: 1.2, difficult: 1.5 }[selections.accessibility];

  const hours = Math.round(baseHoursPerAcre * terrainFactor * accessFactor * acreage);
  const crew  = selections.vegetation === "light" ? 2 : selections.vegetation === "medium" ? 3 : 5;

  const difficulty =
    selections.vegetation === "heavy" || selections.terrain === "steep" || selections.accessibility === "difficult"
      ? "Challenging"
      : selections.vegetation === "medium" || selections.terrain === "slight_slope"
      ? "Moderate"
      : "Standard";

  return { hours, crew, difficulty };
}

// ─── Risk Factors ─────────────────────────────────────────────────────────────

function getRiskFactors(selections: LandSelections): string[] {
  const risks: string[] = [];

  if (selections.vegetation === "heavy") {
    risks.push("Dense canopy may conceal ground hazards (stumps, debris, sinkholes)");
    risks.push("Timber value assessment recommended before clearing begins");
  }
  if (selections.terrain === "steep") {
    risks.push("Steep grade increases equipment rollover risk — certified operators required");
    risks.push("Stormwater and erosion control plan likely required by local regulation");
  }
  if (selections.terrain === "slight_slope") {
    risks.push("Monitor for erosion at slope breaks and drainage channels");
  }
  if (selections.accessibility === "difficult") {
    risks.push("Limited access may require temporary road construction before clearing");
    risks.push("Emergency equipment access must be established before work begins");
  }
  if (selections.accessibility === "moderate") {
    risks.push("Verify equipment entry points before mobilization");
  }

  // Always add
  risks.push("Site visit required to verify conditions before final pricing");
  risks.push("Permitting requirements vary by county — verify before project start");

  return risks;
}

// ─── Confidence Score ─────────────────────────────────────────────────────────

function getConfidence(selections: LandSelections): { level: "Low" | "Medium" | "High"; reason: string } {
  const hard = selections.vegetation === "heavy" && selections.terrain === "steep";
  const mod  = selections.vegetation === "heavy" || selections.terrain === "steep" || selections.accessibility === "difficult";

  if (hard) return {
    level: "Low",
    reason: "Heavy vegetation + steep terrain creates high variability. On-site assessment strongly recommended.",
  };
  if (mod) return {
    level: "Medium",
    reason: "One or more challenging conditions present. Estimates are directionally accurate but require site verification.",
  };
  return {
    level: "High",
    reason: "Favorable conditions with predictable scope. Estimates are reliable for budgeting purposes.",
  };
}

// ─── Report Number ────────────────────────────────────────────────────────────

function generateReportNumber(): string {
  const d = format(new Date(), "yyyyMMdd");
  const r = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `LP-${d}-${r}`;
}

// ─── Print/PDF ────────────────────────────────────────────────────────────────

function printReport(reportId: string) {
  const el = document.getElementById(reportId);
  if (!el) return;
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>LandPro Report</title>
    <style>* { margin:0; padding:0; box-sizing:border-box; font-family: Georgia, serif; }
    body { background: white; color: #111; padding: 40px; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
    </style></head><body>${el.outerHTML}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 500);
}

// ─── Main Component ───────────────────────────────────────────────────────────

const JobReport: React.FC<JobReportProps> = ({ propertyData, selections, className }) => {
  const [reportGenerated, setReportGenerated] = useState(false);
  const [reportNumber] = useState(generateReportNumber);
  const [generatedAt] = useState(() => new Date());

  const acreage = propertyData.acreage ?? 0;
  const hasAcreage = acreage > 0;

  const costRange   = hasAcreage ? calcCostRange(acreage, selections) : null;
  const labor       = hasAcreage ? getLaborEstimate(acreage, selections) : null;
  const equipment   = getEquipment(selections);
  const risks       = getRiskFactors(selections);
  const confidence  = getConfidence(selections);
  const vegDesc     = VEGETATION_DESCRIPTORS[selections.vegetation];
  const terrDesc    = TERRAIN_DESCRIPTORS[selections.terrain];
  const accessDesc  = ACCESS_DESCRIPTORS[selections.accessibility];

  const confidenceColor = {
    High:   "bg-green-500/15 text-green-700 border-green-500/30",
    Medium: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
    Low:    "bg-red-500/15 text-red-700 border-red-500/30",
  }[confidence.level];

  // ── Pre-generate state: shows smart summary + button ──
  if (!reportGenerated) {
    return (
      <Card className={cn("overflow-hidden border-2", className)}>
        <CardHeader className="bg-primary/5 border-b py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Job Summary Report
            </CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {new Date().toLocaleString()}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">

          {/* Property + Selections Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: Ruler,    label: "Property Size", value: hasAcreage ? `${acreage} Acres` : "Not defined", color: "bg-blue-500/10 text-blue-600" },
              { icon: Leaf,     label: "Vegetation",    value: vegDesc.label,    color: "bg-green-500/10 text-green-600" },
              { icon: Mountain, label: "Terrain",       value: terrDesc.label,   color: "bg-amber-500/10 text-amber-600" },
              { icon: MapPin,   label: "Accessibility", value: accessDesc.label, color: "bg-purple-500/10 text-purple-600" },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="flex items-center justify-between p-3 rounded-lg border bg-background/50">
                <div className="flex items-center gap-2">
                  <div className={cn("p-1.5 rounded-md", color)}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{label}</span>
                </div>
                <span className="text-xs font-bold">{value}</span>
              </div>
            ))}
          </div>

          {/* Smart Descriptions */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border bg-muted/20 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-green-700 uppercase tracking-wider">
                <Leaf className="h-3.5 w-3.5" /> Vegetation
              </div>
              <p className="text-sm font-medium">{vegDesc.canopy}</p>
              <p className="text-xs text-muted-foreground">{vegDesc.detail}</p>
            </div>
            <div className="p-4 rounded-lg border bg-muted/20 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 uppercase tracking-wider">
                <Mountain className="h-3.5 w-3.5" /> Terrain
              </div>
              <p className="text-sm font-medium">{terrDesc.slope}</p>
              <p className="text-xs text-muted-foreground">{terrDesc.detail}</p>
            </div>
            <div className="p-4 rounded-lg border bg-muted/20 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 uppercase tracking-wider">
                <MapPin className="h-3.5 w-3.5" /> Access
              </div>
              <p className="text-sm font-medium">{accessDesc.impact}</p>
              <p className="text-xs text-muted-foreground">{accessDesc.detail}</p>
            </div>
          </div>

          {/* Cost Preview */}
          {costRange && (
            <div className="p-4 rounded-lg border bg-primary/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Estimated Range</p>
                  <p className="text-2xl font-bold text-primary">
                    ${costRange.low.toLocaleString()} – ${costRange.high.toLocaleString()}
                  </p>
                </div>
              </div>
              <Badge className={cn("border text-xs", confidenceColor)}>
                {confidence.level} Confidence
              </Badge>
            </div>
          )}

          {/* Generate Button */}
          {hasAcreage ? (
            <div className="pt-2 space-y-3">
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {[
                  "Equipment recommendations",
                  "Labor estimate",
                  "Layered cost model",
                  "Risk factors",
                  "Locked report number",
                  "PDF download",
                ].map(item => (
                  <div key={item} className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-primary" />
                    {item}
                  </div>
                ))}
              </div>
              <Button
                size="lg"
                className="w-full text-base font-semibold gap-2"
                onClick={() => setReportGenerated(true)}
              >
                <Lock className="h-4 w-4" />
                Generate Property Analysis Report
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Generating locks this assessment. A unique report number and timestamp will be created.
              </p>
            </div>
          ) : (
            <div className="pt-2 text-center py-4">
              <p className="text-sm text-muted-foreground">
                Draw a property boundary on the map above to enable report generation.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // ── Generated report view ──
  return (
    <div className={cn("space-y-4", className)}>
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20 gap-1 text-xs">
            <Lock className="h-3 w-3" />
            Locked {format(generatedAt, "MMM d, yyyy 'at' h:mm a")}
          </Badge>
          <span className="text-sm text-muted-foreground font-mono">{reportNumber}</span>
        </div>
        <Button size="sm" onClick={() => printReport("lp-report-doc")} className="gap-2">
          <Download className="h-4 w-4" />
          Download PDF
        </Button>
      </div>

      {/* The printable report */}
      <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
        <div id="lp-report-doc" style={{
          fontFamily: "'Georgia', 'Times New Roman', serif",
          background: "#ffffff",
          color: "#1a1a1a",
          padding: "48px 52px",
          lineHeight: 1.6,
        }}>

          {/* Header */}
          <div style={{ borderBottom: "3px solid #14532d", paddingBottom: "24px", marginBottom: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                  <div style={{ width: "28px", height: "28px", background: "#14532d", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "white", fontWeight: "bold", fontSize: "12px" }}>LP</span>
                  </div>
                  <span style={{ fontSize: "18px", fontWeight: "bold", color: "#14532d", fontFamily: "sans-serif" }}>LandPro</span>
                </div>
                <div style={{ fontSize: "10px", color: "#6b7280", fontFamily: "sans-serif", letterSpacing: "0.06em" }}>LAND INTELLIGENCE PLATFORM</div>
              </div>
              <div style={{ textAlign: "right", fontFamily: "sans-serif" }}>
                <div style={{ fontSize: "10px", color: "#9ca3af", letterSpacing: "0.08em", textTransform: "uppercase" }}>Report Number</div>
                <div style={{ fontSize: "16px", fontWeight: "bold", color: "#14532d", fontFamily: "monospace" }}>{reportNumber}</div>
                <div style={{ fontSize: "10px", color: "#9ca3af", marginTop: "2px" }}>
                  Generated {format(generatedAt, "MMMM d, yyyy 'at' h:mm a")}
                </div>
              </div>
            </div>
            <div style={{ marginTop: "20px" }}>
              <div style={{ fontSize: "10px", color: "#9ca3af", fontFamily: "sans-serif", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "4px" }}>Property Analysis Report</div>
              <h1 style={{ fontSize: "26px", fontWeight: "bold", margin: 0 }}>
                {hasAcreage ? `${acreage}-Acre Land Assessment` : "Land Assessment"}
              </h1>
            </div>
          </div>

          {/* Summary Bar */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1px", background: "#e5e7eb", border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden", marginBottom: "28px" }}>
            {[
              { label: "Property Size", value: hasAcreage ? `${acreage} acres` : "—" },
              { label: "Vegetation",    value: vegDesc.label },
              { label: "Terrain",       value: terrDesc.label },
              { label: "Accessibility", value: accessDesc.label },
            ].map((item, i) => (
              <div key={i} style={{ background: "#f9fafb", padding: "14px 16px" }}>
                <div style={{ fontSize: "9px", color: "#9ca3af", fontFamily: "sans-serif", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "3px" }}>{item.label}</div>
                <div style={{ fontSize: "13px", fontWeight: "600", fontFamily: "sans-serif", color: "#111827" }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Site Conditions */}
          <RPrintSection title="📋 Site Conditions Assessment" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "28px" }}>
            {[
              { title: "🌿 Vegetation", main: vegDesc.canopy, sub: vegDesc.detail },
              { title: "⛰️ Terrain",    main: terrDesc.slope,  sub: terrDesc.detail },
              { title: "🚗 Access",     main: accessDesc.impact, sub: accessDesc.detail },
            ].map((item, i) => (
              <div key={i} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "12px 14px" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", fontFamily: "sans-serif", marginBottom: "6px" }}>{item.title}</div>
                <div style={{ fontSize: "12px", fontWeight: "600", color: "#14532d", marginBottom: "4px" }}>{item.main}</div>
                <div style={{ fontSize: "11px", color: "#6b7280" }}>{item.sub}</div>
              </div>
            ))}
          </div>

          {/* Equipment */}
          <RPrintSection title="🔧 Recommended Equipment" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
            {equipment.map((eq, i) => (
              <span key={i} style={{ fontSize: "11px", padding: "3px 10px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: "4px", fontFamily: "sans-serif" }}>{eq}</span>
            ))}
          </div>
          <p style={{ fontSize: "10px", color: "#9ca3af", fontStyle: "italic", marginBottom: "24px", fontFamily: "sans-serif" }}>Common examples. Contractors may use different methods or equipment.</p>

          {/* Labor + Cost */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "28px" }}>
            {labor && (
              <div>
                <RPrintSection title="👷 Labor Estimate" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", textAlign: "center" }}>
                  {[
                    { value: labor.crew,       label: "Crew Size" },
                    { value: `${labor.hours}h`, label: "Est. Hours" },
                    { value: labor.difficulty,  label: "Difficulty" },
                  ].map((item, i) => (
                    <div key={i} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "10px 6px" }}>
                      <div style={{ fontSize: "20px", fontWeight: "bold", fontFamily: "sans-serif", color: "#14532d" }}>{item.value}</div>
                      <div style={{ fontSize: "9px", color: "#9ca3af", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "2px" }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {costRange && (
              <div>
                <RPrintSection title="💵 Cost Estimate" />
                <div style={{ border: "1px solid #e5e7eb", borderRadius: "6px", overflow: "hidden" }}>
                  <div style={{ padding: "12px 14px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "12px", color: "#6b7280", fontFamily: "sans-serif" }}>Estimated Range</span>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: "#14532d", fontFamily: "sans-serif" }}>
                      ${costRange.low.toLocaleString()} – ${costRange.high.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "11px", color: "#6b7280", fontFamily: "sans-serif" }}>Confidence</span>
                    <span style={{ fontSize: "11px", fontWeight: "600", color: confidence.level === "High" ? "#15803d" : confidence.level === "Medium" ? "#b45309" : "#b91c1c", fontFamily: "sans-serif" }}>
                      {confidence.level}
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: "10px", color: "#9ca3af", fontStyle: "italic", marginTop: "6px", fontFamily: "sans-serif" }}>
                  {confidence.reason}
                </p>
              </div>
            )}
          </div>

          {/* Risk Factors */}
          <RPrintSection title="⚠️ Key Risk Factors" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "28px" }}>
            {risks.map((risk, i) => (
              <div key={i} style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "5px", padding: "8px 12px", fontSize: "11px", color: "#78350f", display: "flex", gap: "6px" }}>
                <span>⚠</span><span>{risk}</span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <div style={{ fontSize: "10px", color: "#6b7280", fontFamily: "sans-serif", marginBottom: "4px" }}>
                🔒 Report locked at time of generation. Data is immutable.
              </div>
              <p style={{ fontSize: "10px", color: "#9ca3af", fontFamily: "sans-serif", maxWidth: "460px", lineHeight: 1.5, margin: 0 }}>
                This analysis is for informational and planning purposes only. It is not a legal survey, engineering assessment, or guarantee of conditions. Verify critical details with qualified professionals before making decisions.
              </p>
            </div>
            <div style={{ textAlign: "right", fontFamily: "sans-serif" }}>
              <div style={{ fontSize: "9px", color: "#9ca3af", letterSpacing: "0.05em" }}>REPORT ID</div>
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#14532d", fontFamily: "monospace" }}>{reportNumber}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Print Section Header Helper ──────────────────────────────────────────────

function RPrintSection({ title }: { title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
      <span style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.08em", color: "#374151", fontFamily: "sans-serif" }}>{title}</span>
      <div style={{ flex: 1, height: "1px", background: "#e5e7eb" }} />
    </div>
  );
}

export default JobReport;
