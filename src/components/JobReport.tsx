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
  greenDim:  "#166534",
};

// ─── Perimeter from polygon (Haversine) ───────────────────────────────────────

function haversineM([lon1, lat1]: [number, number], [lon2, lat2]: [number, number]): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180, φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180, Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getPerimeterFt(polygon: GeoJSON.Polygon): number {
  const coords = polygon.coordinates[0] as [number, number][];
  let m = 0;
  for (let i = 0; i < coords.length - 1; i++) m += haversineM(coords[i], coords[i + 1]);
  return Math.round(m * 3.28084);
}

// ─── Corner detection from polygon ───────────────────────────────────────────
// A "corner" is a vertex where the interior angle deviates significantly from 180°

function detectCorners(polygon: GeoJSON.Polygon, angleDegThreshold = 30): number {
  const coords = polygon.coordinates[0] as [number, number][];
  // Skip closing coord (same as first)
  const pts = coords.slice(0, coords.length - 1);
  if (pts.length < 3) return pts.length;

  let corners = 0;
  for (let i = 0; i < pts.length; i++) {
    const prev = pts[(i - 1 + pts.length) % pts.length];
    const curr = pts[i];
    const next = pts[(i + 1) % pts.length];

    // Vectors
    const v1 = [curr[0] - prev[0], curr[1] - prev[1]];
    const v2 = [next[0] - curr[0], next[1] - curr[1]];

    const dot    = v1[0] * v2[0] + v1[1] * v2[1];
    const mag1   = Math.sqrt(v1[0] ** 2 + v1[1] ** 2);
    const mag2   = Math.sqrt(v2[0] ** 2 + v2[1] ** 2);
    if (mag1 === 0 || mag2 === 0) continue;

    const cosAngle  = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    const angleDeg  = Math.acos(cosAngle) * (180 / Math.PI);
    // angleDeg near 0 = straight line; near 180 = sharp corner
    if (angleDeg > angleDegThreshold) corners++;
  }
  return corners;
}

function calcFencePerimeter(acres: number, polygon?: GeoJSON.Polygon | null): {
  perimeterFt: number;
  isReal: boolean;
  cornerCount: number;
} {
  if (polygon?.coordinates?.[0]?.length > 2) {
    return {
      perimeterFt: getPerimeterFt(polygon),
      isReal: true,
      cornerCount: detectCorners(polygon),
    };
  }
  const lotSideFt = Math.sqrt(acres * 43560);
  return { perimeterFt: Math.round(lotSideFt * 4), isReal: false, cornerCount: 4 };
}

// ─── Fence posts with gates + corners ────────────────────────────────────────

function calcFencePosts(perimeterFt: number, cornerCount: number, gateCount: number, spacingFt = 8) {
  const linePostsNominal = Math.ceil(perimeterFt / spacingFt);
  const linePostsLow    = Math.floor(linePostsNominal * 0.9);
  const linePostsHigh   = Math.ceil(linePostsNominal * 1.1);
  // Each corner: 1 extra post; each gate: 2 extra posts (one each side)
  const extraPosts = cornerCount + gateCount * 2;
  return {
    linePosts:  { low: linePostsLow, high: linePostsHigh },
    cornerPosts: cornerCount,
    gatePosts:  gateCount * 2,
    totalLow:   linePostsLow  + extraPosts,
    totalHigh:  linePostsHigh + extraPosts,
    spacingFt,
  };
}

// ─── TRANSPARENT Cost Model ───────────────────────────────────────────────────
// All math exposed as line items with actual dollar amounts

const BASE_RATE_MID = {
  light:  { min: 1500,  max: 3000,  mid: 2000  },
  medium: { min: 3000,  max: 6000,  mid: 4500  },
  heavy:  { min: 6000,  max: 12000, mid: 8500  },
};

const TERRAIN_PCT = {
  flat:         { pct: 0,    label: "Flat terrain",              display: null },
  slight_slope: { pct: 0.175, label: "Slight slope (+17.5%)",    display: "+17.5%" },
  steep:        { pct: 0.40,  label: "Steep terrain (+40%)",     display: "+40%" },
};

const ACCESS_PCT = {
  easy:      { pct: 0,    label: "Easy access",                display: null },
  moderate:  { pct: 0.225, label: "Moderate access (+22.5%)",  display: "+22.5%" },
  difficult: { pct: 0.50,  label: "Difficult access (+50%)",   display: "+50%" },
};

const WATER_PCT = {
  none:          { pct: 0,    label: null,                              display: null },
  pond_or_creek: { pct: 0.20,  label: "Pond/creek present (+20%)",     display: "+20%" },
  wetland:       { pct: 0.40,  label: "Wetland area (+40%)",           display: "+40%" },
};

const STRUCT_PCT = {
  none:                { pct: 0,    label: null,                                   display: null },
  fencing:             { pct: 0.075, label: "Existing fencing to remove (+7.5%)",  display: "+7.5%" },
  buildings_utilities: { pct: 0.225, label: "Buildings/utilities present (+22.5%)", display: "+22.5%" },
};

const DEBRIS_PCT = {
  none:  { pct: 0,    label: null,                         display: null },
  light: { pct: 0.075, label: "Light debris (+7.5%)",      display: "+7.5%" },
  heavy: { pct: 0.25,  label: "Heavy debris/trash (+25%)", display: "+25%" },
};

interface CostLineItem {
  label: string;
  lowDollars: number;
  highDollars: number;
  isPct: boolean;
  pctDisplay?: string;
}

function calcTransparentCost(acres: number, s: LandSelections): {
  baseLow: number;
  baseHigh: number;
  totalLow: number;
  totalHigh: number;
  midBase: number;
  lineItems: CostLineItem[];
} {
  const baseRate = BASE_RATE_MID[s.vegetation];
  const baseLow  = Math.round(baseRate.min * acres);
  const baseHigh = Math.round(baseRate.max * acres);
  const midBase  = Math.round(baseRate.mid * acres);

  const adjustments: CostLineItem[] = [];

  // Build each adjustment as a real dollar amount off midBase
  const addAdj = (pctObj: { pct: number; label: string | null; display: string | null }) => {
    if (!pctObj.pct || !pctObj.label) return;
    const adj = Math.round(midBase * pctObj.pct);
    adjustments.push({
      label:      pctObj.label,
      lowDollars:  Math.round(baseLow  * pctObj.pct),
      highDollars: Math.round(baseHigh * pctObj.pct),
      isPct:      true,
      pctDisplay: pctObj.display ?? undefined,
    });
  };

  addAdj(TERRAIN_PCT[s.terrain]);
  addAdj(ACCESS_PCT[s.accessibility]);
  addAdj(WATER_PCT[s.water]);
  addAdj(STRUCT_PCT[s.structures]);
  addAdj(DEBRIS_PCT[s.debris]);

  const totalLow  = Math.round((baseLow  + adjustments.reduce((sum, a) => sum + a.lowDollars,  0)) / 100) * 100;
  const totalHigh = Math.round((baseHigh + adjustments.reduce((sum, a) => sum + a.highDollars, 0)) / 100) * 100;

  return { baseLow, baseHigh, totalLow, totalHigh, midBase, lineItems: adjustments };
}

// ─── Clearing + Labor ─────────────────────────────────────────────────────────

const MACHINE_RATE_PER_HR = 150; // $/hr for machine
const LABOR_RATE_PER_HR   = 50;  // $/hr per crew member

function calcClearing(acres: number, s: LandSelections) {
  const baseMin = { light: 3,  medium: 7,  heavy: 12 }[s.vegetation];
  const baseMax = { light: 8,  medium: 16, heavy: 28 }[s.vegetation];
  const tFac    = { flat: 1.0, slight_slope: 1.25, steep: 1.6 }[s.terrain];
  const aFac    = { easy: 1.0, moderate: 1.25,     difficult: 1.6 }[s.accessibility];
  const minHrs  = Math.round(baseMin * tFac * aFac * acres);
  const maxHrs  = Math.round(baseMax * tFac * aFac * acres);
  const crew    = s.vegetation === "light" ? 2 : s.vegetation === "medium" ? 3 : 5;
  const diff    = s.vegetation === "heavy" || s.terrain === "steep" || s.accessibility === "difficult" ? "Challenging"
                : s.vegetation === "medium" || s.terrain === "slight_slope" ? "Moderate" : "Standard";

  // Labor cost from rates
  const laborCostLow  = Math.round((minHrs * MACHINE_RATE_PER_HR + minHrs * crew * LABOR_RATE_PER_HR) / 100) * 100;
  const laborCostHigh = Math.round((maxHrs * MACHINE_RATE_PER_HR + maxHrs * crew * LABOR_RATE_PER_HR) / 100) * 100;

  return { minHrs, maxHrs, crew, diff, laborCostLow, laborCostHigh };
}

function calcMaterials(acres: number, pct = 20) {
  const sqFt    = Math.round(acres * 43560 * (pct / 100));
  const mulchCy = Math.round(((sqFt * (3 / 12)) / 27) * 10) / 10;
  return { sqFt, mulchCy, pct };
}

// ─── Confidence ───────────────────────────────────────────────────────────────

function getConfidence(s: LandSelections): {
  level: "Low" | "Medium" | "High";
  reasons: string[];
} {
  const reasons: string[] = [];
  if (s.vegetation === "heavy")               reasons.push("Heavy vegetation — high density variability");
  if (s.terrain === "steep")                  reasons.push("Steep terrain — equipment efficiency unpredictable");
  if (s.accessibility === "difficult")        reasons.push("Difficult access — mobilization costs vary widely");
  if (s.water === "wetland")                  reasons.push("Wetland area — regulatory and access uncertainty");
  if (s.water === "pond_or_creek")            reasons.push("Water present — erosion controls required");
  if (s.structures === "buildings_utilities") reasons.push("Utilities present — unknown below-grade conditions");
  if (s.debris === "heavy")                   reasons.push("Heavy debris — disposal costs vary by material");

  reasons.push("Site visit required to verify all conditions");

  const level = reasons.length <= 1 ? "High" : reasons.length <= 3 ? "Medium" : "Low";
  return { level, reasons };
}

// ─── Descriptors ─────────────────────────────────────────────────────────────

const VEG = {
  light:  { label: "Light Vegetation",  canopy: "10–30% canopy coverage",  detail: "Sparse tree coverage with minimal underbrush. Open canopy, mostly grass or shrubs." },
  medium: { label: "Medium Vegetation", canopy: "30–60% canopy coverage",  detail: "Mixed tree stands with moderate underbrush. Some clearing required before equipment access." },
  heavy:  { label: "Heavy Vegetation",  canopy: "Estimated 70–85% canopy — dense clearing required", detail: "Dense forest or heavy brush. Significant clearing effort required throughout." },
};
const TER = {
  flat:         { label: "Flat Terrain",  slope: "Avg slope: <2%",           detail: "Low elevation variance. Minimal equipment efficiency impact." },
  slight_slope: { label: "Slight Slope",  slope: "Avg slope: 6–9%",          detail: "Moderate elevation change. Equipment access manageable with standard machinery." },
  steep:        { label: "Steep Terrain", slope: "Avg slope: 15%+",          detail: "Significant grade change. Specialized equipment and safety measures required." },
};
const ACC = {
  easy:      { label: "Easy Access",      impact: "No access premium",        detail: "Direct road access. Standard equipment mobilization." },
  moderate:  { label: "Moderate Access",  impact: "+15–30% mobilization",     detail: "Limited entry points or unpaved roads." },
  difficult: { label: "Difficult Access", impact: "+40–60% mobilization",     detail: "Remote location or significant obstacles." },
};
const WATER_LABEL = { none: "None", pond_or_creek: "Pond or creek present", wetland: "Wetland area" };
const STRUCT_LABEL = { none: "None", fencing: "Existing fencing", buildings_utilities: "Buildings / Utilities" };
const DEBRIS_LABEL = { none: "None", light: "Light debris", heavy: "Heavy debris / trash" };

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
  if (s.structures === "buildings_utilities") eq.push("Utility locate service (call 811 first)", "Demolition equipment");
  if (s.debris === "heavy")            eq.push("Dumpsters / additional haul trucks");
  return eq;
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

  const { perimeterFt, isReal, cornerCount } = hasAcre
    ? calcFencePerimeter(acres, propertyData.boundary)
    : { perimeterFt: 0, isReal: false, cornerCount: 0 };

  const posts    = hasAcre ? calcFencePosts(perimeterFt, cornerCount, selections.gateCount ?? 0) : null;
  const clearing = hasAcre ? calcClearing(acres, selections) : null;
  const mats     = hasAcre ? calcMaterials(acres) : null;
  const cost     = hasAcre ? calcTransparentCost(acres, selections) : null;
  const equip    = getEquipment(selections);
  const conf     = getConfidence(selections);
  const veg      = VEG[selections.vegetation];
  const ter      = TER[selections.terrain];
  const acc      = ACC[selections.accessibility];

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

          {/* 6-field grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { icon: Ruler,     label: "Property Size", value: hasAcre ? `${acres} Acres` : "Not defined", color: "bg-blue-500/10 text-blue-400" },
              { icon: Leaf,      label: "Vegetation",    value: veg.label,                                   color: "bg-green-500/10 text-green-400" },
              { icon: Mountain,  label: "Terrain",       value: ter.label,                                   color: "bg-amber-500/10 text-amber-400" },
              { icon: MapPin,    label: "Accessibility", value: acc.label,                                   color: "bg-purple-500/10 text-purple-400" },
              { icon: Droplets,  label: "Water",         value: WATER_LABEL[selections.water],               color: "bg-cyan-500/10 text-cyan-400" },
              { icon: Building2, label: "Structures",    value: STRUCT_LABEL[selections.structures],         color: "bg-orange-500/10 text-orange-400" },
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

          {/* Debris callout */}
          {selections.debris !== "none" && (
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-amber-500/5 border-amber-500/20">
              <Trash2 className="h-4 w-4 text-amber-400 flex-shrink-0" />
              <p className="text-sm text-amber-400 font-medium">{DEBRIS_LABEL[selections.debris]} — disposal costs factored into estimate</p>
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
          {hasAcre && posts && clearing && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: isReal ? "True Perimeter" : "Est. Perimeter ⁽*⁾", value: `${perimeterFt.toLocaleString()} ft` },
                { label: `Total Posts (${cornerCount} corners, ${selections.gateCount ?? 0} gates)`, value: `${posts.totalLow}–${posts.totalHigh}` },
                { label: "Clearing Hours",   value: `${clearing.minHrs}–${clearing.maxHrs} hrs` },
                { label: "Crew Size",        value: `${clearing.crew} operators` },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 rounded-lg border bg-primary/5 text-center">
                  <p className="text-lg font-bold text-primary">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}

          {!isReal && hasAcre && (
            <p className="text-xs text-muted-foreground/70 italic">
              ⁽*⁾ Perimeter estimated from square-lot assumption. Draw your boundary on the map for a real measurement.
            </p>
          )}

          {/* Cost preview */}
          {cost && (
            <div className="p-4 rounded-lg border bg-primary/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><DollarSign className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Estimated Cost Range</p>
                  <p className="text-2xl font-bold text-primary">${cost.totalLow.toLocaleString()} – ${cost.totalHigh.toLocaleString()}</p>
                </div>
              </div>
              <Badge className={cn("border text-xs", confBadge)}>{conf.level} Confidence</Badge>
            </div>
          )}

          {/* CTA */}
          {hasAcre ? (
            <div className="pt-2 space-y-3">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {[
                  isReal ? "Real perimeter + corner detection" : "Perimeter estimate",
                  "Gate-aware post count",
                  "Full cost math breakdown",
                  "Hours × rates model",
                  "Confidence with reasons",
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

          {/* ── Header ── */}
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

          {/* ── Summary bar ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: "1px", background: D.border, border: `1px solid ${D.border}`, borderRadius: "8px", overflow: "hidden", marginBottom: "28px" }}>
            {[
              { label: "Property Size", value: hasAcre ? `${acres} acres` : "—" },
              { label: "Vegetation",    value: veg.label },
              { label: "Terrain",       value: ter.label },
              { label: "Accessibility", value: acc.label },
              { label: "Water",         value: WATER_LABEL[selections.water] },
              { label: "Debris",        value: DEBRIS_LABEL[selections.debris] },
            ].map((item, i) => (
              <div key={i} style={{ background: D.bgCard, padding: "12px 10px" }}>
                <div style={{ fontSize: "8px", color: D.dim, fontFamily: "sans-serif", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "3px" }}>{item.label}</div>
                <div style={{ fontSize: "11px", fontWeight: "600", fontFamily: "sans-serif", color: D.text }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* ── Site conditions ── */}
          <RH label="📋  Site Conditions" D={D} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "28px" }}>
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

          {/* ── FENCE — full transparent breakdown ── */}
          {posts && (
            <>
              <RH label="🔲  Fence Estimate" D={D} />
              <div style={{ background: D.bgSect, border: `1px solid ${D.border}`, borderRadius: "6px", padding: "16px 18px", marginBottom: "20px" }}>
                {/* Perimeter */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <span style={{ fontSize: "12px", color: D.muted, fontFamily: "sans-serif" }}>
                    Perimeter {isReal ? <span style={{ color: D.primary }}>(measured from drawn boundary)</span> : <span style={{ color: D.amber }}>(estimated — square lot assumption)</span>}
                  </span>
                  <span style={{ fontSize: "16px", fontWeight: "bold", color: D.primary, fontFamily: "sans-serif" }}>{perimeterFt.toLocaleString()} ft</span>
                </div>
                {/* Post math */}
                <div style={{ borderTop: `1px solid ${D.border}`, paddingTop: "10px" }}>
                  <div style={{ fontSize: "10px", color: D.dim, fontFamily: "sans-serif", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Post Calculation</div>
                  <MathRow label={`Line posts (${perimeterFt.toLocaleString()} ft ÷ ${posts.spacingFt} ft spacing)`} value={`${posts.linePosts.low}–${posts.linePosts.high}`} D={D} />
                  <MathRow label={`Corner posts (${cornerCount} corners detected)`}                                   value={`+ ${posts.cornerPosts}`} D={D} />
                  <MathRow label={`Gate posts (${selections.gateCount ?? 0} gates × 2)`}                              value={`+ ${posts.gatePosts}`} D={D} />
                  <div style={{ borderTop: `1px solid ${D.borderAcc}`, marginTop: "8px", paddingTop: "8px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: D.text, fontFamily: "sans-serif" }}>Total Posts</span>
                    <span style={{ fontSize: "18px", fontWeight: "800", color: D.primary, fontFamily: "sans-serif" }}>{posts.totalLow}–{posts.totalHigh}</span>
                  </div>
                  <div style={{ fontSize: "10px", color: D.dim, fontStyle: "italic", marginTop: "6px" }}>
                    Adjust for terrain, gate width preferences, and local code.
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── CLEARING — hours × rates ── */}
          {clearing && (
            <>
              <RH label="⏱️  Clearing Estimate" D={D} />
              <div style={{ background: D.bgSect, border: `1px solid ${D.border}`, borderRadius: "6px", padding: "16px 18px", marginBottom: "20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                  <SB value={`${clearing.minHrs}–${clearing.maxHrs}`} label="Machine Hours" D={D} />
                  <SB value={String(clearing.crew)}                    label="Crew Size"     D={D} />
                  <SB value={clearing.diff}                            label="Difficulty"    D={D} />
                </div>
                <div style={{ borderTop: `1px solid ${D.border}`, paddingTop: "10px" }}>
                  <div style={{ fontSize: "10px", color: D.dim, fontFamily: "sans-serif", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Labor Cost Calculation</div>
                  <MathRow label={`Machine: ${clearing.minHrs}–${clearing.maxHrs} hrs × $${MACHINE_RATE_PER_HR}/hr`} value={`$${(clearing.minHrs * MACHINE_RATE_PER_HR).toLocaleString()} – $${(clearing.maxHrs * MACHINE_RATE_PER_HR).toLocaleString()}`} D={D} />
                  <MathRow label={`Crew: ${clearing.minHrs}–${clearing.maxHrs} hrs × ${clearing.crew} operators × $${LABOR_RATE_PER_HR}/hr`} value={`$${(clearing.minHrs * clearing.crew * LABOR_RATE_PER_HR).toLocaleString()} – $${(clearing.maxHrs * clearing.crew * LABOR_RATE_PER_HR).toLocaleString()}`} D={D} />
                  <div style={{ borderTop: `1px solid ${D.borderAcc}`, marginTop: "8px", paddingTop: "8px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: D.text, fontFamily: "sans-serif" }}>Labor Cost Range</span>
                    <span style={{ fontSize: "16px", fontWeight: "800", color: D.primary, fontFamily: "sans-serif" }}>${clearing.laborCostLow.toLocaleString()} – ${clearing.laborCostHigh.toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: "10px", color: D.dim, fontStyle: "italic", marginTop: "6px" }}>
                    Does not include debris haul-off time. Rates: machine $150/hr, crew $50/hr/operator.
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── COST — full transparent math ── */}
          {cost && (
            <>
              <RH label="💵  Cost Estimate — Full Breakdown" D={D} />
              <div style={{ background: D.bgSect, border: `1px solid ${D.borderAcc}`, borderRadius: "6px", padding: "16px 18px", marginBottom: "20px" }}>
                {/* Base */}
                <MathRow
                  label={`Base clearing: ${acres} acres × $${BASE_RATE_MID[selections.vegetation].min.toLocaleString()}–$${BASE_RATE_MID[selections.vegetation].max.toLocaleString()}/acre`}
                  value={`$${cost.baseLow.toLocaleString()} – $${cost.baseHigh.toLocaleString()}`}
                  D={D} bold
                />
                {/* Adjustments */}
                {cost.lineItems.map((li, i) => (
                  <MathRow
                    key={i}
                    label={li.label}
                    value={`+$${li.lowDollars.toLocaleString()} – +$${li.highDollars.toLocaleString()}`}
                    D={D}
                    dimLabel
                  />
                ))}
                {/* Total */}
                <div style={{ borderTop: `2px solid ${D.primaryDk}`, marginTop: "12px", paddingTop: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "15px", fontWeight: "700", color: D.text, fontFamily: "sans-serif" }}>Total Estimate</span>
                    <span style={{ fontSize: "26px", fontWeight: "800", color: D.primary, fontFamily: "sans-serif" }}>${cost.totalLow.toLocaleString()} – ${cost.totalHigh.toLocaleString()}</span>
                  </div>
                </div>
                {/* Confidence */}
                <div style={{ marginTop: "12px", borderTop: `1px solid ${D.border}`, paddingTop: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: "10px", color: D.dim, fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Confidence Factors</div>
                      {conf.reasons.map((r, i) => (
                        <div key={i} style={{ fontSize: "10px", color: D.dim, fontFamily: "sans-serif", marginBottom: "2px" }}>
                          {i < conf.reasons.length - 1 ? `⚠ ${r}` : `ℹ ${r}`}
                        </div>
                      ))}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "10px", color: D.dim, fontFamily: "sans-serif", marginBottom: "4px" }}>CONFIDENCE</div>
                      <div style={{ fontSize: "18px", fontWeight: "800", color: confColor, fontFamily: "sans-serif" }}>{conf.level}</div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Materials ── */}
          {mats && (
            <>
              <RH label="🪵  Material Estimate" D={D} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                <SB value={mats.sqFt.toLocaleString()}    label="Landscaped sq ft"  D={D} />
                <SB value={`${mats.mulchCy} cy`}          label={'Mulch (3" depth)'} D={D} />
              </div>
              <div style={{ fontSize: "10px", color: D.dim, fontStyle: "italic", marginBottom: "24px" }}>
                Assuming ~{mats.pct}% of lot landscaped ({mats.sqFt.toLocaleString()} sq ft), 3-inch mulch depth.
              </div>
            </>
          )}

          {/* ── Equipment ── */}
          <RH label="🔧  Recommended Equipment" D={D} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
            {equip.map((e, i) => (
              <span key={i} style={{ fontSize: "11px", padding: "3px 10px", background: D.blueBg, color: D.blue, border: `1px solid ${D.blueBrd}`, borderRadius: "4px", fontFamily: "sans-serif" }}>{e}</span>
            ))}
          </div>
          <p style={{ fontSize: "10px", color: D.dim, fontStyle: "italic", marginBottom: "24px", fontFamily: "sans-serif" }}>Common examples. Contractors may use different methods or equipment.</p>

          {/* ── Footer ── */}
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

function RH({ label, D }: { label: string; D: any }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
      <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", fontFamily: "sans-serif" }}>{label}</span>
      <div style={{ flex: 1, height: "1px", background: "#1f3829" }} />
    </div>
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

function MathRow({ label, value, D, bold, dimLabel }: { label: string; value: string; D: any; bold?: boolean; dimLabel?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "5px 0", borderBottom: `1px solid ${D.border}` }}>
      <span style={{ fontSize: "11px", color: dimLabel ? D.dim : D.muted, fontFamily: "sans-serif", fontWeight: bold ? "600" : "400", maxWidth: "70%", lineHeight: 1.4 }}>{label}</span>
      <span style={{ fontSize: "12px", fontWeight: bold ? "700" : "600", color: bold ? D.text : D.primary, fontFamily: "sans-serif", whiteSpace: "nowrap", marginLeft: "12px" }}>{value}</span>
    </div>
  );
}

export default JobReport;
