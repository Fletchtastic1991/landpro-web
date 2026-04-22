import React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type VegetationDensity  = "light" | "medium" | "heavy";
export type TerrainType        = "flat" | "slight_slope" | "steep";
export type AccessibilityLevel = "easy" | "moderate" | "difficult";
export type WaterPresence      = "none" | "pond_or_creek" | "wetland";
export type ExistingStructures = "none" | "fencing" | "buildings_utilities";
export type DebrisLevel        = "none" | "light" | "heavy";
export type ProductionRate     = "conservative" | "standard" | "aggressive";

export interface LandSelections {
  vegetation:     VegetationDensity;
  terrain:        TerrainType;
  accessibility:  AccessibilityLevel;
  water:          WaterPresence;
  structures:     ExistingStructures;
  debris:         DebrisLevel;
  productionRate: ProductionRate;
  // Fence planning
  gateCount:      number;
  gateWidthFt:    number; // ft per gate (walk=4, drive=12)
  fenceSpacingFt: number; // post spacing: 6, 8, 10, or 12
}

export const DEFAULT_LAND_SELECTIONS: LandSelections = {
  vegetation:     "light",
  terrain:        "flat",
  accessibility:  "easy",
  water:          "none",
  structures:     "none",
  debris:         "none",
  productionRate: "standard",
  gateCount:      0,
  gateWidthFt:    12,
  fenceSpacingFt: 8,
};

interface LandSelectorsProps {
  selections: LandSelections;
  onSelectionChange: (key: keyof LandSelections, value: string | number) => void;
  className?: string;
}

const itemStyle =
  "h-12 text-sm font-medium border-2 transition-all data-[state=on]:border-primary data-[state=on]:bg-primary/5 data-[state=on]:text-primary";

// ─── Component ────────────────────────────────────────────────────────────────

const LandSelectors: React.FC<LandSelectorsProps> = ({
  selections,
  onSelectionChange,
  className,
}) => {
  return (
    <div className={cn("space-y-6", className)}>

      {/* ── Core Site Conditions ── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Core Site Conditions
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <TR label="Vegetation Density" sublabel="Overall tree and brush coverage"
            options={[{v:"light",l:"Light"},{v:"medium",l:"Medium"},{v:"heavy",l:"Heavy"}]}
            value={selections.vegetation} onChange={(v) => onSelectionChange("vegetation", v)} />
          <TR label="Terrain" sublabel="Ground slope and grade"
            options={[{v:"flat",l:"Flat"},{v:"slight_slope",l:"Slight Slope"},{v:"steep",l:"Steep"}]}
            value={selections.terrain} onChange={(v) => onSelectionChange("terrain", v)} />
          <TR label="Accessibility" sublabel="Equipment access to the site"
            options={[{v:"easy",l:"Easy"},{v:"moderate",l:"Moderate"},{v:"difficult",l:"Difficult"}]}
            value={selections.accessibility} onChange={(v) => onSelectionChange("accessibility", v)} />
        </div>
      </div>

      <div className="border-t border-dashed" />

      {/* ── Field Observations ── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Field Observations
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <TR label="Water Presence" sublabel="Ponds, creeks, or wetlands on parcel"
            options={[{v:"none",l:"None"},{v:"pond_or_creek",l:"Pond / Creek"},{v:"wetland",l:"Wetland"}]}
            value={selections.water} onChange={(v) => onSelectionChange("water", v)} />
          <TR label="Existing Structures" sublabel="Anything already on the property"
            options={[{v:"none",l:"None"},{v:"fencing",l:"Fencing"},{v:"buildings_utilities",l:"Buildings / Utilities"}]}
            value={selections.structures} onChange={(v) => onSelectionChange("structures", v)} />
          <TR label="Debris / Waste" sublabel="Existing debris requiring disposal"
            options={[{v:"none",l:"None"},{v:"light",l:"Light"},{v:"heavy",l:"Heavy / Trash"}]}
            value={selections.debris} onChange={(v) => onSelectionChange("debris", v)} />
        </div>
      </div>

      <div className="border-t border-dashed" />

      {/* ── Production Rate ── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Production Rate Mode
        </p>
        <div className="max-w-md">
          <TR
            label="Clearing Speed"
            sublabel="How aggressively will the crew work? Affects hours and cost range."
            options={[
              {v:"conservative", l:"Conservative"},
              {v:"standard",     l:"Standard"},
              {v:"aggressive",   l:"Aggressive"},
            ]}
            value={selections.productionRate}
            onChange={(v) => onSelectionChange("productionRate", v)}
          />
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
            <span className="text-center">Slower, thorough. Expect more hours.</span>
            <span className="text-center">Typical field crew. Default estimate.</span>
            <span className="text-center">Experienced crew, fast equipment.</span>
          </div>
        </div>
      </div>

      <div className="border-t border-dashed" />

      {/* ── Fence Planning ── */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Fence Planning
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Post Spacing */}
          <div className="flex flex-col space-y-2">
            <div>
              <Label className="text-base font-semibold">Post Spacing</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Distance between fence posts</p>
            </div>
            <ToggleGroup
              type="single"
              value={String(selections.fenceSpacingFt)}
              onValueChange={(v) => v && onSelectionChange("fenceSpacingFt", parseInt(v))}
              className="grid grid-cols-4 gap-2 w-full"
            >
              {[6, 8, 10, 12].map((ft) => (
                <ToggleGroupItem key={ft} value={String(ft)} className={itemStyle}>
                  {ft} ft
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <p className="text-xs text-muted-foreground">8 ft is standard for most fence types</p>
          </div>

          {/* Gate Count */}
          <div className="flex flex-col space-y-2">
            <div>
              <Label className="text-base font-semibold">Number of Gates</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Gates are subtracted from fence length</p>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <Input
                type="number"
                min={0}
                max={20}
                value={selections.gateCount}
                onChange={(e) => onSelectionChange("gateCount", Math.max(0, parseInt(e.target.value) || 0))}
                className="w-24 text-center text-lg font-semibold h-12"
              />
              <span className="text-sm text-muted-foreground">
                {selections.gateCount === 0
                  ? "No gates"
                  : `${selections.gateCount} gate${selections.gateCount > 1 ? "s" : ""}`}
              </span>
            </div>
          </div>

          {/* Gate Width */}
          <div className="flex flex-col space-y-2">
            <div>
              <Label className="text-base font-semibold">Gate Width</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Width per gate — reduces fence length</p>
            </div>
            <ToggleGroup
              type="single"
              value={String(selections.gateWidthFt)}
              onValueChange={(v) => v && onSelectionChange("gateWidthFt", parseInt(v))}
              className="grid grid-cols-2 gap-2 w-full"
            >
              <ToggleGroupItem value="4" className={itemStyle}>4 ft<br/><span className="text-[10px] font-normal">Walk gate</span></ToggleGroupItem>
              <ToggleGroupItem value="10" className={itemStyle}>10 ft<br/><span className="text-[10px] font-normal">Equipment</span></ToggleGroupItem>
              <ToggleGroupItem value="12" className={itemStyle}>12 ft<br/><span className="text-[10px] font-normal">Standard drive</span></ToggleGroupItem>
              <ToggleGroupItem value="16" className={itemStyle}>16 ft<br/><span className="text-[10px] font-normal">Large drive</span></ToggleGroupItem>
            </ToggleGroup>
          </div>

        </div>

        {/* Live fence summary */}
        {selections.gateCount > 0 && (
          <div className="mt-4 p-3 rounded-lg border bg-primary/5 text-sm text-muted-foreground">
            <span className="text-primary font-semibold">{selections.gateCount} gate{selections.gateCount > 1 ? "s" : ""}</span>
            {" "}× {selections.gateWidthFt} ft = <span className="text-primary font-semibold">{selections.gateCount * selections.gateWidthFt} ft</span> subtracted from fence length.
            {" "}Posts at <span className="text-primary font-semibold">{selections.fenceSpacingFt} ft</span> spacing.
          </div>
        )}
      </div>

    </div>
  );
};

// ─── Toggle Row helper ────────────────────────────────────────────────────────

function TR({
  label, sublabel, options, value, onChange,
}: {
  label: string;
  sublabel: string;
  options: { v: string; l: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col space-y-2">
      <div>
        <Label className="text-base font-semibold">{label}</Label>
        <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>
      </div>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(v) => v && onChange(v)}
        className="grid gap-2 w-full"
        style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
      >
        {options.map((opt) => (
          <ToggleGroupItem key={opt.v} value={opt.v} className={itemStyle}>
            {opt.l}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

export default LandSelectors;
