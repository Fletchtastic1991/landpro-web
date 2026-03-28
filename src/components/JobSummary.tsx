import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LandSelections } from "@/components/LandSelectors";
import { cn } from "@/lib/utils";

interface JobSummaryProps {
  selections: LandSelections;
  className?: string;
}

const JobSummary: React.FC<JobSummaryProps> = ({ selections, className }) => {
  const formatLabel = (key: string) => {
    return key.charAt(0).toUpperCase() + key.slice(1);
  };

  const formatValue = (value: string) => {
    return value.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <Card className={cn("bg-muted/30 border-dashed", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Live Job Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Vegetation</p>
            <p className="text-sm font-semibold">{formatValue(selections.vegetation)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Terrain</p>
            <p className="text-sm font-semibold">{formatValue(selections.terrain)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Accessibility</p>
            <p className="text-sm font-semibold">{formatValue(selections.accessibility)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default JobSummary;
