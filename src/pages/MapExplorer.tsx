import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MemoryInspector from "@/components/MemoryInspector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import MapDrawing from "@/components/MapDrawing";
import IntentSelector, { LandIntent, INTENT_OPTIONS } from "@/components/IntentSelector";
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
  const [selectedIntent, setSelectedIntent] = useState<LandIntent | null>(null);
  const [debugParcelId, setDebugParcelId] = useState<string | undefined>(undefined);

  const handleCreateProject = (boundary: GeoJSON.Polygon, acreage: number, analysis?: any) => {
    const intentLabel = selectedIntent 
      ? INTENT_OPTIONS.find(o => o.id === selectedIntent)?.label 
      : "";
    setProjectData({ boundary, acreage, analysis, intent: selectedIntent || undefined });
    setProjectName(`${intentLabel ? `${intentLabel} - ` : ""}${acreage} acres`);
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
              vegetation: projectData.analysis.vegetation,
              terrain: projectData.analysis.terrain,
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

  const getIntentDescription = () => {
    if (!selectedIntent) return null;
    const intent = INTENT_OPTIONS.find(o => o.id === selectedIntent);
    return intent?.description;
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">
      {/* Hero Header */}
      <div className="text-center space-y-3 pb-2">
        <h1 className="text-4xl font-bold tracking-tight">Analyze Your Land</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Select your goal, find your property, and get AI-powered insights in under 2 minutes.
        </p>
      </div>

      {/* Step 1: Intent Selection */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-sm">
            1
          </span>
          <div>
            <h2 className="text-xl font-semibold">What's your goal?</h2>
            <p className="text-sm text-muted-foreground">Choose what you want to do with your land</p>
          </div>
        </div>
        <Card className="border-2 border-dashed border-border/50 bg-card/50">
          <CardContent className="pt-6">
            <IntentSelector 
              selectedIntent={selectedIntent} 
              onSelectIntent={setSelectedIntent} 
            />
          </CardContent>
        </Card>
      </section>

      {/* Step 2: Map and Analysis */}
      <section className={`space-y-4 transition-all duration-500 ${!selectedIntent ? "opacity-40 pointer-events-none" : ""}`}>
        <div className="flex items-center gap-3">
          <span className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold shadow-sm transition-colors ${
            selectedIntent 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted text-muted-foreground"
          }`}>
            2
          </span>
          <div>
            <h2 className="text-xl font-semibold">Find your property</h2>
            <p className="text-sm text-muted-foreground">
              {selectedIntent 
                ? `Search for an address, then draw your boundary. Analysis starts automatically.`
                : "First, select your goal above"}
            </p>
          </div>
        </div>
        <Card className="border-2 overflow-visible">
          <CardContent className="p-0">
            <MapDrawing 
              readOnly={false} 
              onCreateProject={handleCreateProject}
              intent={selectedIntent}
              autoAnalyze={!!selectedIntent}
            />
          </CardContent>
        </Card>
      </section>

      {/* Floating Intent Indicator */}
      {selectedIntent && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background/95 backdrop-blur-md rounded-full shadow-lg border px-5 py-2.5 flex items-center gap-3 transition-all">
          <span className="text-sm text-muted-foreground">Goal:</span>
          <IntentSelector 
            selectedIntent={selectedIntent} 
            onSelectIntent={setSelectedIntent}
            compact
          />
        </div>
      )}

      {/* Create Project Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Project</DialogTitle>
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

      {/* Memory Inspector Debug Panel - DEV ONLY */}
      <MemoryInspector parcelId={debugParcelId} />
    </div>
  );
}
