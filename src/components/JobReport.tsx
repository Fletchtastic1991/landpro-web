import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LandSelections } from "@/components/LandSelectors";
import { cn } from "@/lib/utils";
import { Calendar, Ruler, Leaf, Mountain, MapPin } from "lucide-react";

interface JobReportProps {
  propertyData: {
    acreage: number | null;
    squareMeters: number | null;
  };
  selections: LandSelections;
  className?: string;
}

const JobReport: React.FC<JobReportProps> = ({ propertyData, selections, className }) => {
  const timestamp = new Date().toLocaleString();

  const formatValue = (value: string) => {
    return value.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const ReportItem = ({ icon: Icon, label, value, colorClass }: { icon: any, label: string, value: string, colorClass: string }) => (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-background/50">
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-md", colorClass)}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );

  return (
    <Card className={cn("overflow-hidden border-2", className)}>
      <CardHeader className="bg-primary/5 border-b py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold tracking-tight">Job Summary Report</CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {timestamp}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ReportItem 
            icon={Ruler} 
            label="Property Size" 
            value={propertyData.acreage !== null ? `${propertyData.acreage} Acres` : "Not defined"} 
            colorClass="bg-blue-500/10 text-blue-600"
          />
          <ReportItem 
            icon={Leaf} 
            label="Vegetation" 
            value={formatValue(selections.vegetation)} 
            colorClass="bg-green-500/10 text-green-600"
          />
          <ReportItem 
            icon={Mountain} 
            label="Terrain" 
            value={formatValue(selections.terrain)} 
            colorClass="bg-amber-500/10 text-amber-600"
          />
          <ReportItem 
            icon={MapPin} 
            label="Accessibility" 
            value={formatValue(selections.accessibility)} 
            colorClass="bg-purple-500/10 text-purple-600"
          />
        </div>
        
        <div className="pt-4 border-t">
          <p className="text-[10px] text-center text-muted-foreground italic">
            This report is a snapshot of current selections and property data.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default JobReport;
