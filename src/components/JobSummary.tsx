import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.ts";
import { LandSelections } from "@/components/LandSelectors.ts";
import { cn } from "@/lib/utils.ts";
import { Leaf, Mountain, MapPin } from "lucide-react";

interface JobSummaryProps {
  selections: LandSelections;
  className?: string;
}

const JobSummary: React.FC<JobSummaryProps> = ({ selections, className }) => {
  const formatValue = (value: string) => {
    return value.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <Card className={cn("bg-muted/30 border-dashed", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          Current Selection Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-green-500/10 text-green-600">
              <Leaf className="h-4 w-4" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Vegetation</p>
              <p className="text-sm font-semibold">{formatValue(selections.vegetation)}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
              <Mountain className="h-4 w-4" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Terrain</p>
              <p className="text-sm font-semibold">{formatValue(selections.terrain)}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
              <MapPin className="h-4 w-4" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Accessibility</p>
              <p className="text-sm font-semibold">{formatValue(selections.accessibility)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default JobSummary;
