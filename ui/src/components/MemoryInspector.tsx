/**
 * Memory Inspector & SitePro Test Panel
 * 
 * Non-production, read-only debug panel for viewing:
 * - All Memory Core records for a parcel
 * - Explicit unknowns
 * - Raw SitePro v0 output (manually triggered)
 * 
 * This component does NOT alter the analysis pipeline or reports.
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Bug, Play, AlertCircle, CheckCircle2, HelpCircle, Database, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useParcelMemory } from '@/hooks/useParcelMemory';
import { useSitePro } from '@/hooks/useSitePro';
import type { MemoryRecord } from '@/lib/memory';
import type { SiteProResult } from '@/lib/sitepro';

interface MemoryInspectorProps {
  parcelId: string | undefined;
}

export function MemoryInspector({ parcelId }: MemoryInspectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSiteProResult, setShowSiteProResult] = useState(false);

  const {
    records,
    unknowns,
    conflicts,
    isLoadingRecords,
    isLoadingUnknowns,
    isLoadingConflicts,
    recordsError,
    unknownsError,
    conflictsError,
    refetchRecords,
    refetchUnknowns,
    refetchConflicts,
  } = useParcelMemory(parcelId);

  const {
    result: siteProResult,
    isLoading: isSiteProLoading,
    error: siteProError,
    refetch: refetchSitePro,
  } = useSitePro(parcelId);

  const handleRunSitePro = () => {
    setShowSiteProResult(true);
    refetchSitePro();
  };

  const handleRefreshMemory = () => {
    refetchRecords();
    refetchUnknowns();
    refetchConflicts();
  };

  // Removed early return - panel visibility is controlled by parent DEV TOOLS toggle

  const isLoading = isLoadingRecords || isLoadingUnknowns || isLoadingConflicts;
  const hasErrors = recordsError || unknownsError || conflictsError;

  return (
    <div className="fixed bottom-20 right-4 z-50 max-w-md">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="bg-background/95 backdrop-blur-md shadow-lg border-2 border-dashed border-orange-500/50 hover:border-orange-500"
          >
            <Bug className="h-4 w-4 mr-2 text-orange-500" />
            <span className="text-xs font-mono">Memory Inspector</span>
            {isOpen ? (
              <ChevronDown className="h-4 w-4 ml-2" />
            ) : (
              <ChevronUp className="h-4 w-4 ml-2" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-2">
          <Card className="border-2 border-dashed border-orange-500/50 bg-background/95 backdrop-blur-md shadow-xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-mono flex items-center gap-2">
                  <Database className="h-4 w-4 text-orange-500" />
                  Debug Panel
                </CardTitle>
                <Badge variant="outline" className="text-xs font-mono bg-orange-500/10 text-orange-600 border-orange-500/30">
                  DEV ONLY
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                Parcel: {parcelId ? `${parcelId.slice(0, 8)}...` : 'None selected'}
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Memory Records Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono font-semibold flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    Memory Records ({records.length})
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRefreshMemory}
                    disabled={isLoading}
                    className="h-6 text-xs"
                  >
                    Refresh
                  </Button>
                </div>

                {hasErrors && (
                  <div className="text-xs text-destructive font-mono p-2 bg-destructive/10 rounded">
                    {recordsError || unknownsError || conflictsError}
                  </div>
                )}

                <ScrollArea className="h-32 border rounded-md bg-muted/30">
                  <div className="p-2 space-y-1">
                    {isLoadingRecords ? (
                      <p className="text-xs text-muted-foreground font-mono">Loading...</p>
                    ) : records.length === 0 ? (
                      <p className="text-xs text-muted-foreground font-mono italic">No records</p>
                    ) : (
                      records.map((record) => (
                        <RecordItem key={record.record_id} record={record} />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>

              <Separator />

              {/* Unknowns Section */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono font-semibold flex items-center gap-1">
                  <HelpCircle className="h-3 w-3 text-yellow-500" />
                  Explicit Unknowns ({unknowns.length})
                </h4>
                <ScrollArea className="h-20 border rounded-md bg-muted/30">
                  <div className="p-2 space-y-1">
                    {isLoadingUnknowns ? (
                      <p className="text-xs text-muted-foreground font-mono">Loading...</p>
                    ) : unknowns.length === 0 ? (
                      <p className="text-xs text-muted-foreground font-mono italic">No unknowns</p>
                    ) : (
                      unknowns.map((unknown) => (
                        <div
                          key={unknown.record_id}
                          className="text-xs font-mono p-1.5 rounded bg-yellow-500/10 border border-yellow-500/20"
                        >
                          <span className="text-yellow-600 font-semibold">{unknown.category}</span>
                          <span className="text-muted-foreground ml-2">— {unknown.source}</span>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Conflicts Section */}
              {conflicts.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="text-xs font-mono font-semibold flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 text-red-500" />
                      Conflicts ({conflicts.length})
                    </h4>
                    <ScrollArea className="h-20 border rounded-md bg-muted/30">
                      <div className="p-2 space-y-1">
                        {conflicts.map((conflict, idx) => (
                          <div
                            key={idx}
                            className="text-xs font-mono p-1.5 rounded bg-red-500/10 border border-red-500/20"
                          >
                            <span className="text-red-600 font-semibold">{conflict.category}</span>
                            <span className="text-muted-foreground ml-2">
                              — {conflict.records.length} conflicting records
                            </span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </>
              )}

              <Separator />

              {/* SitePro Test Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono font-semibold">SitePro v0 Test</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRunSitePro}
                    disabled={isSiteProLoading || records.length === 0}
                    className="h-6 text-xs"
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Run
                  </Button>
                </div>

                {showSiteProResult && (
                  <div className="space-y-2">
                    {isSiteProLoading ? (
                      <p className="text-xs text-muted-foreground font-mono">Evaluating...</p>
                    ) : siteProError ? (
                      <div className="text-xs text-destructive font-mono p-2 bg-destructive/10 rounded">
                        {siteProError}
                      </div>
                    ) : siteProResult ? (
                      <SiteProResultDisplay result={siteProResult} />
                    ) : (
                      <p className="text-xs text-muted-foreground font-mono italic">
                        No records to evaluate
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function RecordItem({ record }: { record: MemoryRecord }) {
  const [expanded, setExpanded] = useState(false);

  const confidenceColor = {
    High: 'text-green-600 bg-green-500/10 border-green-500/20',
    Medium: 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20',
    Low: 'text-red-600 bg-red-500/10 border-red-500/20',
  }[record.confidence];

  return (
    <div
      className="text-xs font-mono p-1.5 rounded bg-background border cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-primary">{record.category}</span>
        <Badge variant="outline" className={`text-[10px] h-4 ${confidenceColor}`}>
          {record.confidence}
        </Badge>
      </div>
      {expanded && (
        <div className="mt-1 pt-1 border-t border-dashed text-muted-foreground space-y-0.5">
          <div>
            <span className="text-muted-foreground/70">value:</span>{' '}
            <span className="text-foreground">
              {record.value === null ? (
                <span className="text-yellow-600 italic">null (unknown)</span>
              ) : (
                JSON.stringify(record.value)
              )}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground/70">source:</span> {record.source}
          </div>
          <div>
            <span className="text-muted-foreground/70">timestamp:</span>{' '}
            {new Date(record.timestamp).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}

function SiteProResultDisplay({ result }: { result: SiteProResult }) {
  const outcomeConfig = {
    potentially_suitable: {
      icon: CheckCircle2,
      emoji: '🟢',
      label: 'Potentially Suitable',
      color: 'text-green-600 bg-green-500/10 border-green-500/30',
    },
    inconclusive: {
      icon: HelpCircle,
      emoji: '🟡',
      label: 'Inconclusive',
      color: 'text-yellow-600 bg-yellow-500/10 border-yellow-500/30',
    },
    blocked: {
      icon: AlertCircle,
      emoji: '🔴',
      label: 'Blocked',
      color: 'text-red-600 bg-red-500/10 border-red-500/30',
    },
  }[result.outcome];

  return (
    <div className="space-y-2 text-xs font-mono">
      {/* Outcome */}
      <div className={`p-2 rounded border ${outcomeConfig.color}`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{outcomeConfig.emoji}</span>
          <span className="font-semibold">{outcomeConfig.label}</span>
          <Badge variant="outline" className="ml-auto text-[10px]">
            {result.confidence}
          </Badge>
        </div>
      </div>

      {/* Reasoning */}
      <div className="p-2 rounded border bg-muted/30">
        <p className="text-muted-foreground whitespace-pre-wrap">{result.reasoning}</p>
      </div>

      {/* Known Facts */}
      {result.known_facts.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Known Facts ({result.known_facts.length})
          </summary>
          <div className="mt-1 space-y-1">
            {result.known_facts.map((fact, idx) => (
              <div key={idx} className="p-1 rounded bg-muted/50 text-[10px]">
                <span className="text-primary">{fact.category}:</span> {JSON.stringify(fact.value)}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Unknowns */}
      {result.unknowns.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-yellow-600 hover:text-yellow-500">
            Unknowns ({result.unknowns.length})
          </summary>
          <div className="mt-1 space-y-1">
            {result.unknowns.map((unknown, idx) => (
              <div key={idx} className="p-1 rounded bg-yellow-500/10 text-[10px]">
                <span className="text-yellow-600">{unknown.category}:</span> {unknown.impact}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Sources */}
      <details className="group">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          Sources ({result.sources_referenced.length})
        </summary>
        <div className="mt-1 text-[10px] text-muted-foreground">
          {result.sources_referenced.join(', ') || 'None'}
        </div>
      </details>
    </div>
  );
}

export default MemoryInspector;
