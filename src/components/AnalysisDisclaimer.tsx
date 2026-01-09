/**
 * LandPro Analysis Disclaimer v0.9
 * 
 * Professional informational-use disclaimer for report outputs.
 * - Calm, professional, non-alarming tone
 * - Unobtrusive footer placement
 * - No modals, popups, or forced acknowledgements
 */

import { Info } from "lucide-react";

export default function AnalysisDisclaimer() {
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-muted/40 border border-border/50 text-muted-foreground text-xs leading-relaxed">
      <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
      <p>
        This analysis is provided for informational and planning purposes only. 
        It is not a legal survey, engineering assessment, or guarantee of conditions. 
        Results are based on available data and the unknowns listed above. 
        Verify critical details with qualified professionals before making decisions.
      </p>
    </div>
  );
}
