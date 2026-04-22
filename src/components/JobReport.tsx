import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LandSelections } from "@/components/LandSelectors";
import { cn } from "@/lib/utils";
import {
  Calendar, Ruler, Leaf, Mountain, MapPin,
  Lock, Download, CheckCircle2, DollarSign, FileText,
  Droplets, Building2, Trash2
} from "lucide-react";
import { format } from "date-fns";
import { runLenses, buildLensProject, buildFenceInputs } from "@/lib/lenses/registry";

interface JobReportProps {
  propertyData: {
    acreage: number | null;
    squareMeters: number | null;
    boundary?: GeoJSON.Polygon | null;
  };
  selections: LandSelections;
  className?: string;
}

// ─── Dark palette ─────────────────────────────────────────────────────────────

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

// ─── Cost Engine (inline — will become ClearingPro lens later) ────────────────

const PROD_HOURS: Record<string, Record<string, { min: number; max: number }>> = {
  conservative: { light: { min: 12, max: 20 }, medium: { min: 28, max: 50 }, heavy: { min: 60, max: 100 } },
  standard:     { light: { min: 8,  max: 16 }, medium: { min: 18, max: 36 }, heavy: { min: 40, max: 80  } },
  aggressive:   { light: { min: 5,  max: 10 }, medium: { min: 12, max: 24 }, heavy: { min: 28, max: 55  } },
};
const TERRAIN_HRS  = { flat: 1.0, slight_slope: 1.20, steep: 1.50 };
const ACCESS_HRS   = { easy: 1.0, moderate: 1.20,     difficult: 1.45 };
const WATER_HRS    = { none: 1.0, pond_or_creek: 1.15, wetland: 1.30 };
const MACHINE_RATE = 150;
const LABOR_RATE   = 50;

function getAddons(s: LandSelections) {
  const a: { label: string; low: number; high: number }[] = [];
  if (s.debris === "light") a.push({ label: "Light debris haul-off", low: 500,  high: 1500 });
  if (s.debris === "heavy") a.push({ label: "Heavy debris haul-off", low: 2000, high: 6000 });
  if (s.water === "pond_or_creek") a.push({ label: "Erosion control / silt fencing", low: 300, high: 800 });
  if (s.water === "wetland")       a.push({ label: "Wetland erosion control + consultant", low: 1500, high: 5000 });
  if (s.accessibility === "difficult") a.push({ label: "Equipment mobilization (remote site)", low: 1000, high: 3000 });
  if (s.structures === "fencing")      a.push({ label: "Remove existing fencing", low: 300, high: 1000 });
  if (s.structures === "buildings_utilities") a.push({ label: "Utility locate + demo", low: 500, high: 2500 });
  return a;
}

function calcCostEngine(acres: number, s: LandSelections) {
  const rate   = s.productionRate ?? "standard";
  const base   = PROD_HOURS[rate][s.vegetation];
  const tFac   = TERRAIN_HRS[s.terrain];
  const aFac   = ACCESS_HRS[s.accessibility];
  const wFac   = WATER_HRS[s.water];
  const crew   = s.vegetation === "light" ? 2 : s.vegetation === "medium" ? 3 : 5;
  const diff   = s.vegetation === "heavy" || s.terrain === "steep" || s.accessibility === "difficult" ? "Challenging"
               : s.vegetation === "medium" || s.terrain === "slight_slope" ? "Moderate" : "Standard";
  const adjMin = Math.round(base.min * acres * tFac * aFac * wFac * 10) / 10;
  const adjMax = Math.round(base.max * acres * tFac * aFac * wFac * 10) / 10;
  const addons = getAddons(s);
  const addonMin = addons.reduce((s, a) => s + a.low,  0);
  const addonMax = addons.reduce((s, a) => s + a.high, 0);
  const totalMin = Math.round((adjMin * MACHINE_RATE + adjMin * crew * LABOR_RATE + addonMin) / 100) * 100;
  const totalMax = Math.round((adjMax * MACHINE_RATE + adjMax * crew * LABOR_RATE + addonMax) / 100) * 100;
  return { rate, base, adjMin, adjMax, crew, diff, addons, totalMin, totalMax, tFac, aFac, wFac };
}

function calcMaterials(acres: number) {
  const sqFt    = Math.round(acres * 43560 * 0.20);
  const mulchCy = Math.round(((sqFt * (3/12)) / 27) * 10) / 10;
  return { sqFt, mulchCy };
}

function getConfidence(s: LandSelections): { level: "Low" | "Medium" | "High"; reasons: string[] } {
  const r: string[] = [];
  if (s.vegetation === "heavy")               r.push("Heavy vegetation — density varies significantly");
  if (s.terrain === "steep")                  r.push("Steep terrain — equipment efficiency unpredictable");
  if (s.accessibility === "difficult")        r.push("Difficult access — mobilization costs vary");
  if (s.water === "wetland")                  r.push("Wetland — regulatory and scope uncertainty");
  if (s.water === "pond_or_creek")            r.push("Water present — erosion control scope unknown");
  if (s.structures === "buildings_utilities") r.push("Utilities present — below-grade conditions unknown");
  if (s.debris === "heavy")                   r.push("Heavy debris — disposal cost varies by material");
  r.push("Site visit required to confirm all conditions");
  return { level: r.length <= 2 ? "High" : r.length <= 4 ? "Medium" : "Low", reasons: r };
}

function getEquipment(s: LandSelections): string[] {
  const eq: string[] = [];
  if (s.vegetation === "light")        eq.push("Skid steer with brush cutter", "Disc mower or rotary cutter");
  else if (s.vegetation === "medium")  eq.push("Forestry mulcher", "Skid steer with grapple", "Mid-size bulldozer (D4–D5)");
  else                                 eq.push("Heavy-duty bulldozer (D6/D7)", "Excavator with thumb (20–30 ton)", "Forestry mulcher or tub grinder", "Haul trucks for debris removal");
  if (s.terrain === "steep")           eq.push("Track-mounted equipment only", "Erosion control materials");
  if (s.accessibility === "difficult") eq.push("Low-ground-pressure equipment");
  if (s.water === "pond_or_creek")     eq.push("Silt fencing / sediment barriers");
  if (s.water === "wetland")           eq.push("Wetland-rated equipment", "Environmental consultant required");
  if (s.structures === "buildings_utilities") eq.push("Utility locate service (call 811 first)");
  if (s.debris === "heavy")            eq.push("Dumpsters / additional haul trucks");
  return eq;
}

// ─── Labels ───────────────────────────────────────────────────────────────────

const VEG_L   = { light: "Light Vegetation", medium: "Medium Vegetation", heavy: "Heavy Vegetation" };
const TER_L   = { flat: "Flat Terrain", slight_slope: "Slight Slope", steep: "Steep Terrain" };
const ACC_L   = { easy: "Easy Access", moderate: "Moderate Access", difficult: "Difficult Access" };
const WAT_L   = { none: "None", pond_or_creek: "Pond or creek present", wetland: "Wetland area" };
const STR_L   = { none: "None", fencing: "Existing fencing", buildings_utilities: "Buildings / Utilities" };
const DEB_L   = { none: "None", light: "Light debris", heavy: "Heavy debris / trash" };
const RATE_L  = { conservative: "Conservative", standard: "Standard", aggressive: "Aggressive" };
const FENCE_L = { wood: "Wood", chain_link: "Chain Link", farm: "Farm / Agricultural" };

function genReportNum() {
  return `LP-${format(new Date(), "yyyyMMdd")}-${Math.random().toString(36).substring(2,6).toUpperCase()}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

const JobReport: React.FC<JobReportProps> = ({ propertyData, selections, className }) => {
  const [generated, setGenerated] = useState(false);
  const [reportNum] = useState(genReportNum);
  const [lockedAt]  = useState(() => new Date());

  const acres   = propertyData.acreage ?? 0;
  const hasAcre = acres > 0;

  // ── Run lens engine ──────────────────────────────────────────────────────
  const lensProject = buildLensProject(propertyData, selections);
  const fenceInputs = buildFenceInputs(selections);
  const lensResults = runLenses(
    lensProject,
    { fencing: true },
    { fencing: fenceInputs }
  );
  const fence = hasAcre ? lensResults["fencing"] : null;
  const fenceSum = fence?.summary as any;
  const fenceDet = fence?.details as any;

  // ── Inline cost engine (ClearingPro lens — coming next) ──────────────────
  const cost  = hasAcre ? calcCostEngine(acres, selections) : null;
  const mats  = hasAcre ? calcMaterials(acres) : null;
  const equip = getEquipment(selections);
  const conf  = getConfidence(selections);

  const confColor = { High: "#4ade80", Medium: "#fbbf24", Low: "#f87171" }[conf.level];
  const confBadge = {
    High:   "bg-green-500/20 text-green-400 border-green-500/30",
    Medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    Low:    "bg-red-500/20 text-red-400 border-red-500/30",
  }[conf.level];

  const fenceType = (selections as any).fenceType ?? "farm";

  // ── Pre-generate ──────────────────────────────────────────────────────────
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

          <div className="flex flex-wrap gap-2">
            <Chip label="Production Rate" value={RATE_L[selections.productionRate]} />
            <Chip label="Fence Type"      value={FENCE_L[fenceType as keyof typeof FENCE_L] ?? fenceType} />
            <Chip label="Post Spacing"    value={`${selections.fenceSpacingFt ?? 8} ft`} />
            {(selections.gateCount ?? 0) > 0 && (
              <Chip label={`${selections.gateCount} gate${(selections.gateCount??0)>1?"s":""}`}
                    value={`${(selections.gateCount??0) * (selections.gateWidthFt??12)} ft deducted`} />
            )}
          </div>

          {selections.debris !== "none" && (
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-amber-500/5 border-amber-500/20">
              <Trash2 className="h-4 w-4 text-amber-400 flex-shrink-0" />
              <p className="text-sm text-amber-400 font-medium">{DEB_L[selections.debris]} — disposal costs factored in</p>
            </div>
          )}

          {hasAcre && fence && cost && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: fenceSum?.isRealBoundary ? "True Perimeter" : "Est. Perimeter ⁽*⁾", value: `${(fenceSum?.perimeterFt ?? 0).toLocaleString()} ft` },
                { label: `Total Posts (${FENCE_L[fenceType as keyof typeof FENCE_L]})`,       value: `${fenceSum?.totalPosts ?? "—"}` },
                { label: `Clearing Hours (${RATE_L[selections.productionRate]})`,              value: `${cost.adjMin}–${cost.adjMax} hrs` },
                { label: "Est. Total Cost",                                                     value: `$${cost.totalMin.toLocaleString()}–$${cost.totalMax.toLocaleString()}` },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 rounded-lg border bg-primary/5 text-center">
                  <p className="text-lg font-bold text-primary">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{label}</p>
                </div>
              ))}
            </div>
          )}

          {fence?.warnings && fence.warnings.length > 0 && (
            <div className="space-y-1">
              {fence.warnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-400">⚠ {w}</p>
              ))}
            </div>
          )}

          {cost && (
            <div className="p-4 rounded-lg border bg-primary/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><DollarSign className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Estimated Total Cost</p>
                  <p className="text-2xl font-bold text-primary">${cost.totalMin.toLocaleString()} – ${cost.totalMax.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Derived from hours × rates, not $/acre guessing</p>
                </div>
              </div>
              <Badge className={cn("border text-xs", confBadge)}>{conf.level} Confidence</Badge>
            </div>
          )}

          {hasAcre ? (
            <div className="pt-2 space-y-3">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {[
                  "FencePro lens — geometry + structure + materials + labor",
                  fenceSum?.isRealBoundary ? "Real perimeter from polygon" : "Perimeter estimate",
                  "Gate width deducted from fence length",
                  "Hours × rates cost model",
                  "Locked PDF report",
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

      <div style={{ borderRadius: "12px", overflow: "hidden", border: `1px solid ${D.borderAcc}`, boxShadow: "0 4px 32px rgba(0,0,0,0.5)" }}>
        <div id="lp-report-doc" style={{ background: D.bg, color: D.text, padding: "44px 48px", fontFamily: "Georgia, serif", lineHeight: 1.6 }}>

          {/* Header */}
          <div style={{ borderBottom: `2px solid ${D.primaryDk}`, paddingBottom: "24px", marginBottom: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                  <div style={{ width: "28px", height: "28px", background: D.primaryDk, borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "#fff", fontWeight: "bold", fontSize: "12px" }}>LP</span>
                  </div>
                  <span style={{ fontSize: "18px", fontWeight: "bold", color: D.primary, fontFamily: "sans-serif" }}>LandPro</span>
                </div>
                <div style={{ fontSize: "10px", color: D.dim, fontFamily: "sans-serif", letterSpacing: "0.06em" }}>LAND INTELLIGENCE PLATFORM</div>
              </div>
              <div style={{ textAlign: "right", fontFamily: "sans-serif" }}>
                <div style={{ fontSize: "10px", color: D.dim, letterSpacing: "0.08em", textTransform: "uppercase" }}>Report Number</div>
                <div style={{ fontSize: "16px", fontWeight: "bold", color: D.primary, fontFamily: "monospace" }}>{reportNum}</div>
                <div style={{ fontSize: "10px", color: D.dim, marginTop: "2px" }}>Generated {format(lockedAt, "MMMM d, yyyy 'at' h:mm a")}</div>
              </div>
            </div>
            <div style={{ marginTop: "20px" }}>
              <div style={{ fontSize: "10px", color: D.dim, fontFamily: "sans-serif", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "4px" }}>Property Analysis Report</div>
              <h1 style={{ fontSize: "26px", fontWeight: "bold", margin: 0, color: D.text }}>
                {hasAcre ? `${acres}-Acre Land Assessment` : "Land Assessment"}
              </h1>
            </div>
          </div>

          {/* Summary bar */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: "1px", background: D.border, border: `1px solid ${D.border}`, borderRadius: "8px", overflow: "hidden", marginBottom: "28px" }}>
            {[
              { l: "Property Size", v: hasAcre ? `${acres} acres` : "—" },
              { l: "Vegetation",    v: VEG_L[selections.vegetation] },
              { l: "Terrain",       v: TER_L[selections.terrain] },
              { l: "Accessibility", v: ACC_L[selections.accessibility] },
              { l: "Water",         v: WAT_L[selections.water] },
              { l: "Debris",        v: DEB_L[selections.debris] },
            ].map((item, i) => (
              <div key={i} style={{ background: D.bgCard, padding: "12px 10px" }}>
                <div style={{ fontSize: "8px", color: D.dim, fontFamily: "sans-serif", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "3px" }}>{item.l}</div>
                <div style={{ fontSize: "11px", fontWeight: "600", fontFamily: "sans-serif", color: D.text }}>{item.v}</div>
              </div>
            ))}
          </div>

          {/* FencePro Section */}
          {fence && fenceDet && (
            <>
              <RH label={`🔲  FencePro — ${FENCE_L[fenceType as keyof typeof FENCE_L] ?? fenceType} Fence`} D={D} />
              <div style={{ background: D.bgSect, border: `1px solid ${D.border}`, borderRadius: "6px", padding: "16px 18px", marginBottom: "20px" }}>

                {/* Geometry */}
                <Row label={`Perimeter ${fenceSum?.isRealBoundary ? "(measured from drawn boundary)" : "(est. square lot)"}`}
                     value={`${(fenceSum?.perimeterFt ?? 0).toLocaleString()} ft`} D={D} bold />
                {(fenceDet?.totalGateWidthFt ?? 0) > 0 && (
                  <Row label={`Gate deduction: ${selections.gateCount ?? 0} gate${(selections.gateCount??0)>1?"s":""} × ${selections.gateWidthFt ?? 12} ft`}
                       value={`− ${fenceDet.totalGateWidthFt} ft`} D={D} dim />
                )}
                <Row label="Effective fence length"
                     value={`${(fenceSum?.effectiveFenceFt ?? 0).toLocaleString()} ft`} D={D} />

                {/* Post breakdown */}
                <div style={{ marginTop: "12px", borderTop: `1px solid ${D.border}`, paddingTop: "10px" }}>
                  <Sect label={`Post Layout (${fenceDet?.spacingFt ?? 8} ft spacing, ${FENCE_L[fenceType as keyof typeof FENCE_L] ?? fenceType})`} D={D} />
                  <Row label={`Line posts: ${(fenceSum?.effectiveFenceFt ?? 0).toLocaleString()} ft ÷ ${fenceDet?.spacingFt ?? 8} ft`}
                       value={`${fenceDet?.linePosts ?? "—"} posts`} D={D} />
                  <Row label={`Corner posts (${fenceDet?.cornerCount ?? "—"} corners detected)`}
                       value={`+ ${fenceDet?.cornerPosts ?? "—"} posts`} D={D} dim />
                  <Row label={`Gate posts (${selections.gateCount ?? 0} gates × 2)`}
                       value={`+ ${fenceDet?.gatePosts ?? "—"} posts`} D={D} dim />
                  <div style={{ borderTop: `1px solid ${D.borderAcc}`, marginTop: "8px", paddingTop: "8px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "14px", fontWeight: "700", color: D.text, fontFamily: "sans-serif" }}>Total Posts</span>
                    <span style={{ fontSize: "22px", fontWeight: "800", color: D.primary, fontFamily: "sans-serif" }}>{fenceSum?.totalPosts ?? "—"}</span>
                  </div>
                </div>

                {/* Materials */}
                <div style={{ marginTop: "12px", borderTop: `1px solid ${D.border}`, paddingTop: "10px" }}>
                  <Sect label="Materials" D={D} />
                  <Row label={`Concrete (${fenceDet?.fenceTypeRules?.concretePerPost ?? "—"} bags/post)`}
                       value={`${fenceDet?.concreteBags ?? "—"} bags`} D={D} />
                  {(fenceDet?.railLinearFt ?? 0) > 0 && (
                    <Row label={`Rails (${fenceDet?.fenceTypeRules?.railsPerSpan ?? "—"} per span)`}
                         value={`${(fenceDet?.railLinearFt ?? 0).toLocaleString()} linear ft`} D={D} />
                  )}
                  {(fenceDet?.wireLinearFt ?? 0) > 0 && (
                    <Row label={`Wire strands (${fenceDet?.fenceTypeRules?.wireStrands ?? "—"} strands)`}
                         value={`${(fenceDet?.wireLinearFt ?? 0).toLocaleString()} linear ft`} D={D} />
                  )}
                  <Row label="Fence material length"
                       value={`${(fenceDet?.fenceMaterialFt ?? 0).toLocaleString()} ft`} D={D} />
                </div>

                {/* Labor + Cost */}
                <div style={{ marginTop: "12px", borderTop: `1px solid ${D.border}`, paddingTop: "10px" }}>
                  <Sect label="Labor + Cost (FencePro)" D={D} />
                  <Row label={`Posts/day: ${fenceDet?.fenceTypeRules?.postsPerDay ?? "—"} base × ${fenceDet?.terrainFactor ?? 1} terrain factor`}
                       value={`${Math.round(fenceDet?.adjustedPostsPerDay ?? 0)} posts/day`} D={D} />
                  <Row label={`Days required: ${fenceSum?.totalPosts ?? "—"} posts ÷ ${Math.round(fenceDet?.adjustedPostsPerDay ?? 1)} posts/day`}
                       value={`${fenceSum?.daysLow ?? "—"}–${fenceSum?.daysHigh ?? "—"} days`} D={D} />
                  <Row label={`Labor: ${fenceSum?.daysLow ?? "—"}–${fenceSum?.daysHigh ?? "—"} days × $${fenceDet?.rates?.dailyRateUSD ?? "—"}/day`}
                       value={`$${(fenceDet?.laborCostLow ?? 0).toLocaleString()} – $${(fenceDet?.laborCostHigh ?? 0).toLocaleString()}`} D={D} />
                  <Row label={`Materials: posts + concrete`}
                       value={`$${(fenceDet?.materialCostBase ?? 0).toLocaleString()}`} D={D} />
                  <div style={{ borderTop: `1px solid ${D.borderAcc}`, marginTop: "8px", paddingTop: "8px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: D.text, fontFamily: "sans-serif" }}>FencePro Total (incl. {Math.round(((fenceDet?.rates?.markup ?? 1.2) - 1) * 100)}% markup)</span>
                    <span style={{ fontSize: "20px", fontWeight: "800", color: D.primary, fontFamily: "sans-serif" }}>
                      ${(fence.cost?.low ?? 0).toLocaleString()} – ${(fence.cost?.high ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Warnings */}
                {fence.warnings && fence.warnings.length > 0 && (
                  <div style={{ marginTop: "10px" }}>
                    {fence.warnings.map((w, i) => (
                      <div key={i} style={{ fontSize: "10px", color: D.amber, fontFamily: "sans-serif", marginBottom: "3px" }}>⚠ {w}</div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Cost Engine */}
          {cost && (
            <>
              <RH label={`💵  Clearing Cost — ${RATE_L[cost.rate]} Production Rate`} D={D} />
              <div style={{ background: D.bgSect, border: `1px solid ${D.borderAcc}`, borderRadius: "6px", padding: "16px 18px", marginBottom: "20px" }}>
                <Sect label="Hours Required" D={D} />
                <Row label={`${acres} acres × ${cost.base.min}–${cost.base.max} hrs/acre (${VEG_L[selections.vegetation].toLowerCase()}, ${RATE_L[cost.rate].toLowerCase()})`}
                     value={`${cost.adjMin}–${cost.adjMax} hrs`} D={D} bold />
                {cost.tFac > 1 && <Row label={`Terrain factor ×${cost.tFac}`} value="" D={D} dim />}
                {cost.aFac > 1 && <Row label={`Access factor ×${cost.aFac}`}  value="" D={D} dim />}
                {cost.wFac > 1 && <Row label={`Water factor ×${cost.wFac}`}   value="" D={D} dim />}

                <div style={{ marginTop: "12px", borderTop: `1px solid ${D.border}`, paddingTop: "10px" }}>
                  <Sect label="Labor Cost" D={D} />
                  <Row label={`Machine: ${cost.adjMin}–${cost.adjMax} hrs × $${MACHINE_RATE}/hr`}
                       value={`$${(cost.adjMin*MACHINE_RATE).toLocaleString()} – $${(cost.adjMax*MACHINE_RATE).toLocaleString()}`} D={D} />
                  <Row label={`Crew: ${cost.adjMin}–${cost.adjMax} hrs × ${cost.crew} ops × $${LABOR_RATE}/hr`}
                       value={`$${(cost.adjMin*cost.crew*LABOR_RATE).toLocaleString()} – $${(cost.adjMax*cost.crew*LABOR_RATE).toLocaleString()}`} D={D} />
                </div>

                {cost.addons.length > 0 && (
                  <div style={{ marginTop: "12px", borderTop: `1px solid ${D.border}`, paddingTop: "10px" }}>
                    <Sect label="Fixed Addons" D={D} />
                    {cost.addons.map((a, i) => (
                      <Row key={i} label={a.label} value={`$${a.low.toLocaleString()} – $${a.high.toLocaleString()}`} D={D} dim />
                    ))}
                  </div>
                )}

                <div style={{ borderTop: `2px solid ${D.primaryDk}`, marginTop: "14px", paddingTop: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "15px", fontWeight: "700", color: D.text, fontFamily: "sans-serif" }}>Clearing Total</span>
                  <span style={{ fontSize: "26px", fontWeight: "800", color: D.primary, fontFamily: "sans-serif" }}>
                    ${cost.totalMin.toLocaleString()} – ${cost.totalMax.toLocaleString()}
                  </span>
                </div>

                <div style={{ marginTop: "12px", borderTop: `1px solid ${D.border}`, paddingTop: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      {conf.reasons.map((r, i) => (
                        <div key={i} style={{ fontSize: "10px", color: D.dim, fontFamily: "sans-serif", marginBottom: "2px" }}>
                          {i < conf.reasons.length - 1 ? `⚠ ${r}` : `ℹ ${r}`}
                        </div>
                      ))}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "16px" }}>
                      <div style={{ fontSize: "10px", color: D.dim, fontFamily: "sans-serif" }}>CONFIDENCE</div>
                      <div style={{ fontSize: "20px", fontWeight: "800", color: confColor, fontFamily: "sans-serif" }}>{conf.level}</div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Materials */}
          {mats && (
            <>
              <RH label="🪵  Material Estimate" D={D} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                <SB value={mats.sqFt.toLocaleString()}   label="Landscaped sq ft"  D={D} />
                <SB value={`${mats.mulchCy} cy`}          label={'Mulch (3" depth)'} D={D} />
              </div>
              <p style={{ fontSize: "10px", color: D.dim, fontStyle: "italic", marginBottom: "24px" }}>
                Assuming ~20% of lot landscaped ({mats.sqFt.toLocaleString()} sq ft), 3-inch mulch depth.
              </p>
            </>
          )}

          {/* Equipment */}
          <RH label="🔧  Recommended Equipment" D={D} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
            {equip.map((e, i) => (
              <span key={i} style={{ fontSize: "11px", padding: "3px 10px", background: D.blueBg, color: D.blue, border: `1px solid ${D.blueBrd}`, borderRadius: "4px", fontFamily: "sans-serif" }}>{e}</span>
            ))}
          </div>
          <p style={{ fontSize: "10px", color: D.dim, fontStyle: "italic", marginBottom: "24px", fontFamily: "sans-serif" }}>Common examples. Contractors may use different methods or equipment.</p>

          {/* Footer */}
          <div style={{ borderTop: `1px solid ${D.border}`, paddingTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <div style={{ fontSize: "10px", color: D.primary, fontFamily: "sans-serif", marginBottom: "4px" }}>
                🔒 Report locked at time of generation. Data is immutable.
              </div>
              <p style={{ fontSize: "10px", color: D.dim, fontFamily: "sans-serif", maxWidth: "460px", lineHeight: 1.5, margin: 0 }}>
                This analysis is for informational and planning purposes only. It is not a legal survey, engineering assessment, or guarantee of conditions. Verify critical details with qualified professionals before making decisions.
              </p>
            </div>
            <div style={{ textAlign: "right", fontFamily: "sans-serif" }}>
              <div style={{ fontSize: "9px", color: D.dim, letterSpacing: "0.05em" }}>REPORT ID</div>
              <div style={{ fontSize: "12px", fontWeight: "700", color: D.primary, fontFamily: "monospace" }}>{reportNum}</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// ─── UI Helpers ───────────────────────────────────────────────────────────────

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
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
      <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", fontFamily: "sans-serif" }}>{label}</span>
      <div style={{ flex: 1, height: "1px", background: "#1f3829" }} />
    </div>
  );
}

function Sect({ label, D }: { label: string; D: any }) {
  return (
    <div style={{ fontSize: "10px", color: D.dim, fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>{label}</div>
  );
}

function SB({ value, label, D }: { value: string; label: string; D: any }) {
  return (
    <div style={{ textAlign: "center", background: D.bgCard, border: `1px solid ${D.border}`, borderRadius: "5px", padding: "10px 8px" }}>
      <div style={{ fontSize: "18px", fontWeight: "bold", color: D.primary, fontFamily: "sans-serif" }}>{value}</div>
      <div style={{ fontSize: "9px", color: D.dim, fontFamily: "sans-serif", textTransform: "uppercase", marginTop: "2px" }}>{label}</div>
    </div>
  );
}

function Row({ label, value, D, bold, dim }: { label: string; value: string; D: any; bold?: boolean; dim?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "5px 0", borderBottom: `1px solid ${D.border}` }}>
      <span style={{ fontSize: "11px", color: dim ? D.dim : D.muted, fontFamily: "sans-serif", fontWeight: bold ? "600" : "400", maxWidth: "72%", lineHeight: 1.4 }}>{label}</span>
      {value && <span style={{ fontSize: "12px", fontWeight: bold ? "700" : "600", color: bold ? D.text : D.primary, fontFamily: "sans-serif", whiteSpace: "nowrap", marginLeft: "12px" }}>{value}</span>}
    </div>
  );
}

export default JobReport;
