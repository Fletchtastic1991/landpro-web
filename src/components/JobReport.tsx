/**
 * LandPro — JobReport.tsx
 * src/components/JobReport.tsx
 *
 * DISPLAY ONLY — zero calculations, zero business logic
 * Reads exclusively from ReportView (built by buildReportView)
 * If you find yourself writing math here → it belongs in an engine
 */

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LandSelections } from "@/components/LandSelectors";
import { cn } from "@/lib/utils";
import {
  Calendar, Ruler, Leaf, Mountain, MapPin,
  Lock, Download, CheckCircle2, DollarSign,
  FileText, Droplets, Building2, Trash2
} from "lucide-react";
import { format } from "date-fns";
import { runLandProEngine } from "@/engines/LandProEngine";
import { buildReportView, ReportView } from "@/engines/buildReportView";

// ─── Props ────────────────────────────────────────────────────────────────────

interface JobReportProps {
  propertyData: {
    acreage:      number | null;
    squareMeters: number | null;
    boundary?:    GeoJSON.Polygon | null;
  };
  selections: LandSelections;
  className?: string;
}

// ─── Dark palette (display constants only) ───────────────────────────────────

const D = {
  bg:        "#0d1f13",
  bgCard:    "#122018",
  bgSect:    "#172b1e",
  border:    "#1f3829",
  borderAcc: "#2d5a3d",
  primary:   "#22c55e",
  primaryDk: "#16a34a",
  text:      "#e5e7eb",
  muted:     "#9ca3af",
  dim:       "#6b7280",
  blueBg:    "#0c1929",
  blue:      "#60a5fa",
  blueBrd:   "#1e3a5f",
  amberBg:   "#1c1208",
  amber:     "#fcd34d",
  amberBrd:  "#854d0e",
};

// ─── Label maps (display only) ────────────────────────────────────────────────

const VEG_L  = { light: "Light Vegetation", medium: "Medium Vegetation", heavy: "Heavy Vegetation" };
const TER_L  = { flat: "Flat Terrain",       slight_slope: "Slight Slope",    steep: "Steep Terrain"   };
const ACC_L  = { easy: "Easy Access",        moderate: "Moderate Access",     difficult: "Difficult Access" };
const WAT_L  = { none: "None",               pond_or_creek: "Pond or creek",  wetland: "Wetland area" };
const STR_L  = { none: "None",               fencing: "Existing fencing",     buildings_utilities: "Buildings / Utilities" };
const DEB_L  = { none: "None",               light: "Light debris",           heavy: "Heavy debris / trash" };

function genReportNum() {
  return `LP-${format(new Date(), "yyyyMMdd")}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

const JobReport: React.FC<JobReportProps> = ({ propertyData, selections, className }) => {
  const [generated, setGenerated] = useState(false);
  const [reportNum] = useState(genReportNum);
  const [lockedAt]  = useState(() => new Date());

  const acres   = propertyData.acreage ?? 0;
  const hasAcre = acres > 0;

  // ── Run engine + build view (memoized so it doesn't re-run on every render)
  const view: ReportView = useMemo(() => {
    if (!hasAcre) return { hasData: false, fence: null, clearing: null };
    const engine = runLandProEngine({
      acreage:    acres,
      boundary:   propertyData.boundary,
      selections,
    });
    return buildReportView(engine, selections);
  }, [acres, propertyData.boundary, selections]);

  const { fence, clearing } = view;
  const confBadge = clearing ? {
    High:   "bg-green-500/20 text-green-400 border-green-500/30",
    Medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    Low:    "bg-red-500/20 text-red-400 border-red-500/30",
  }[clearing.confidence.level] : "";

  const fenceType = (selections as any).fenceType ?? "farm";

  // ── Pre-generate preview ──────────────────────────────────────────────────

  if (!generated) {
    return (
      <Card className={cn("overflow-hidden border-2", className)}>
        <CardHeader className="bg-primary/5 border-b py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Job Summary Report
            </CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />{new Date().toLocaleString()}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">

          {/* 6-field grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { icon: Ruler,     label: "Property Size", value: hasAcre ? `${acres} Acres` : "Not defined", color: "bg-blue-500/10 text-blue-400" },
              { icon: Leaf,      label: "Vegetation",    value: VEG_L[selections.vegetation],                color: "bg-green-500/10 text-green-400" },
              { icon: Mountain,  label: "Terrain",       value: TER_L[selections.terrain],                   color: "bg-amber-500/10 text-amber-400" },
              { icon: MapPin,    label: "Accessibility", value: ACC_L[selections.accessibility],             color: "bg-purple-500/10 text-purple-400" },
              { icon: Droplets,  label: "Water",         value: WAT_L[selections.water],                     color: "bg-cyan-500/10 text-cyan-400" },
              { icon: Building2, label: "Structures",    value: STR_L[selections.structures],                color: "bg-orange-500/10 text-orange-400" },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="flex items-center justify-between p-3 rounded-lg border bg-background/50">
                <div className="flex items-center gap-2">
                  <div className={cn("p-1.5 rounded-md", color)}><Icon className="h-3.5 w-3.5" /></div>
                  <span className="text-xs font-medium text-muted-foreground">{label}</span>
                </div>
                <span className="text-xs font-bold text-right max-w-[130px] leading-tight">{value}</span>
              </div>
            ))}
          </div>

          {/* Mode chips */}
          <div className="flex flex-wrap gap-2">
            {clearing && <Chip label="Production Rate" value={clearing.productionRate} />}
            {fence    && <Chip label="Fence Type"      value={fence.fenceTypeLabel} />}
            {fence    && <Chip label="Post Spacing"    value={`${fence.spacingFt} ft`} />}
            {fence?.gateDeductionFt && (
              <Chip label={`${selections.gateCount ?? 0} gate${(selections.gateCount??0)>1?"s":""}`}
                    value={`${fence.gateDeductionFt} deducted`} />
            )}
          </div>

          {/* Debris callout */}
          {selections.debris !== "none" && (
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-amber-500/5 border-amber-500/20">
              <Trash2 className="h-4 w-4 text-amber-400 flex-shrink-0" />
              <p className="text-sm text-amber-400 font-medium">{DEB_L[selections.debris]} — disposal costs factored in</p>
            </div>
          )}

          {/* Quick stats */}
          {hasAcre && fence && clearing && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: fence.isRealBoundary ? "True Perimeter" : "Est. Perimeter ⁽*⁾", value: fence.perimeterFt },
                { label: `Total Posts (${fence.fenceTypeLabel})`,                         value: String(fence.posts.total) },
                { label: `Clearing Hours (${clearing.productionRate})`,                   value: clearing.hours.adjusted },
                { label: "Est. Total Cost",                                                value: clearing.cost.totalRange },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 rounded-lg border bg-primary/5 text-center">
                  <p className="text-lg font-bold text-primary">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{label}</p>
                </div>
              ))}
            </div>
          )}

          {!fence?.isRealBoundary && hasAcre && (
            <p className="text-xs text-muted-foreground/70 italic">
              ⁽*⁾ Perimeter estimated from square-lot assumption — draw your boundary for real numbers.
            </p>
          )}

          {/* Cost badge */}
          {clearing && (
            <div className="p-4 rounded-lg border bg-primary/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><DollarSign className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Estimated Total Cost</p>
                  <p className="text-2xl font-bold text-primary">{clearing.cost.totalRange}</p>
                  <p className="text-xs text-muted-foreground">Derived from hours × rates — not $/acre guessing</p>
                </div>
              </div>
              <Badge className={cn("border text-xs", confBadge)}>{clearing.confidence.level} Confidence</Badge>
            </div>
          )}

          {/* Fence warnings */}
          {fence?.warnings && fence.warnings.length > 0 && (
            <div className="space-y-1">
              {fence.warnings.map((w, i) => <p key={i} className="text-xs text-amber-400">⚠ {w}</p>)}
            </div>
          )}

          {/* CTA */}
          {hasAcre ? (
            <div className="pt-2 space-y-3">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {[
                  fence?.isRealBoundary ? "Real perimeter + corners from polygon" : "Perimeter estimate",
                  "Gate width deducted before post calc",
                  "Hours × rates — not $/acre",
                  "Fixed addons not stacked %",
                  "Locked report + PDF",
                ].map(item => (
                  <div key={item} className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-primary" />{item}
                  </div>
                ))}
              </div>
              <Button size="lg" className="w-full text-base font-semibold gap-2" onClick={() => setGenerated(true)}>
                <Lock className="h-4 w-4" /> Generate Property Analysis Report
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Generating locks this assessment — unique report number and timestamp created.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Draw a property boundary on the map above to enable report generation.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // ── Generated dark report ─────────────────────────────────────────────────

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 gap-1 text-xs">
            <Lock className="h-3 w-3" /> Locked {format(lockedAt, "MMM d, yyyy 'at' h:mm a")}
          </Badge>
          <span className="text-sm text-muted-foreground font-mono">{reportNum}</span>
        </div>
        <Button size="sm" className="gap-2" onClick={() => {
          const el = document.getElementById("lp-report-doc");
          if (!el) return;
          const w = window.open("", "_blank");
          if (!w) return;
          w.document.write(`<!DOCTYPE html><html><head><title>LandPro ${reportNum}</title>
            <style>*{margin:0;padding:0;box-sizing:border-box;}body{background:#0d1f13;color:#e5e7eb;font-family:Georgia,serif;padding:40px;}
            @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact;}}</style>
            </head><body>${el.outerHTML}</body></html>`);
          w.document.close(); w.focus();
          setTimeout(() => { w.print(); w.close(); }, 500);
        }}>
          <Download className="h-4 w-4" /> Download PDF
        </Button>
      </div>

      <div style={{ borderRadius:"12px", overflow:"hidden", border:`1px solid ${D.borderAcc}`, boxShadow:"0 4px 32px rgba(0,0,0,0.5)" }}>
        <div id="lp-report-doc" style={{ background:D.bg, color:D.text, padding:"44px 48px", fontFamily:"Georgia,serif", lineHeight:1.6 }}>

          {/* Header */}
          <div style={{ borderBottom:`2px solid ${D.primaryDk}`, paddingBottom:"24px", marginBottom:"28px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"4px" }}>
                  <div style={{ width:"28px", height:"28px", background:D.primaryDk, borderRadius:"6px", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <span style={{ color:"#fff", fontWeight:"bold", fontSize:"12px" }}>LP</span>
                  </div>
                  <span style={{ fontSize:"18px", fontWeight:"bold", color:D.primary, fontFamily:"sans-serif" }}>LandPro</span>
                </div>
                <div style={{ fontSize:"10px", color:D.dim, fontFamily:"sans-serif", letterSpacing:"0.06em" }}>LAND INTELLIGENCE PLATFORM</div>
              </div>
              <div style={{ textAlign:"right", fontFamily:"sans-serif" }}>
                <div style={{ fontSize:"10px", color:D.dim, letterSpacing:"0.08em", textTransform:"uppercase" }}>Report Number</div>
                <div style={{ fontSize:"16px", fontWeight:"bold", color:D.primary, fontFamily:"monospace" }}>{reportNum}</div>
                <div style={{ fontSize:"10px", color:D.dim, marginTop:"2px" }}>Generated {format(lockedAt, "MMMM d, yyyy 'at' h:mm a")}</div>
              </div>
            </div>
            <div style={{ marginTop:"20px" }}>
              <div style={{ fontSize:"10px", color:D.dim, fontFamily:"sans-serif", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"4px" }}>Property Analysis Report</div>
              <h1 style={{ fontSize:"26px", fontWeight:"bold", margin:0, color:D.text }}>
                {hasAcre ? `${acres}-Acre Land Assessment` : "Land Assessment"}
              </h1>
            </div>
          </div>

          {/* Summary bar */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:"1px", background:D.border, border:`1px solid ${D.border}`, borderRadius:"8px", overflow:"hidden", marginBottom:"28px" }}>
            {[
              { l:"Property Size", v: hasAcre ? `${acres} acres` : "—" },
              { l:"Vegetation",    v: VEG_L[selections.vegetation] },
              { l:"Terrain",       v: TER_L[selections.terrain] },
              { l:"Accessibility", v: ACC_L[selections.accessibility] },
              { l:"Water",         v: WAT_L[selections.water] },
              { l:"Debris",        v: DEB_L[selections.debris] },
            ].map((item, i) => (
              <div key={i} style={{ background:D.bgCard, padding:"12px 10px" }}>
                <div style={{ fontSize:"8px", color:D.dim, fontFamily:"sans-serif", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"3px" }}>{item.l}</div>
                <div style={{ fontSize:"11px", fontWeight:"600", fontFamily:"sans-serif", color:D.text }}>{item.v}</div>
              </div>
            ))}
          </div>

          {/* FencePro section */}
          {fence && (
            <>
              <RH label={`🔲  FencePro — ${fence.fenceTypeLabel} Fence`} D={D} />
              <div style={{ background:D.bgSect, border:`1px solid ${D.border}`, borderRadius:"6px", padding:"16px 18px", marginBottom:"20px" }}>
                <Row label={`Perimeter ${fence.isRealBoundary ? "(measured from boundary)" : "(est. square lot)"}`} value={fence.perimeterFt} D={D} bold />
                {fence.gateDeductionFt && (
                  <Row label={`Gate deduction (${selections.gateCount ?? 0} × ${selections.gateWidthFt ?? 12} ft)`} value={`− ${fence.gateDeductionFt}`} D={D} dim />
                )}
                <Row label="Effective fence length" value={fence.effectiveFenceFt} D={D} />

                <div style={{ marginTop:"12px", borderTop:`1px solid ${D.border}`, paddingTop:"10px" }}>
                  <Sect label={`Posts at ${fence.spacingFt} ft spacing`} D={D} />
                  <Row label={`Line posts`}                                        value={`${fence.posts.line} posts`}   D={D} />
                  <Row label={`Corner posts (${fence.cornerCount} detected)`}      value={`+ ${fence.posts.corner}`}     D={D} dim />
                  <Row label={`Gate posts (${selections.gateCount ?? 0} × 2)`}    value={`+ ${fence.posts.gate}`}       D={D} dim />
                  <div style={{ borderTop:`1px solid ${D.borderAcc}`, marginTop:"8px", paddingTop:"8px", display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontSize:"14px", fontWeight:"700", color:D.text, fontFamily:"sans-serif" }}>Total Posts</span>
                    <span style={{ fontSize:"22px", fontWeight:"800", color:D.primary, fontFamily:"sans-serif" }}>{fence.posts.total}</span>
                  </div>
                </div>

                <div style={{ marginTop:"12px", borderTop:`1px solid ${D.border}`, paddingTop:"10px" }}>
                  <Sect label="Materials" D={D} />
                  <Row label={`Concrete (${fence.materials.concretePerPost} bags/post)`} value={fence.materials.concreteBags} D={D} />
                  {fence.materials.railLinearFt  && <Row label={`Rails (${fence.materials.railsPerSpan}/span)`}     value={fence.materials.railLinearFt}  D={D} />}
                  {fence.materials.wireLinearFt  && <Row label={`Wire (${fence.materials.wireStrands} strands)`}    value={fence.materials.wireLinearFt}  D={D} />}
                  <Row label="Fence material" value={fence.materials.fenceMaterialFt} D={D} />
                </div>

                <div style={{ marginTop:"12px", borderTop:`1px solid ${D.border}`, paddingTop:"10px" }}>
                  <Sect label="Labor + Cost" D={D} />
                  <Row label={`Posts/day: ${fence.labor.basePostsPerDay} × ${fence.labor.terrainFactor} terrain`} value={`${fence.labor.adjustedPostsPerDay} posts/day`} D={D} />
                  <Row label="Days required" value={fence.labor.daysRange} D={D} />
                  <Row label="Labor cost"    value={fence.labor.laborCostRange} D={D} />
                  <Row label="Material cost" value={fence.labor.materialCost}   D={D} />
                  <div style={{ borderTop:`1px solid ${D.borderAcc}`, marginTop:"8px", paddingTop:"8px", display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontSize:"13px", fontWeight:"700", color:D.text, fontFamily:"sans-serif" }}>FencePro Total (+{fence.labor.markupPct}% markup)</span>
                    <span style={{ fontSize:"20px", fontWeight:"800", color:D.primary, fontFamily:"sans-serif" }}>{fence.costRange}</span>
                  </div>
                </div>

                {fence.warnings.length > 0 && (
                  <div style={{ marginTop:"10px" }}>
                    {fence.warnings.map((w, i) => (
                      <div key={i} style={{ fontSize:"10px", color:D.amber, fontFamily:"sans-serif", marginBottom:"3px" }}>⚠ {w}</div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ClearingPro section */}
          {clearing && (
            <>
              <RH label={`💵  Clearing Cost — ${clearing.productionRate} Production Rate`} D={D} />
              <div style={{ background:D.bgSect, border:`1px solid ${D.borderAcc}`, borderRadius:"6px", padding:"16px 18px", marginBottom:"20px" }}>
                <Sect label="Hours Required" D={D} />
                <Row label={`Base: ${acres} acres × base rate (${VEG_L[selections.vegetation].toLowerCase()})`} value={clearing.hours.base} D={D} bold />
                {clearing.hours.factors.map((f, i) => <Row key={i} label={f} value="" D={D} dim />)}
                <Row label="Adjusted total hours" value={clearing.hours.adjusted} D={D} />

                <div style={{ marginTop:"12px", borderTop:`1px solid ${D.border}`, paddingTop:"10px" }}>
                  <Sect label="Labor Cost" D={D} />
                  <Row label={`Machine: ${clearing.hours.adjusted} × $150/hr`} value={clearing.cost.machineRange} D={D} />
                  <Row label={`Crew: ${clearing.hours.adjusted} × ${clearing.crew.size} ops × $50/hr`} value={clearing.cost.laborRange} D={D} />
                </div>

                {clearing.cost.addons.length > 0 && (
                  <div style={{ marginTop:"12px", borderTop:`1px solid ${D.border}`, paddingTop:"10px" }}>
                    <Sect label="Fixed Addons" D={D} />
                    {clearing.cost.addons.map((a, i) => <Row key={i} label={a.label} value={a.range} D={D} dim />)}
                  </div>
                )}

                <div style={{ borderTop:`2px solid ${D.primaryDk}`, marginTop:"14px", paddingTop:"14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:"15px", fontWeight:"700", color:D.text, fontFamily:"sans-serif" }}>Clearing Total</span>
                  <span style={{ fontSize:"26px", fontWeight:"800", color:D.primary, fontFamily:"sans-serif" }}>{clearing.cost.totalRange}</span>
                </div>

                <div style={{ marginTop:"12px", borderTop:`1px solid ${D.border}`, paddingTop:"10px", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    {clearing.confidence.reasons.map((r, i) => (
                      <div key={i} style={{ fontSize:"10px", color:D.dim, fontFamily:"sans-serif", marginBottom:"2px" }}>
                        {i < clearing.confidence.reasons.length - 1 ? `⚠ ${r}` : `ℹ ${r}`}
                      </div>
                    ))}
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0, marginLeft:"16px" }}>
                    <div style={{ fontSize:"10px", color:D.dim, fontFamily:"sans-serif" }}>CONFIDENCE</div>
                    <div style={{ fontSize:"20px", fontWeight:"800", color:clearing.confidence.color, fontFamily:"sans-serif" }}>{clearing.confidence.level}</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Materials */}
          {clearing?.materials && (
            <>
              <RH label="🪵  Material Estimate" D={D} />
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginBottom:"8px" }}>
                <SB value={clearing.materials.landscapedSqFt}  label="Landscaped sq ft"  D={D} />
                <SB value={clearing.materials.mulchCubicYards} label={'Mulch (3" depth)'} D={D} />
              </div>
              <p style={{ fontSize:"10px", color:D.dim, fontStyle:"italic", marginBottom:"24px" }}>
                Assuming ~{clearing.materials.assumedPct}% of lot landscaped, 3-inch mulch depth.
              </p>
            </>
          )}

          {/* Equipment */}
          {clearing?.equipment && clearing.equipment.length > 0 && (
            <>
              <RH label="🔧  Recommended Equipment" D={D} />
              <div style={{ display:"flex", flexWrap:"wrap", gap:"6px", marginBottom:"8px" }}>
                {clearing.equipment.map((e, i) => (
                  <span key={i} style={{ fontSize:"11px", padding:"3px 10px", background:D.blueBg, color:D.blue, border:`1px solid ${D.blueBrd}`, borderRadius:"4px", fontFamily:"sans-serif" }}>{e}</span>
                ))}
              </div>
              <p style={{ fontSize:"10px", color:D.dim, fontStyle:"italic", marginBottom:"24px", fontFamily:"sans-serif" }}>Common examples. Contractors may use different methods.</p>
            </>
          )}

          {/* Footer */}
          <div style={{ borderTop:`1px solid ${D.border}`, paddingTop:"16px", display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
            <div>
              <div style={{ fontSize:"10px", color:D.primary, fontFamily:"sans-serif", marginBottom:"4px" }}>
                🔒 Report locked at time of generation. Data is immutable.
              </div>
              <p style={{ fontSize:"10px", color:D.dim, fontFamily:"sans-serif", maxWidth:"460px", lineHeight:1.5, margin:0 }}>
                This analysis is for informational and planning purposes only. Not a legal survey or engineering assessment. Verify critical details with qualified professionals before making decisions.
              </p>
            </div>
            <div style={{ textAlign:"right", fontFamily:"sans-serif" }}>
              <div style={{ fontSize:"9px", color:D.dim, letterSpacing:"0.05em" }}>REPORT ID</div>
              <div style={{ fontSize:"12px", fontWeight:"700", color:D.primary, fontFamily:"monospace" }}>{reportNum}</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// ─── Display helpers (no logic — formatting only) ─────────────────────────────

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-primary/5 text-xs">
      <span className="text-muted-foreground">{label}:</span>
      <span className="text-primary font-semibold">{value}</span>
    </div>
  );
}

function RH({ label, D }: { label: string; D: any }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"10px" }}>
      <span style={{ fontSize:"11px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.08em", color:"#9ca3af", fontFamily:"sans-serif" }}>{label}</span>
      <div style={{ flex:1, height:"1px", background:"#1f3829" }} />
    </div>
  );
}

function Sect({ label, D }: { label: string; D: any }) {
  return <div style={{ fontSize:"10px", color:D.dim, fontFamily:"sans-serif", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:"8px" }}>{label}</div>;
}

function SB({ value, label, D }: { value: string; label: string; D: any }) {
  return (
    <div style={{ textAlign:"center", background:D.bgCard, border:`1px solid ${D.border}`, borderRadius:"5px", padding:"10px 8px" }}>
      <div style={{ fontSize:"18px", fontWeight:"bold", color:D.primary, fontFamily:"sans-serif" }}>{value}</div>
      <div style={{ fontSize:"9px", color:D.dim, fontFamily:"sans-serif", textTransform:"uppercase", marginTop:"2px" }}>{label}</div>
    </div>
  );
}

function Row({ label, value, D, bold, dim }: { label: string; value: string; D: any; bold?: boolean; dim?: boolean }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", padding:"5px 0", borderBottom:`1px solid ${D.border}` }}>
      <span style={{ fontSize:"11px", color:dim ? D.dim : D.muted, fontFamily:"sans-serif", fontWeight:bold ? "600" : "400", maxWidth:"72%", lineHeight:1.4 }}>{label}</span>
      {value && <span style={{ fontSize:"12px", fontWeight:bold ? "700" : "600", color:bold ? D.text : D.primary, fontFamily:"sans-serif", whiteSpace:"nowrap", marginLeft:"12px" }}>{value}</span>}
    </div>
  );
}

export default JobReport;