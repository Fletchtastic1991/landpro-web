import React from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type VegetationDensity = "light" | "medium" | "heavy";
export type TerrainType = "flat" | "slight_slope" | "steep";
export type AccessibilityLevel = "easy" | "moderate" | "difficult";

export interface LandSelections {
  vegetation: VegetationDensity;
  terrain: TerrainType;
  accessibility: AccessibilityLevel;
}

export const DEFAULT_LAND_SELECTIONS: LandSelections = {
  vegetation: "light",
  terrain: "flat",
  accessibility: "easy",
};

interface LandSelectorsProps {
  selections: LandSelections;
  onSelectionChange: (key: keyof LandSelections, value: string) => void;
  className?: string;
}

const LandSelectors: React.FC<LandSelectorsProps> = ({
  selections,
  onSelectionChange,
  className,
}) => {
  const groupStyle = "flex flex-col space-y-3";
  const toggleGroupStyle = "grid grid-cols-3 gap-2 w-full";
  const itemStyle = "h-12 text-sm font-medium border-2 transition-all data-[state=on]:border-primary data-[state=on]:bg-primary/5 data-[state=on]:text-primary";

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-6", className)}>
      {/* Vegetation Density */}
      <div className={groupStyle}>
        <Label className="text-base font-semibold">Vegetation Density</Label>
        <ToggleGroup
          type="single"
          value={selections.vegetation}
          onValueChange={(value) => value && onSelectionChange("vegetation", value)}
          className={toggleGroupStyle}
        >
          <ToggleGroupItem value="light" className={itemStyle}>
            Light
          </ToggleGroupItem>
          <ToggleGroupItem value="medium" className={itemStyle}>
            Medium
          </ToggleGroupItem>
          <ToggleGroupItem value="heavy" className={itemStyle}>
            Heavy
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Terrain */}
      <div className={groupStyle}>
        <Label className="text-base font-semibold">Terrain</Label>
        <ToggleGroup
          type="single"
          value={selections.terrain}
          onValueChange={(value) => value && onSelectionChange("terrain", value)}
          className={toggleGroupStyle}
        >
          <ToggleGroupItem value="flat" className={itemStyle}>
            Flat
          </ToggleGroupItem>
          <ToggleGroupItem value="slight_slope" className={itemStyle}>
            Slight Slope
          </ToggleGroupItem>
          <ToggleGroupItem value="steep" className={itemStyle}>
            Steep
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Accessibility */}
      <div className={groupStyle}>
        <Label className="text-base font-semibold">Accessibility</Label>
        <ToggleGroup
          type="single"
          value={selections.accessibility}
          onValueChange={(value) => value && onSelectionChange("accessibility", value)}
          className={toggleGroupStyle}
        >
          <ToggleGroupItem value="easy" className={itemStyle}>
            Easy
          </ToggleGroupItem>
          <ToggleGroupItem value="moderate" className={itemStyle}>
            Moderate
          </ToggleGroupItem>
          <ToggleGroupItem value="difficult" className={itemStyle}>
            Difficult
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
};

export default LandSelectors;
