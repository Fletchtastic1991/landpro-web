import React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";
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
}

export const DEFAULT_LAND_SELECTIONS: LandSelections = {
  vegetation:    "light",
  terrain:       "flat",
  accessibility: "easy",
  water:         "none",
  structures:    "none",
  debris:        "none",
};

interface LandSelectorsProps {
  selections: LandSelections;
  onSelectionChange: (key: keyof LandSelections, value: string) => void;
  className?: string;
}

// ─── Toggle row config ────────────────────────────────────────────────────────

const TOGGLE_ROWS: {
  key: keyof LandSelections;
  label: string;
  sublabel: string;
  options: { value: string; label: string }[];
  cols: number;
}[] = [
  {
    key: "vegetation",
    label: "Vegetation Density",
    sublabel: "Overall tree and brush coverage",
    cols: 3,
    options: [
      { value: "light",  label: "Light"  },
      { value: "medium", label: "Medium" },
      { value: "heavy",  label: "Heavy"  },
    ],
  },
  {
    key: "terrain",
    label: "Terrain",
    sublabel: "Ground slope and grade",
    cols: 3,
    options: [
      { value: "flat",         label: "Flat"        },
      { value: "slight_slope", label: "Slight Slope" },
      { value: "steep",        label: "Steep"       },
    ],
  },
  {
    key: "accessibility",
    label: "Accessibility",
    sublabel: "Equipment access to the site",
    cols: 3,
    options: [
      { value: "easy",      label: "Easy"      },
      { value: "moderate",  label: "Moderate"  },
      { value: "difficult", label: "Difficult" },
    ],
  },
  {
    key: "water",
    label: "Water Presence",
    sublabel: "Ponds, creeks, or wetlands on parcel",
    cols: 3,
    options: [
      { value: "none",           label: "None"            },
      { value: "pond_or_creek",  label: "Pond / Creek"    },
      { value: "wetland",        label: "Wetland Area"    },
    ],
  },
  {
    key: "structures",
    label: "Existing Structures",
    sublabel: "Anything already on the property",
    cols: 3,
    options: [
      { value: "none",                 label: "None"                },
      { value: "fencing",              label: "Fencing"             },
      { value: "buildings_utilities",  label: "Buildings / Utilities" },
    ],
  },
  {
    key: "debris",
    label: "Debris / Waste",
    sublabel: "Existing debris requiring disposal",
    cols: 3,
    options: [
      { value: "none",  label: "None"        },
      { value: "light", label: "Light Debris" },
      { value: "heavy", label: "Heavy / Trash" },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

const itemStyle =
  "h-12 text-sm font-medium border-2 transition-all data-[state=on]:border-primary data-[state=on]:bg-primary/5 data-[state=on]:text-primary";

const LandSelectors: React.FC<LandSelectorsProps> = ({
  selections,
  onSelectionChange,
  className,
}) => {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Core assessment — 3 columns */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Core Site Conditions
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TOGGLE_ROWS.slice(0, 3).map((row) => (
            <ToggleRow
              key={row.key}
              row={row}
              value={selections[row.key]}
              onChange={(v) => onSelectionChange(row.key, v)}
            />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-dashed" />

      {/* Field observations — 3 columns */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Field Observations
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TOGGLE_ROWS.slice(3).map((row) => (
            <ToggleRow
              key={row.key}
              row={row}
              value={selections[row.key]}
              onChange={(v) => onSelectionChange(row.key, v)}
            />
          ))}
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
        className={`grid gap-2 w-full`}
        style={{ gridTemplateColumns: `repeat(${row.cols}, 1fr)` }}
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
