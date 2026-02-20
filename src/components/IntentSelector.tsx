import { Card, CardContent } from "@/components/ui/card";
import { Building2, TreeDeciduous, Wheat, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type LandIntent = "build" | "clear" | "farm" | "evaluate";

interface IntentOption {
  id: LandIntent;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const INTENT_OPTIONS: IntentOption[] = [
  {
    id: "build",
    label: "Build",
    description: "Assess land for construction or development",
    icon: Building2,
  },
  {
    id: "clear",
    label: "Clear Land",
    description: "Plan brush clearing, grading, or site prep",
    icon: TreeDeciduous,
  },
  {
    id: "farm",
    label: "Farm",
    description: "Evaluate soil and terrain for agriculture",
    icon: Wheat,
  },
  {
    id: "evaluate",
    label: "Evaluate",
    description: "General land assessment and valuation",
    icon: Search,
  },
];

interface IntentSelectorProps {
  selectedIntent: LandIntent | null;
  onSelectIntent: (intent: LandIntent) => void;
  compact?: boolean;
}

export default function IntentSelector({ 
  selectedIntent, 
  onSelectIntent, 
  compact = false 
}: IntentSelectorProps) {
  if (compact) {
    return (
      <div className="flex gap-2 flex-wrap">
        {INTENT_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedIntent === option.id;
          return (
            <button
              key={option.id}
              onClick={() => onSelectIntent(option.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-[0_0_15px_hsl(var(--primary)/0.3)]"
                  : "bg-background/80 text-foreground border-border hover:bg-muted hover:border-primary/50"
              )}
            >
              <Icon className="h-4 w-4" />
              {option.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {INTENT_OPTIONS.map((option) => {
        const Icon = option.icon;
        const isSelected = selectedIntent === option.id;
        return (
          <Card
            key={option.id}
            onClick={() => onSelectIntent(option.id)}
            className={cn(
              "cursor-pointer transition-all hover:scale-[1.02]",
              isSelected
                ? "ring-2 ring-primary bg-primary/5 shadow-[0_0_20px_hsl(var(--primary)/0.2)]"
                : "hover:bg-muted/50"
            )}
          >
            <CardContent className="pt-6 text-center">
              <div className={cn(
                "w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center transition-colors",
                isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold mb-1">{option.label}</h3>
              <p className="text-sm text-muted-foreground">{option.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export { INTENT_OPTIONS };
