import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import MemoryInspector from "@/components/MemoryInspector";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Bug } from "lucide-react";
import MapDrawing from "@/components/MapDrawing";
import LandSelectors, { LandSelections, DEFAULT_LAND_SELECTIONS } from "@/components/LandSelectors";
import JobSummary from "@/components/JobSummary";
import JobReport from "@/components/JobReport";
import { LandIntent, INTENT_OPTIONS } from "@/components/IntentSelector";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ProjectData {
  boundary: GeoJSON.Polygon;
  acreage: number;
  analysis?: any;
  intent?: LandIntent;
}

export default function MapExplorer() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  // Intent is kept for internal logic but not exposed in UI
  const [selectedIntent] = useState<LandIntent | null>("evaluate");
  const [debugParcelId, setDebugParcelId] = useState<string | undefined>(undefined);
  const [showDevTools, setShowDevTools] = useState(false);
  const [landSelections, setLandSelections] = useState<LandSelections>(DEFAULT_LAND_SELECTIONS);
  const [propertyData, setPropertyData] = useState<{
    acreage: number | null;
    squareMeters: number | null;
  }>({
    acreage: null,
    squareMeters: null
  });

  const handleLandSelectionChange = (key: keyof LandSelections, value: string) => {
    setLandSelections(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // DEV TOOLS: Only accessible via Ctrl+Shift+D keyboard shortcut
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.ctrlKey && event.shiftKey && event.key === 'D') {
      event.preventDefault();
      setShowDevTools(prev => !prev);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleCreateProject = (boundary: GeoJSON.Polygon, newAcreage: number, analysis?: any) => {
    const intentLabel = selectedIntent 
      ? INTENT_OPTIONS.find(o => o.id === selectedIntent)?.label 
      : "";
    setProjectData({ boundary, acreage: newAcreage, analysis, intent: selectedIntent || undefined });
    // acreage is already updated via onAcreageChange, but we ensure consistency here
    setPropertyData(prev => ({ ...prev, acreage: newAcreage }));
    setProjectName(`${intentLabel ? `${intentLabel} - ` : ""}${newAcreage} acres`);
    setProjectDescription(analysis?.summary || "");
    setShowCreateDialog(true);
  };

  const handleSubmitProject = async () => {
    if (!user || !projectData) {
      toast.error("Please sign in to create a project");
      return;
    }

    if (!projectName.trim()) {
      toast.error("Please enter a project name");
      return;
    }

    setIsCreating(true);
    try {
      // Create the project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: projectName.trim(),
          description: projectDescription.trim() || null,
          boundary: projectData.boundary as any,
          acreage: projectData.acreage,
          status: 'draft'
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // If we have analysis data, save it
      if (projectData.analysis && project) {
        const { error: analysisError } = await supabase
          .from('analysis')
          .insert({
            project_id: project.id,
            land_classification: {
              vegetation: landSelections.vegetation,
              terrain: landSelections.terrain,
              accessibility: landSelections.accessibility,
              intent: projectData.intent,
            },
            hazards: projectData.analysis.hazards,
            path: {
              equipment: projectData.analysis.equipment,
              labor: projectData.analysis.labor,
              cost_factors: projectData.analysis.cost_factors,
            }
          });

        if (analysisError) {
          console.error('Failed to save analysis:', analysisError);
        }
      }

      toast.success("Project created successfully!");
      setShowCreateDialog(false);
      navigate(`/dashboard/projects/${project.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error("Failed to create project");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">
      {/* Hero Header */}
      <div className="text-center space-y-3 pb-2">
        <h1 className="text-4xl font-bold tracking-tight">Analyze Your Land</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Find your property and get AI-powered insights in under 2 minutes.
        </p>
      </div>

      {/* Map and Analysis */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-sm">
            1
          </span>
          <div>
            <h2 className="text-xl font-semibold">Find your property</h2>
            <p className="text-sm text-muted-foreground">
              Search for an address, then draw your boundary. Analysis starts automatically.
            </p>
          </div>
        </div>
        <Card className="border-2 overflow-visible">
          <CardContent className="p-0">
            <MapDrawing 
              readOnly={false} 
              onCreateProject={handleCreateProject}
              onAcreageChange={(acreage, squareMeters) => setPropertyData({ acreage, squareMeters })}
              intent={selectedIntent}
              autoAnalyze={false}
            />
          </CardContent>
        </Card>

        {/* Land Property Selectors */}
        <div className="pt-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-sm">
              2
            </span>
            <div>
              <h2 className="text-xl font-semibold">Refine details</h2>
              <p className="text-sm text-muted-foreground">
                Help us understand the land conditions for more accurate results.
              </p>
            </div>
          </div>
          <Card className="p-6">
            <LandSelectors
              selections={landSelections}
              onSelectionChange={handleLandSelectionChange}
            />
            
            <div className="mt-8">
              <JobSummary selections={landSelections} />
            </div>
          </Card>
        </div>

        {/* Finalized Job Report Section */}
        <div className="pt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 mb-6">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-sm">
              3
            </span>
            <div>
              <h2 className="text-xl font-semibold">Review Job Report</h2>
              <p className="text-sm text-muted-foreground">
                Finalized snapshot of your property details and selected land conditions.
              </p>
            </div>
          </div>
          <JobReport propertyData={propertyData} selections={landSelections} />
        </div>
      </section>

      {/* Create Project Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save This Analysis</DialogTitle>
            <DialogDescription>
              Save your analysis for future reference. 
              {projectData?.acreage && ` Area: ${projectData.acreage} acres`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Notes (optional)</Label>
              <Textarea
                id="description"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Add any notes about this property"
                rows={3}
              />
            </div>
            {projectData?.analysis && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm">
                <span className="font-medium text-primary">Analysis included</span>
                <span className="text-muted-foreground ml-2">
                  — vegetation, terrain, equipment, and cost estimates
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitProject} disabled={isCreating}>
              {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DEV TOOLS - Hidden by default, toggle with Ctrl+Shift+D */}
      {showDevTools && (
        <>
          <button
            onClick={() => setShowDevTools(false)}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono font-semibold shadow-lg border bg-amber-500 text-black border-amber-600 hover:bg-amber-400 transition-colors"
          >
            <Bug className="h-4 w-4" />
            DEV TOOLS (Ctrl+Shift+D to hide)
          </button>
          <MemoryInspector parcelId={debugParcelId} />
        </>
      )}
    </div>
  );
}
