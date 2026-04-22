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
};

// ─── Haversine (metres between two [lon,lat] points) ─────────────────────────

function hav([lon1, lat1]: [number, number], [lon2, lat2]: [number, number]): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180, φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180, Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Perimeter ────────────────────────────────────────────────────────────────

function getPerimeterFt(polygon: GeoJSON.Polygon): number {
  const coords = polygon.coordinates[0] as [number, number][];
  let m = 0;
  for (let i = 0; i < coords.length - 1; i++) m += hav(coords[i], coords[i + 1]);
  return Math.round(m * 3.28084);
}

// ─── Corner detection ─────────────────────────────────────────────────────────

function countCorners(polygon: GeoJSON.Polygon, thresholdDeg = 25): number {
  const coords = polygon.coordinates[0] as [number, number][];
  const pts    = coords.slice(0, coords.length - 1);
  if (pts.length < 3) return pts.length;
  let corners = 0;
  for (let i = 0; i < pts.length; i++) {
    const prev = pts[(i - 1 + pts.length) % pts.length];
    const curr = pts[i];
    const next = pts[(i + 1) % pts.length];
    const v1 = [curr[0] - prev[0], curr[1] - prev[1]];
    const v2 = [next[0] - curr[0], next[1] - curr[1]];
    const dot = v1[0]*v2[0] + v1[1]*v2[1];
    const mag = Math.sqrt(v1[0]**2+v1[1]**2) * Math.sqrt(v2[0]**2+v2[1]**2);
    if (mag === 0) continue;
    const angleDeg = Math.acos(Math.max(-1, Math.min(1, dot/mag))) * 180/Math.PI;
    if (angleDeg > thresholdDeg) corners++;
  }
  return corners;
}

// ─── Edge-by-edge post calculation (contractor-grade) ────────────────────────
// For each edge: posts = floor(edge_length / spacing)
// No ranges. Deterministic.

function calcFenceEngine(polygon: GeoJSON.Polygon | null | undefined, acres: number, s: LandSelections): {
  perimeterFt:      number;
  isReal:           boolean;
  effectiveFenceFt: number;
  totalGateWidthFt: number;
  cornerCount:      number;
  linePosts:        number;
  cornerPosts:      number;
  gatePosts:        number;
  totalPosts:       number;
  spacingFt:        number;
  edgeBreakdown:    { lengthFt: number; posts: number }[];
} {
  const spacingFt     = s.fenceSpacingFt ?? 8;
  const gateCount     = s.gateCount      ?? 0;
  const gateWidthFt   = s.gateWidthFt    ?? 12;
  const totalGateW    = gateCount * gateWidthFt;

  if (polygon?.coordinates?.[0]?.length > 2) {
    const coords   = polygon.coordinates[0] as [number, number][];
    const pts      = coords.slice(0, coords.length - 1); // remove closing coord

    // Get real edge lengths in feet
    const edgeLengths: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const next = pts[(i + 1) % pts.length];
      edgeLengths.push(Math.round(hav(pts[i], next) * 3.28084));
    }

    const perimFt = edgeLengths.reduce((a, b) => a + b, 0);
    const corners = countCorners(polygon);

    // Subtract gate width proportionally from the longest edge(s)
    // (simplification: subtract total gate width from full perimeter before post calc)
    const effectiveFt = Math.max(0, perimFt - totalGateW);

    // Edge-by-edge line posts
    const edgeBreakdown = edgeLengths.map(len => {
      // Scale each edge proportionally by (effectiveFt / perimFt)
      const scaledLen = perimFt > 0 ? (len * effectiveFt / perimFt) : 0;
      return { lengthFt: len, posts: Math.floor(scaledLen / spacingFt) };
    });

    const linePosts   = edgeBreakdown.reduce((sum, e) => sum + e.posts, 0);
    const cornerPosts = corners;
    const gatePosts   = gateCount * 2;
    const totalPosts  = linePosts + cornerPosts + gatePosts;

    return {
      perimeterFt: perimFt, isReal: true,
      effectiveFenceFt: effectiveFt, totalGateWidthFt: totalGateW,
      cornerCount: corners, linePosts, cornerPosts, gatePosts, totalPosts,
      spacingFt, edgeBreakdown,
    };
  }

  // Fallback: square lot
  const perimFt     = Math.round(Math.sqrt(acres * 43560) * 4);
  const effectiveFt = Math.max(0, perimFt - totalGateW);
  const linePosts   = Math.ceil(effectiveFt / spacingFt);
  const cornerPosts = 4;
  const gatePosts   = gateCount * 2;

  return {
    perimeterFt: perimFt, isReal: false,
    effectiveFenceFt: effectiveFt, totalGateWidthFt: totalGateW,
    cornerCount: 4, linePosts, cornerPosts, gatePosts,
    totalPosts: linePosts + cornerPosts + gatePosts,
    spacingFt, edgeBreakdown: [{ lengthFt: perimFt, posts: linePosts }],
  };
}

// ─── COST ENGINE: acreage → hours → cost (not guessed from $/acre) ─────────────
// Base production hours per acre by vegetation density

const PROD_HOURS: Record<string, Record<string, { min: number; max: number }>> = {
  conservative: {
    light:  { min: 12, max: 20 },
    medium: { min: 28, max: 50 },
    heavy:  { min: 60, max: 100 },
  },
  standard: {
    light:  { min: 8,  max: 16 },
    medium: { min: 18, max: 36 },
    heavy:  { min: 40, max: 80 },
  },
  aggressive: {
    light:  { min: 5,  max: 10 },
    medium: { min: 12, max: 24 },
    heavy:  { min: 28, max: 55 },
  },
};

// Condition multipliers on hours (not on price)
const TERRAIN_HRS = { flat: 1.0, slight_slope: 1.20, steep: 1.50 };
const ACCESS_HRS  = { easy: 1.0, moderate: 1.20,     difficult: 1.45 };
const WATER_HRS   = { none: 1.0, pond_or_creek: 1.15, wetland: 1.30 };

// Rates (these are transparent and overridable later in Contractor Mode)
const MACHINE_RATE = 150;  // $/hr
const LABOR_RATE   = 50;   // $/hr per crew member

// Fixed addons (not % stacks)
function getAddons(s: LandSelections, totalHrsMid: number): { label: string; costLow: number; costHigh: number }[] {
  const addons: { label: string; costLow: number; costHigh: number }[] = [];
  if (s.debris === "light") addons.push({ label: "Light debris haul-off", costLow: 500,  costHigh: 1500 });
  if (s.debris === "heavy") addons.push({ label: "Heavy debris haul-off", costLow: 2000, costHigh: 6000 });
  if (s.water === "pond_or_creek") addons.push({ label: "Erosion control / silt fencing", costLow: 300, costHigh: 800 });
  if (s.water === "wetland")       addons.push({ label: "Wetland erosion control + consultant", costLow: 1500, costHigh: 5000 });
  if (s.accessibility === "difficult") addons.push({ label: "Equipment mobilization (remote site)", costLow: 1000, costHigh: 3000 });
  if (s.structures === "fencing")      addons.push({ label: "Remove existing fencing", costLow: 300, costHigh: 1000 });
  if (s.structures === "buildings_utilities") addons.push({ label: "Utility locate + demo", costLow: 500, costHigh: 2500 });
  return addons;
}

interface CostResult {
  rate:            string;
  hoursPerAcre:    { min: number; max: number };
  rawHours:        { min: number; max: number };
  adjustedHours:   { min: number; max: number };
  crewSize:        number;
  machineCost:     { min: number; max: number };
  laborCost:       { min: number; max: number };
  addons:          { label: string; costLow: number; costHigh: number }[];
  addonTotal:      { min: number; max: number };
  totalCost:       { min: number; max: number };
  terrainFactor:   number;
  accessFactor:    number;
  waterFactor:     number;
}

function calcCostEngine(acres: number, s: LandSelections): CostResult {
  const rate   = s.productionRate ?? "standard";
  const base   = PROD_HOURS[rate][s.vegetation];
  const tFac   = TERRAIN_HRS[s.terrain];
  const aFac   = ACCESS_HRS[s.accessibility];
  const wFac   = WATER_HRS[s.water];

  const rawMin = base.min * acres;
  const rawMax = base.max * acres;
  const adjMin = Math.round(rawMin * tFac * aFac * wFac * 10) / 10;
  const adjMax = Math.round(rawMax * tFac * aFac * wFac * 10) / 10;

  const crew  = s.vegetation === "light" ? 2 : s.vegetation === "medium" ? 3 : 5;

  const machMin = Math.round(adjMin * MACHINE_RATE);
  const machMax = Math.round(adjMax * MACHINE_RATE);
  const labMin  = Math.round(adjMin * crew * LABOR_RATE);
  const labMax  = Math.round(adjMax * crew * LABOR_RATE);

  const midHrs = (adjMin + adjMax) / 2;
  const addons = getAddons(s, midHrs);
  const addonMin = addons.reduce((s, a) => s + a.costLow,  0);
  const addonMax = addons.reduce((s, a) => s + a.costHigh, 0);

  const totalMin = Math.round((machMin + labMin + addonMin) / 100) * 100;
  const totalMax = Math.round((machMax + labMax + addonMax) / 100) * 100;

  return {
    rate,
    hoursPerAcre:  base,
    rawHours:      { min: Math.round(rawMin * 10)/10, max: Math.round(rawMax * 10)/10 },
    adjustedHours: { min: adjMin, max: adjMax },
    crewSize:      crew,
    machineCost:   { min: machMin, max: machMax },
    laborCost:     { min: labMin,  max: labMax  },
    addons,
    addonTotal:    { min: addonMin, max: addonMax },
    totalCost:     { min: totalMin, max: totalMax },
    terrainFactor: tFac,
    accessFactor:  aFac,
    waterFactor:   wFac,
  };
}

// ─── Confidence ───────────────────────────────────────────────────────────────

function getConfidence(s: LandSelections): { level: "Low" | "Medium" | "High"; reasons: string[] } {
  const r: string[] = [];
  if (s.vegetation === "heavy")               r.push("Heavy vegetation — density varies significantly across parcel");
  if (s.terrain === "steep")                  r.push("Steep terrain — equipment efficiency hard to predict");
  if (s.accessibility === "difficult")        r.push("Difficult access — mobilization costs vary by site");
  if (s.water === "wetland")                  r.push("Wetland — regulatory and scope uncertainty");
  if (s.water === "pond_or_creek")            r.push("Water present — erosion control scope unknown");
  if (s.structures === "buildings_utilities") r.push("Utilities present — below-grade conditions unknown");
  if (s.debris === "heavy")                   r.push("Heavy debris — disposal cost varies by material");
  r.push("Site visit required to confirm all conditions");
  const level: "Low" | "Medium" | "High" = r.length <= 2 ? "High" : r.length <= 4 ? "Medium" : "Low";
  return { level, reasons: r };
}

// ─── Materials ────────────────────────────────────────────────────────────────

function calcMaterials(acres: number) {
  const sqFt    = Math.round(acres * 43560 * 0.20);
  const mulchCy = Math.round(((sqFt * (3/12)) / 27) * 10) / 10;
  return { sqFt, mulchCy };
}

// ─── Equipment ───────────────────────────────────────────────────────────────

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

// ─── Descriptors ─────────────────────────────────────────────────────────────

const VEG_LABEL = { light: "Light Vegetation", medium: "Medium Vegetation", heavy: "Heavy Vegetation" };
const TER_LABEL = { flat: "Flat Terrain", slight_slope: "Slight Slope", steep: "Steep Terrain" };
const ACC_LABEL = { easy: "Easy Access", moderate: "Moderate Access", difficult: "Difficult Access" };
const WATER_LABEL  = { none: "None", pond_or_creek: "Pond or creek present", wetland: "Wetland area" };
const STRUCT_LABEL = { none: "None", fencing: "Existing fencing", buildings_utilities: "Buildings / Utilities" };
const DEBRIS_LABEL = { none: "None", light: "Light debris", heavy: "Heavy debris / trash" };
const RATE_LABEL   = { conservative: "Conservative", standard: "Standard", aggressive: "Aggressive" };

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

  const fence   = hasAcre ? calcFenceEngine(propertyData.boundary, acres, selections) : null;
  const cost    = hasAcre ? calcCostEngine(acres, selections) : null;
  const mats    = hasAcre ? calcMaterials(acres) : null;
  const equip   = getEquipment(selections);
  const conf    = getConfidence(selections);

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
              { icon: Ruler,     label: "Property Size", value: hasAcre ? `${acres} Acres` : "Not defined",       color: "bg-blue-500/10 text-blue-400" },
              { icon: Leaf,      label: "Vegetation",    value: VEG_LABEL[selections.vegetation],                  color: "bg-green-500/10 text-green-400" },
              { icon: Mountain,  label: "Terrain",       value: TER_LABEL[selections.terrain],                     color: "bg-amber-500/10 text-amber-400" },
              { icon: MapPin,    label: "Accessibility", value: ACC_LABEL[selections.accessibility],               color: "bg-purple-500/10 text-purple-400" },
              { icon: Droplets,  label: "Water",         value: WATER_LABEL[selections.water],                     color: "bg-cyan-500/10 text-cyan-400" },
              { icon: Building2, label: "Structures",    value: STRUCT_LABEL[selections.structures],               color: "bg-orange-500/10 text-orange-400" },
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

          {/* Production rate + debris callouts */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-primary/5 text-xs">
              <span className="text-muted-foreground">Production Rate:</span>
              <span className="text-primary font-semibold">{RATE_LABEL[selections.productionRate]}</span>
            </div>
            {fence && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-primary/5 text-xs">
                <span className="text-muted-foreground">Post spacing:</span>
                <span className="text-primary font-semibold">{selections.fenceSpacingFt} ft</span>
              </div>
            )}
            {(selections.gateCount ?? 0) > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-primary/5 text-xs">
                <span className="text-muted-foreground">{selections.gateCount} gate{(selections.gateCount??0) > 1 ? "s" : ""} × {selections.gateWidthFt} ft =</span>
                <span className="text-primary font-semibold">{(selections.gateCount??0) * (selections.gateWidthFt??12)} ft subtracted</span>
              </div>
            )}
          </div>

          {/* Live calc preview */}
          {hasAcre && fence && cost && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: fence.isReal ? "True Perimeter" : "Est. Perimeter ⁽*⁾",    value: `${fence.perimeterFt.toLocaleString()} ft` },
                { label: `Total Posts (${fence.cornerCount} corners, ${selections.gateCount??0} gates)`, value: `${fence.totalPosts}` },
                { label: `Hours (${RATE_LABEL[selections.productionRate]})`,          value: `${cost.adjustedHours.min}–${cost.adjustedHours.max}` },
                { label: "Est. Total Cost",                                            value: `$${cost.totalCost.min.toLocaleString()}–$${cost.totalCost.max.toLocaleString()}` },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 rounded-lg border bg-primary/5 text-center">
                  <p className="text-lg font-bold text-primary">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{label}</p>
                </div>
              ))}
            </div>
          )}

          {!fence?.isReal && hasAcre && (
            <p className="text-xs text-muted-foreground/70 italic">
              ⁽*⁾ Perimeter estimated from square-lot assumption. Draw your boundary for a real measurement.
            </p>
          )}

          {/* Cost badge */}
          {cost && (
            <div className="p-4 rounded-lg border bg-primary/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><DollarSign className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Estimated Total Cost</p>
                  <p className="text-2xl font-bold text-primary">${cost.totalCost.min.toLocaleString()} – ${cost.totalCost.max.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Based on hours × rates, not $/acre guessing</p>
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
                  fence?.isReal ? "Real perimeter + corners from polygon" : "Perimeter estimate",
                  "Gate width subtracted before post calc",
                  "Edge-by-edge post layout",
                  "Hours → cost (not $/acre guessing)",
                  "Fixed addons (not % stacks)",
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
              { l: "Vegetation",    v: VEG_LABEL[selections.vegetation] },
              { l: "Terrain",       v: TER_LABEL[selections.terrain] },
              { l: "Accessibility", v: ACC_LABEL[selections.accessibility] },
              { l: "Water",         v: WATER_LABEL[selections.water] },
              { l: "Debris",        v: DEBRIS_LABEL[selections.debris] },
            ].map((item, i) => (
              <div key={i} style={{ background: D.bgCard, padding: "12px 10px" }}>
                <div style={{ fontSize: "8px", color: D.dim, fontFamily: "sans-serif", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "3px" }}>{item.l}</div>
                <div style={{ fontSize: "11px", fontWeight: "600", fontFamily: "sans-serif", color: D.text }}>{item.v}</div>
              </div>
            ))}
          </div>

          {/* ── FENCE ENGINE ── */}
          {fence && (
            <>
              <RH label="🔲  Fence Estimate" D={D} />
              <div style={{ background: D.bgSect, border: `1px solid ${D.border}`, borderRadius: "6px", padding: "16px 18px", marginBottom: "20px" }}>

                {/* Perimeter */}
                <Row label={`Boundary perimeter ${fence.isReal ? "(measured from drawn shape)" : "(est. square lot)"}`}
                     value={`${fence.perimeterFt.toLocaleString()} ft`} D={D} bold />
                {fence.totalGateWidthFt > 0 && (
                  <Row label={`Gate deduction: ${selections.gateCount} gate${(selections.gateCount??0)>1?"s":""} × ${selections.gateWidthFt} ft`}
                       value={`− ${fence.totalGateWidthFt} ft`} D={D} dim />
                )}
                <Row label="Effective fence length"
                     value={`${fence.effectiveFenceFt.toLocaleString()} ft`} D={D} />

                {/* Post breakdown */}
                <div style={{ marginTop: "12px", borderTop: `1px solid ${D.border}`, paddingTop: "10px" }}>
                  <div style={{ fontSize: "10px", color: D.dim, fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
                    Post Calculation (edge-by-edge at {fence.spacingFt} ft spacing)
                  </div>
                  <Row label={`Line posts: ${fence.effectiveFenceFt.toLocaleString()} ft ÷ ${fence.spacingFt} ft/post`}
                       value={`${fence.linePosts} posts`} D={D} />
                  <Row label={`Corner posts: ${fence.cornerCount} vertices detected`}
                       value={`+ ${fence.cornerPosts} posts`} D={D} dim />
                  <Row label={`Gate posts: ${selections.gateCount??0} gates × 2`}
                       value={`+ ${fence.gatePosts} posts`} D={D} dim />
                  <div style={{ borderTop: `1px solid ${D.borderAcc}`, marginTop: "8px", paddingTop: "8px", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "14px", fontWeight: "700", color: D.text, fontFamily: "sans-serif" }}>Total Posts</span>
                    <span style={{ fontSize: "22px", fontWeight: "800", color: D.primary, fontFamily: "sans-serif" }}>{fence.totalPosts}</span>
                  </div>
                  <div style={{ fontSize: "10px", color: D.dim, fontStyle: "italic", marginTop: "6px" }}>
                    Adjust for terrain variation, gate width preferences, and local building code.
                    {!fence.isReal && " ⚠ Square-lot estimate — draw your boundary for real numbers."}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── COST ENGINE ── */}
          {cost && (
            <>
              <RH label={`💵  Cost Estimate — ${RATE_LABEL[cost.rate]} Production Rate`} D={D} />
              <div style={{ background: D.bgSect, border: `1px solid ${D.borderAcc}`, borderRadius: "6px", padding: "16px 18px", marginBottom: "20px" }}>

                {/* Hours derivation */}
                <div style={{ fontSize: "10px", color: D.dim, fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
                  Step 1 — Hours Required
                </div>
                <Row label={`Base: ${acres} acres × ${cost.hoursPerAcre.min}–${cost.hoursPerAcre.max} hrs/acre (${VEG_LABEL[selections.vegetation].toLowerCase()}, ${RATE_LABEL[cost.rate].toLowerCase()})`}
                     value={`${cost.rawHours.min}–${cost.rawHours.max} hrs`} D={D} bold />
                {cost.terrainFactor > 1 && <Row label={`Terrain factor (${TER_LABEL[selections.terrain].toLowerCase()}) ×${cost.terrainFactor}`} value="" D={D} dim />}
                {cost.accessFactor > 1  && <Row label={`Access factor (${ACC_LABEL[selections.accessibility].toLowerCase()}) ×${cost.accessFactor}`} value="" D={D} dim />}
                {cost.waterFactor > 1   && <Row label={`Water factor (${WATER_LABEL[selections.water]}) ×${cost.waterFactor}`} value="" D={D} dim />}
                <Row label="Adjusted total hours (conditions applied)"
                     value={`${cost.adjustedHours.min}–${cost.adjustedHours.max} hrs`} D={D} />

                {/* Cost derivation */}
                <div style={{ marginTop: "14px", borderTop: `1px solid ${D.border}`, paddingTop: "10px" }}>
                  <div style={{ fontSize: "10px", color: D.dim, fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
                    Step 2 — Labor Cost
                  </div>
                  <Row label={`Machine: ${cost.adjustedHours.min}–${cost.adjustedHours.max} hrs × $${MACHINE_RATE}/hr`}
                       value={`$${cost.machineCost.min.toLocaleString()} – $${cost.machineCost.max.toLocaleString()}`} D={D} />
                  <Row label={`Crew: ${cost.adjustedHours.min}–${cost.adjustedHours.max} hrs × ${cost.crewSize} operators × $${LABOR_RATE}/hr`}
                       value={`$${cost.laborCost.min.toLocaleString()} – $${cost.laborCost.max.toLocaleString()}`} D={D} />
                </div>

                {/* Addons */}
                {cost.addons.length > 0 && (
                  <div style={{ marginTop: "14px", borderTop: `1px solid ${D.border}`, paddingTop: "10px" }}>
                    <div style={{ fontSize: "10px", color: D.dim, fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
                      Step 3 — Fixed Addons
                    </div>
                    {cost.addons.map((a, i) => (
                      <Row key={i} label={a.label}
                           value={`$${a.costLow.toLocaleString()} – $${a.costHigh.toLocaleString()}`} D={D} dim />
                    ))}
                  </div>
                )}

                {/* Total */}
                <div style={{ borderTop: `2px solid ${D.primaryDk}`, marginTop: "14px", paddingTop: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "15px", fontWeight: "700", color: D.text, fontFamily: "sans-serif" }}>Total Estimate</span>
                    <span style={{ fontSize: "28px", fontWeight: "800", color: D.primary, fontFamily: "sans-serif" }}>
                      ${cost.totalCost.min.toLocaleString()} – ${cost.totalCost.max.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ fontSize: "10px", color: D.dim, fontStyle: "italic", marginTop: "6px" }}>
                    Rates: machine $150/hr, crew $50/hr/operator. Adjust in Contractor Mode (coming soon).
                  </div>
                </div>

                {/* Confidence */}
                <div style={{ marginTop: "12px", borderTop: `1px solid ${D.border}`, paddingTop: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: "10px", color: D.dim, fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>Why confidence is {conf.level}</div>
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
              <div style={{ fontSize: "10px", color: D.dim, fontStyle: "italic", marginBottom: "24px" }}>
                Assuming ~20% of lot landscaped ({mats.sqFt.toLocaleString()} sq ft), 3-inch mulch depth.
              </div>
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

function Row({ label, value, D, bold, dim }: { label: string; value: string; D: any; bold?: boolean; dim?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "5px 0", borderBottom: `1px solid ${D.border}` }}>
      <span style={{ fontSize: "11px", color: dim ? D.dim : D.muted, fontFamily: "sans-serif", fontWeight: bold ? "600" : "400", maxWidth: "72%", lineHeight: 1.4 }}>{label}</span>
      {value && <span style={{ fontSize: "12px", fontWeight: bold ? "700" : "600", color: bold ? D.text : D.primary, fontFamily: "sans-serif", whiteSpace: "nowrap", marginLeft: "12px" }}>{value}</span>}
    </div>
  );
}

export default JobReport;
