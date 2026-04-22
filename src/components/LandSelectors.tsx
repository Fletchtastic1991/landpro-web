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

export interface LandSelections {
  vegetation:    VegetationDensity;
  terrain:       TerrainType;
  accessibility: AccessibilityLevel;
  water:         WaterPresence;
  structures:    ExistingStructures;
  debris:        DebrisLevel;
  gateCount:     number; // number of fence gates planned
}

export const DEFAULT_LAND_SELECTIONS: LandSelections = {
  vegetation:    "light",
  terrain:       "flat",
  accessibility: "easy",
  water:         "none",
  structures:    "none",
  debris:        "none",
  gateCount:     0,
};

interface LandSelectorsProps {
  selections: LandSelections;
  onSelectionChange: (key: keyof LandSelections, value: string | number) => void;
  className?: string;
}

// ─── Toggle config ────────────────────────────────────────────────────────────

const TOGGLE_ROWS = [
  {
    key: "vegetation" as const,
    label: "Vegetation Density",
    sublabel: "Overall tree and brush coverage",
    options: [
      { value: "light",  label: "Light"  },
      { value: "medium", label: "Medium" },
      { value: "heavy",  label: "Heavy"  },
    ],
  },
  {
    key: "terrain" as const,
    label: "Terrain",
    sublabel: "Ground slope and grade",
    options: [
      { value: "flat",         label: "Flat"         },
      { value: "slight_slope", label: "Slight Slope" },
      { value: "steep",        label: "Steep"        },
    ],
  },
  {
    key: "accessibility" as const,
    label: "Accessibility",
    sublabel: "Equipment access to the site",
    options: [
      { value: "easy",      label: "Easy"      },
      { value: "moderate",  label: "Moderate"  },
      { value: "difficult", label: "Difficult" },
    ],
  },
  {
    key: "water" as const,
    label: "Water Presence",
    sublabel: "Ponds, creeks, or wetlands on parcel",
    options: [
      { value: "none",           label: "None"          },
      { value: "pond_or_creek",  label: "Pond / Creek"  },
      { value: "wetland",        label: "Wetland Area"  },
    ],
  },
  {
    key: "structures" as const,
    label: "Existing Structures",
    sublabel: "Anything already on the property",
    options: [
      { value: "none",                label: "None"                  },
      { value: "fencing",             label: "Fencing"               },
      { value: "buildings_utilities", label: "Buildings / Utilities" },
    ],
  },
  {
    key: "debris" as const,
    label: "Debris / Waste",
    sublabel: "Existing debris requiring disposal",
    options: [
      { value: "none",  label: "None"          },
      { value: "light", label: "Light Debris"  },
      { value: "heavy", label: "Heavy / Trash" },
    ],
  },
];

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

      {/* Core Site Conditions */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Core Site Conditions
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TOGGLE_ROWS.slice(0, 3).map((row) => (
            <ToggleRow
              key={row.key}
              row={row}
              value={String(selections[row.key])}
              onChange={(v) => onSelectionChange(row.key, v)}
            />
          ))}
        </div>
      </div>

      <div className="border-t border-dashed" />

      {/* Field Observations */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Field Observations
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TOGGLE_ROWS.slice(3).map((row) => (
            <ToggleRow
              key={row.key}
              row={row}
              value={String(selections[row.key])}
              onChange={(v) => onSelectionChange(row.key, v)}
            />
          ))}
        </div>
      </div>

      <div className="border-t border-dashed" />

      {/* Fence Planning */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Fence Planning
        </p>
        <div className="max-w-xs space-y-2">
          <div>
            <Label className="text-base font-semibold">Number of Gates</Label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-2">
              How many gates are planned for this fence? Used to calculate total post count.
            </p>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={0}
                max={20}
                value={selections.gateCount}
                onChange={(e) => onSelectionChange("gateCount", Math.max(0, parseInt(e.target.value) || 0))}
                className="w-24 text-center text-lg font-semibold"
              />
              <span className="text-sm text-muted-foreground">
                {selections.gateCount === 0
                  ? "No gates planned"
                  : `${selections.gateCount} gate${selections.gateCount > 1 ? "s" : ""} — adds ${selections.gateCount * 2} extra posts`}
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

// ─── Toggle Row ───────────────────────────────────────────────────────────────

function ToggleRow({
  row,
  value,
  onChange,
}: {
  row: (typeof TOGGLE_ROWS)[number];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col space-y-2">
      <div>
        <Label className="text-base font-semibold">{row.label}</Label>
        <p className="text-xs text-muted-foreground mt-0.5">{row.sublabel}</p>
      </div>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(v) => v && onChange(v)}
        className="grid gap-2 w-full"
        style={{ gridTemplateColumns: `repeat(${row.options.length}, 1fr)` }}
      >
        {row.options.map((opt) => (
          <ToggleGroupItem key={opt.value} value={opt.value} className={itemStyle}>
            {opt.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

export default LandSelectors;
