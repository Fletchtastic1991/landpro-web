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

interface JobReportProps {
  propertyData: { acreage: number | null; squareMeters: number | null };
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

// ─── Cost multipliers for new fields ─────────────────────────────────────────

const WATER_MULTIPLIERS = {
  none:          { min: 1.0,  max: 1.0,  label: "No water features" },
  pond_or_creek: { min: 1.15, max: 1.25, label: "Pond or creek present" },
  wetland:       { min: 1.3,  max: 1.5,  label: "Wetland area — permit review required" },
};

const STRUCTURE_MULTIPLIERS = {
  none:                { min: 1.0,  max: 1.0,  label: "No existing structures" },
  fencing:             { min: 1.05, max: 1.1,  label: "Existing fencing to remove" },
  buildings_utilities: { min: 1.15, max: 1.3,  label: "Buildings or utilities present" },
};

const DEBRIS_MULTIPLIERS = {
  none:  { min: 1.0,  max: 1.0,  label: "No debris" },
  light: { min: 1.05, max: 1.1,  label: "Light debris — standard disposal" },
  heavy: { min: 1.15, max: 1.35, label: "Heavy debris/trash — additional haul-off required" },
};

// ─── Core calculations ────────────────────────────────────────────────────────

function calcFence(acres: number, postSpacingFt = 8) {
  const lotSideFt = Math.sqrt(acres * 43560);
  const perimeter = Math.round(lotSideFt * 4);
  const posts     = Math.ceil(perimeter / postSpacingFt);
  return { perimeter, posts, postSpacingFt };
}

function calcClearing(acres: number, s: LandSelections) {
  const baseMin = { light: 3, medium: 6,  heavy: 10 }[s.vegetation];
  const baseMax = { light: 6, medium: 10, heavy: 18 }[s.vegetation];
  const tFac    = { flat: 1.0, slight_slope: 1.2, steep: 1.5 }[s.terrain];
  const aFac    = { easy: 1.0, moderate: 1.2, difficult: 1.5 }[s.accessibility];
  return {
    minHours: Math.round(baseMin * tFac * aFac * acres),
    maxHours: Math.round(baseMax * tFac * aFac * acres),
  };
}

function calcMaterials(acres: number, landscapedPct = 20) {
  const landscapedSqFt = Math.round(acres * 43560 * (landscapedPct / 100));
  const mulchCuYds     = Math.round(((landscapedSqFt * (3 / 12)) / 27) * 10) / 10;
  return { landscapedSqFt, mulchCuYds, landscapedPct };
}

function calcCost(acres: number, s: LandSelections) {
  const base   = { light: { min: 1500, max: 3000 }, medium: { min: 3000, max: 6000 }, heavy: { min: 6000, max: 12000 } }[s.vegetation];
  const tFac   = { flat: { min: 1.0, max: 1.0 }, slight_slope: { min: 1.1, max: 1.25 }, steep: { min: 1.3, max: 1.5 } }[s.terrain];
  const aFac   = { easy: { min: 1.0, max: 1.0 }, moderate: { min: 1.15, max: 1.3 }, difficult: { min: 1.4, max: 1.6 } }[s.accessibility];
  const wFac   = WATER_MULTIPLIERS[s.water];
  const sFac   = STRUCTURE_MULTIPLIERS[s.structures];
  const dFac   = DEBRIS_MULTIPLIERS[s.debris];
  return {
    low:  Math.round(base.min * tFac.min * aFac.min * wFac.min * sFac.min * dFac.min * acres / 100) * 100,
    high: Math.round(base.max * tFac.max * aFac.max * wFac.max * sFac.max * dFac.max * acres / 100) * 100,
    baseRateMin: base.min,
    baseRateMax: base.max,
  };
}

function calcLabor(acres: number, s: LandSelections) {
  const crew = s.vegetation === "light" ? 2 : s.vegetation === "medium" ? 3 : 5;
  const diff =
    s.vegetation === "heavy" || s.terrain === "steep" || s.accessibility === "difficult" ? "Challenging" :
    s.vegetation === "medium" || s.terrain === "slight_slope" ? "Moderate" : "Standard";
  return { crew, difficulty: diff };
}

// ─── Confidence ───────────────────────────────────────────────────────────────

function getConfidence(s: LandSelections): { level: "Low" | "Medium" | "High"; reason: string } {
  const isHard = s.vegetation === "heavy" && s.terrain === "steep";
  const isMod  = s.vegetation === "heavy" || s.terrain === "steep" || s.accessibility === "difficult"
              || s.water === "wetland" || s.structures === "buildings_utilities" || s.debris === "heavy";
  if (isHard) return { level: "Low",    reason: "Heavy vegetation + steep terrain creates high variability. On-site assessment strongly recommended." };
  if (isMod)  return { level: "Medium", reason: "One or more challenging conditions present. Estimates are directionally accurate but require site verification." };
  return        { level: "High",   reason: "Favorable conditions. Estimates are reliable for initial budgeting." };
}

// ─── Descriptors ─────────────────────────────────────────────────────────────

const VEG = {
  light:  { label: "Light Vegetation",  canopy: "10–30% canopy coverage",  detail: "Sparse tree coverage with minimal underbrush. Open canopy, mostly grass or shrubs." },
  medium: { label: "Medium Vegetation", canopy: "30–60% canopy coverage",  detail: "Mixed tree stands with moderate underbrush. Some clearing required before equipment access." },
  heavy:  { label: "Heavy Vegetation",  canopy: "Estimated 70–85% canopy coverage — dense clearing required", detail: "Dense forest or heavy brush. Significant clearing effort required throughout." },
};
const TER = {
  flat:         { label: "Flat Terrain",  slope: "Avg slope: <2% — minimal grade impact",   detail: "Low elevation variance. Minimal equipment efficiency impact." },
  slight_slope: { label: "Slight Slope",  slope: "Avg slope: 6–9% — moderate impact",        detail: "Moderate elevation change. Equipment access manageable with standard machinery." },
  steep:        { label: "Steep Terrain", slope: "Avg slope: 15%+ — significant impact",     detail: "Significant grade change. Specialized equipment and safety measures required." },
};
const ACC = {
  easy:      { label: "Easy Access",      impact: "No access premium",         detail: "Direct road access. Standard equipment mobilization." },
  moderate:  { label: "Moderate Access",  impact: "+15–30% mobilization cost", detail: "Limited entry points or unpaved roads. Some mobilization complexity." },
  difficult: { label: "Difficult Access", impact: "+40–60% mobilization cost", detail: "Remote location or significant obstacles. Specialized mobilization required." },
};

function getEquipment(s: LandSelections): string[] {
  const eq: string[] = [];
  if (s.vegetation === "light")        eq.push("Skid steer with brush cutter", "Disc mower or rotary cutter");
  else if (s.vegetation === "medium")  eq.push("Forestry mulcher", "Skid steer with grapple", "Mid-size bulldozer (D4–D5)");
  else                                 eq.push("Heavy-duty bulldozer (D6/D7)", "Excavator with thumb (20–30 ton)", "Forestry mulcher or tub grinder", "Haul trucks for debris removal");
  if (s.terrain === "steep")           eq.push("Track-mounted equipment only", "Erosion control materials");
  if (s.accessibility === "difficult") eq.push("Low-ground-pressure equipment", "Access road construction may be required");
  if (s.water === "pond_or_creek")     eq.push("Silt fencing / sediment barriers");
  if (s.water === "wetland")           eq.push("Wetland-rated equipment", "Environmental consultant required");
  if (s.structures === "fencing")      eq.push("Fence removal tools / post puller");
  if (s.structures === "buildings_utilities") eq.push("Utility locating service (811 call required)", "Demolition equipment");
  if (s.debris === "heavy")            eq.push("Dumpsters / additional haul trucks");
  return eq;
}

function getRisks(s: LandSelections): string[] {
  const r: string[] = [];
  if (s.vegetation === "heavy")        r.push("Dense canopy may conceal ground hazards (stumps, debris, sinkholes)", "Timber value assessment recommended before clearing");
  if (s.terrain === "steep")           r.push("Steep grade increases rollover risk — certified operators required", "Stormwater/erosion control plan likely required");
  if (s.terrain === "slight_slope")    r.push("Monitor for erosion at slope breaks and drainage channels");
  if (s.accessibility === "difficult") r.push("Temporary road construction may be required before clearing");
  if (s.water === "pond_or_creek")     r.push("Sediment runoff into waterway — erosion control required", "Verify setback requirements from water edge");
  if (s.water === "wetland")           r.push("Wetland disturbance may require Army Corps of Engineers permit", "Clearing near wetland boundary may be restricted by federal/state law");
  if (s.structures === "buildings_utilities") r.push("Call 811 before any excavation — underground utilities likely present", "Demolition permits may be required for existing structures");
  if (s.debris === "heavy")            r.push("Hazardous waste inspection recommended before clearing begins", "Additional disposal costs for heavy debris — confirm with local landfill");
  r.push("Site visit required to verify conditions before final pricing");
  r.push("Permitting requirements vary by county — verify before project start");
  return r;
}

function genReportNum() {
  return `LP-${format(new Date(), "yyyyMMdd")}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

const JobReport: React.FC<JobReportProps> = ({ propertyData, selections, className }) => {
  const [generated, setGenerated] = useState(false);
  const [reportNum] = useState(genReportNum);
  const [lockedAt]  = useState(() => new Date());

  const acres    = propertyData.acreage ?? 0;
  const hasAcre  = acres > 0;

  const fence    = hasAcre ? calcFence(acres)              : null;
  const clearing = hasAcre ? calcClearing(acres, selections) : null;
  const mats     = hasAcre ? calcMaterials(acres)          : null;
  const cost     = hasAcre ? calcCost(acres, selections)   : null;
  const labor    = hasAcre ? calcLabor(acres, selections)  : null;
  const equip    = getEquipment(selections);
  const risks    = getRisks(selections);
  const conf     = getConfidence(selections);
  const veg      = VEG[selections.vegetation];
  const ter      = TER[selections.terrain];
  const acc      = ACC[selections.accessibility];
  const water    = WATER_MULTIPLIERS[selections.water];
  const structs  = STRUCTURE_MULTIPLIERS[selections.structures];
  const debris   = DEBRIS_MULTIPLIERS[selections.debris];

  const confColor = { High: "#4ade80", Medium: "#fbbf24", Low: "#f87171" }[conf.level];
  const confBadge = {
    High:   "bg-green-500/20 text-green-400 border-green-500/30",
    Medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    Low:    "bg-red-500/20 text-red-400 border-red-500/30",
  }[conf.level];

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

          {/* 6-field summary grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { icon: Ruler,     label: "Property Size", value: hasAcre ? `${acres} Acres` : "Not defined",         color: "bg-blue-500/10 text-blue-400" },
              { icon: Leaf,      label: "Vegetation",    value: veg.label,                                            color: "bg-green-500/10 text-green-400" },
              { icon: Mountain,  label: "Terrain",       value: ter.label,                                            color: "bg-amber-500/10 text-amber-400" },
              { icon: MapPin,    label: "Accessibility", value: acc.label,                                            color: "bg-purple-500/10 text-purple-400" },
              { icon: Droplets,  label: "Water",         value: water.label,                                          color: "bg-cyan-500/10 text-cyan-400" },
              { icon: Building2, label: "Structures",    value: structs.label,                                        color: "bg-orange-500/10 text-orange-400" },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="flex items-center justify-between p-3 rounded-lg border bg-background/50">
                <div className="flex items-center gap-2">
                  <div className={cn("p-1.5 rounded-md", color)}><Icon className="h-3.5 w-3.5" /></div>
                  <span className="text-xs font-medium text-muted-foreground">{label}</span>
                </div>
                <span className="text-xs font-bold text-right max-w-[120px]">{value}</span>
              </div>
            ))}
          </div>

          {/* Debris callout if set */}
          {selections.debris !== "none" && (
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-amber-500/5 border-amber-500/20">
              <Trash2 className="h-4 w-4 text-amber-400 flex-shrink-0" />
              <p className="text-sm text-amber-400 font-medium">{debris.label} — disposal costs factored into estimate</p>
            </div>
          )}

          {/* Smart descriptions */}
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { color: "text-green-400",  icon: Leaf,     title: "Vegetation", main: veg.canopy,  sub: veg.detail },
              { color: "text-amber-400",  icon: Mountain, title: "Terrain",    main: ter.slope,   sub: ter.detail },
              { color: "text-purple-400", icon: MapPin,   title: "Access",     main: acc.impact,  sub: acc.detail },
            ].map(({ color, icon: Icon, title, main, sub }) => (
              <div key={title} className="p-4 rounded-lg border bg-muted/20 space-y-1">
                <div className={cn("flex items-center gap-2 text-xs font-semibold uppercase tracking-wider", color)}>
                  <Icon className="h-3.5 w-3.5" />{title}
                </div>
                <p className="text-sm font-medium">{main}</p>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </div>
            ))}
          </div>

          {/* Live calc preview */}
          {hasAcre && fence && clearing && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Est. Perimeter",  value: `${fence.perimeter.toLocaleString()} ft` },
                { label: "Fence Posts",      value: `${fence.posts} posts` },
                { label: "Clearing Hours",   value: `${clearing.minHours}–${clearing.maxHours} hrs` },
                { label: "Crew Size",        value: `${labor?.crew} operators` },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 rounded-lg border bg-primary/5 text-center">
                  <p className="text-lg font-bold text-primary">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Cost preview */}
          {cost && (
            <div className="p-4 rounded-lg border bg-primary/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><DollarSign className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Estimated Cost Range</p>
                  <p className="text-2xl font-bold text-primary">${cost.low.toLocaleString()} – ${cost.high.toLocaleString()}</p>
                </div>
              </div>
              <Badge className={cn("border text-xs", confBadge)}>{conf.level} Confidence</Badge>
            </div>
          )}

          {/* CTA */}
          {hasAcre ? (
            <div className="pt-2 space-y-3">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {["Fence calculator","Clearing hours","Material quantities","Water/debris multipliers","Risk factors","Locked report + PDF"].map(item => (
                  <div key={item} className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-primary" />{item}
                  </div>
                ))}
              </div>
              <Button size="lg" className="w-full text-base font-semibold gap-2" onClick={() => setGenerated(true)}>
                <Lock className="h-4 w-4" /> Generate Property Analysis Report
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Generating locks this assessment — a unique report number and timestamp will be created.
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

          {/* 6-field summary bar */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "1px", background: D.border, border: `1px solid ${D.border}`, borderRadius: "8px", overflow: "hidden", marginBottom: "28px" }}>
            {[
              { label: "Property Size", value: hasAcre ? `${acres} acres` : "—" },
              { label: "Vegetation",    value: veg.label },
              { label: "Terrain",       value: ter.label },
              { label: "Accessibility", value: acc.label },
              { label: "Water",         value: selections.water === "none" ? "None" : water.label.split("—")[0].trim() },
              { label: "Debris",        value: selections.debris === "none" ? "None" : debris.label.split("—")[0].trim() },
            ].map((item, i) => (
              <div key={i} style={{ background: D.bgCard, padding: "12px 10px" }}>
                <div style={{ fontSize: "8px", color: D.dim, fontFamily: "sans-serif", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "3px" }}>{item.label}</div>
                <div style={{ fontSize: "11px", fontWeight: "600", fontFamily: "sans-serif", color: D.text }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Site conditions */}
          <RHead label="📋  Site Conditions" D={D} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "20px" }}>
            {[
              { title: "🌿 Vegetation", main: veg.canopy,  sub: veg.detail },
              { title: "⛰️  Terrain",   main: ter.slope,   sub: ter.detail },
              { title: "🚗 Access",     main: acc.impact,  sub: acc.detail },
            ].map((item, i) => (
              <div key={i} style={{ background: D.bgSect, border: `1px solid ${D.border}`, borderRadius: "6px", padding: "12px 14px" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", fontFamily: "sans-serif", marginBottom: "6px", color: D.muted }}>{item.title}</div>
                <div style={{ fontSize: "12px", fontWeight: "600", color: D.primary, marginBottom: "4px" }}>{item.main}</div>
                <div style={{ fontSize: "11px", color: D.dim }}>{item.sub}</div>
              </div>
            ))}
          </div>

          {/* Field observations */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "28px" }}>
            {[
              { title: "💧 Water",      main: water.label,   sub: selections.water === "wetland" ? "Permit review may be required" : selections.water === "none" ? "No cost impact" : "+15–25% cost factor" },
              { title: "🏗️ Structures", main: structs.label, sub: selections.structures === "none" ? "No cost impact" : selections.structures === "fencing" ? "+5–10% cost factor" : "+15–30% cost factor — utility locate required" },
              { title: "🗑️ Debris",     main: debris.label,  sub: selections.debris === "none" ? "No cost impact" : selections.debris === "light" ? "+5–10% disposal cost" : "+15–35% disposal cost — haul-off required" },
            ].map((item, i) => (
              <div key={i} style={{ background: D.bgSect, border: `1px solid ${D.border}`, borderRadius: "6px", padding: "12px 14px" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", fontFamily: "sans-serif", marginBottom: "6px", color: D.muted }}>{item.title}</div>
                <div style={{ fontSize: "12px", fontWeight: "600", color: D.primary, marginBottom: "4px" }}>{item.main}</div>
                <div style={{ fontSize: "11px", color: D.dim }}>{item.sub}</div>
              </div>
            ))}
          </div>

          {/* Calculated estimates */}
          {fence && clearing && mats && (
            <>
              <RHead label="📐  Calculated Estimates" D={D} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "28px" }}>

                <div style={{ background: D.bgSect, border: `1px solid ${D.border}`, borderRadius: "6px", padding: "14px 16px" }}>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: D.muted, fontFamily: "sans-serif", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>🔲 Fence Estimate</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                    <StatBox value={`${fence.perimeter.toLocaleString()} ft`} label="Perimeter" D={D} />
                    <StatBox value={`${fence.posts}`} label={`Posts (${fence.postSpacingFt}ft spacing)`} D={D} />
                  </div>
                  <div style={{ fontSize: "10px", color: D.dim, fontStyle: "italic" }}>
                    Based on {acres} acre square lot: {fence.perimeter.toLocaleString()} ft perimeter, posts at {fence.postSpacingFt} ft apart
                  </div>
                </div>

                <div style={{ background: D.bgSect, border: `1px solid ${D.border}`, borderRadius: "6px", padding: "14px 16px" }}>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: D.muted, fontFamily: "sans-serif", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>⏱️ Clearing Estimate</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                    <StatBox value={`${clearing.minHours}–${clearing.maxHours}`} label="Machine Hours" D={D} />
                    <StatBox value={`${labor?.crew}`} label="Crew Size" D={D} />
                  </div>
                  <div style={{ fontSize: "10px", color: D.dim, fontStyle: "italic" }}>
                    {acres} acres × {veg.label.toLowerCase()} + {ter.label.toLowerCase()}: {clearing.minHours}–{clearing.maxHours} machine hours
                  </div>
                </div>

                <div style={{ background: D.bgSect, border: `1px solid ${D.border}`, borderRadius: "6px", padding: "14px 16px" }}>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: D.muted, fontFamily: "sans-serif", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>🪵 Material Estimate</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                    <StatBox value={mats.landscapedSqFt.toLocaleString()} label="Landscaped sq ft" D={D} />
                    <StatBox value={`${mats.mulchCuYds} cy`} label="Mulch (3\" depth)" D={D} />
                  </div>
                  <div style={{ fontSize: "10px", color: D.dim, fontStyle: "italic" }}>
                    {mats.landscapedPct}% of lot landscaped ({mats.landscapedSqFt.toLocaleString()} sq ft), 3 inches of mulch depth
                  </div>
                </div>

                {cost && (
                  <div style={{ background: D.bgSect, border: `1px solid ${D.borderAcc}`, borderRadius: "6px", padding: "14px 16px" }}>
                    <div style={{ fontSize: "11px", fontWeight: "700", color: D.muted, fontFamily: "sans-serif", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>💵 Cost Estimate</div>
                    <div style={{ fontSize: "22px", fontWeight: "bold", color: D.primary, fontFamily: "sans-serif", marginBottom: "4px" }}>
                      ${cost.low.toLocaleString()} – ${cost.high.toLocaleString()}
                    </div>
                    <div style={{ fontSize: "10px", color: D.dim, fontFamily: "sans-serif", marginBottom: "8px" }}>
                      Base: ${cost.baseRateMin.toLocaleString()}–${cost.baseRateMax.toLocaleString()}/acre × terrain × access × water × debris multipliers
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: `1px solid ${D.border}` }}>
                      <span style={{ fontSize: "11px", color: D.dim, fontFamily: "sans-serif" }}>Confidence</span>
                      <span style={{ fontSize: "11px", fontWeight: "700", color: confColor, fontFamily: "sans-serif" }}>{conf.level}</span>
                    </div>
                    <div style={{ fontSize: "10px", color: D.dim, fontStyle: "italic", marginTop: "4px" }}>{conf.reason}</div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Equipment */}
          <RHead label="🔧  Recommended Equipment" D={D} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
            {equip.map((e, i) => (
              <span key={i} style={{ fontSize: "11px", padding: "3px 10px", background: D.blueBg, color: D.blue, border: `1px solid ${D.blueBrd}`, borderRadius: "4px", fontFamily: "sans-serif" }}>{e}</span>
            ))}
          </div>
          <p style={{ fontSize: "10px", color: D.dim, fontStyle: "italic", marginBottom: "24px", fontFamily: "sans-serif" }}>Common examples. Contractors may use different methods or equipment.</p>

          {/* Risks */}
          <RHead label="⚠️  Key Risk Factors" D={D} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "28px" }}>
            {risks.map((r, i) => (
              <div key={i} style={{ background: D.amberBg, border: `1px solid ${D.amberBrd}`, borderRadius: "5px", padding: "8px 12px", fontSize: "11px", color: D.amber, display: "flex", gap: "6px" }}>
                <span>⚠</span><span>{r}</span>
              </div>
            ))}
          </div>

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function RHead({ label, D }: { label: string; D: typeof import("./JobReport")["default"] extends any ? any : any }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
      <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", fontFamily: "sans-serif" }}>{label}</span>
      <div style={{ flex: 1, height: "1px", background: "#1f3829" }} />
    </div>
  );
}

function StatBox({ value, label, D }: { value: string; label: string; D: typeof import("./JobReport")["default"] extends any ? any : any }) {
  return (
    <div style={{ textAlign: "center", background: D.bgCard, borderRadius: "5px", padding: "8px" }}>
      <div style={{ fontSize: "18px", fontWeight: "bold", color: D.primary, fontFamily: "sans-serif" }}>{value}</div>
      <div style={{ fontSize: "9px", color: D.dim, fontFamily: "sans-serif", textTransform: "uppercase", marginTop: "2px" }}>{label}</div>
    </div>
  );
}

export default JobReport;
