/// <reference types="vite/client" />

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Skeleton } from "../components/ui/skeleton";
import { supabase } from "../integrations/supabase/client";
import { useToast } from "../components/ui/use-toast";
import { ArrowLeft, Loader2, MapPin, FileText, AlertTriangle, Map, Leaf, Mountain, Wrench, DollarSign, Users, Brain, RefreshCw, Cog } from "lucide-react";
import { format } from "date-fns";
import MapDrawing from "../components/MapDrawing";
import AnalysisDisclaimer from "../components/AnalysisDisclaimer";
import type { Json } from "../integrations/supabase/types";
import PropertyAnalysisReport from "../components/PropertyAnalysisReport";
interface Project {
  id: string;
  name: string;
  description: string | null;
  boundary: any;
  acreage: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface LandAnalysis {
  vegetation: {
    type: string;
    density: string;
    recommendations: string[];
  };
  terrain: {
    type: string;
    slope_estimate: string;
    drainage: string;
    recommendations: string[];
  };
  equipment: {
    recommended: string[];
    considerations: string[];
  };
  labor: {
    estimated_crew_size: number;
    estimated_hours: number;
    difficulty: string;
  };
  hazards: string[];
  cost_factors: {
    base_rate_per_acre: number;
    estimated_total: number;
    factors_affecting_cost: string[];
  };
  summary: string;
}

interface Analysis {
  id: string;
  land_classification: LandAnalysis | null;
  hazards: any;
  path: any;
  created_at: string;
}

function getDifficultyColor(difficulty: string) {
  switch (difficulty?.toLowerCase()) {
    case 'easy': return 'bg-green-500/20 text-green-700 border-green-500/30';
    case 'moderate': return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30';
    case 'challenging': return 'bg-red-500/20 text-red-700 border-red-500/30';
    default: return 'bg-muted text-muted-foreground';
  }
}

function getDensityColor(density: string) {
  switch (density?.toLowerCase()) {
    case 'low': return 'bg-green-500/20 text-green-700 border-green-500/30';
    case 'medium': return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30';
    case 'high': return 'bg-red-500/20 text-red-700 border-red-500/30';
    default: return 'bg-muted text-muted-foreground';
  }
}

function AnalysisDisplay({ analysis, createdAt }: { analysis: LandAnalysis; createdAt: string }) {
  const vegetation = analysis?.vegetation;
  const terrain = analysis?.terrain;
  const equipment = analysis?.equipment;
  const labor = analysis?.labor;
  const costFactors = analysis?.cost_factors;
  const hazards = analysis?.hazards;

  return (
    <div className="space-y-8">
      {/* Summary Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Land Clearing Assessment
          </CardTitle>
          <CardDescription>
            Generated on {format(new Date(createdAt), "MMMM d, yyyy 'at' h:mm a")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-muted-foreground">{analysis?.summary || "No summary available"}</p>
          <p className="text-xs text-muted-foreground/70">Analysis is based on mapped boundaries and available data.</p>
        </CardContent>
      </Card>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Vegetation */}
        {vegetation && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Leaf className="h-5 w-5 text-green-600" />
                Vegetation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{vegetation.type || "Unknown"}</span>
                {vegetation.density && (
                  <Badge className={getDensityColor(vegetation.density)}>
                    {vegetation.density} density
                  </Badge>
                )}
              </div>
              {vegetation.recommendations && vegetation.recommendations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Recommendations</h4>
                  <ul className="text-sm space-y-1">
                    {vegetation.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Terrain */}
        {terrain && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mountain className="h-5 w-5 text-amber-600" />
                Terrain
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{terrain.type || "Unknown"}</span>
                {terrain.slope_estimate && (
                  <Badge variant="outline">{terrain.slope_estimate} slope</Badge>
                )}
                {terrain.drainage && (
                  <Badge variant="outline">{terrain.drainage} drainage</Badge>
                )}
              </div>
              {terrain.recommendations && terrain.recommendations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Recommendations</h4>
                  <ul className="text-sm space-y-1">
                    {terrain.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Equipment */}
        {equipment && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-5 w-5 text-blue-600" />
                Recommended Equipment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {equipment.recommended && equipment.recommended.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {equipment.recommended.map((eq, i) => (
                    <Badge key={i} variant="secondary">{eq}</Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground/70">Common equipment examples. Contractors may use different methods or equipment.</p>
              {equipment.considerations && equipment.considerations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Considerations</h4>
                  <ul className="text-sm space-y-1">
                    {equipment.considerations.map((con, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {con}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Labor Estimate */}
        {labor && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                Labor Estimate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-3xl font-bold text-primary">{labor.estimated_crew_size ?? "-"}</div>
                  <div className="text-sm text-muted-foreground">Crew Size</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="text-3xl font-bold text-primary">{labor.estimated_hours ?? "-"}</div>
                  <div className="text-sm text-muted-foreground">Hours</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  {labor.difficulty ? (
                    <Badge className={`${getDifficultyColor(labor.difficulty)} text-sm`}>
                      {labor.difficulty}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                  <div className="text-sm text-muted-foreground mt-1">Difficulty</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cost Estimate */}
        {costFactors && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Cost Estimate
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {costFactors.base_rate_per_acre != null && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">Base rate per acre</span>
                  <span className="font-medium">${costFactors.base_rate_per_acre}</span>
                </div>
              )}
              {costFactors.estimated_total != null && (
                <div className="flex items-center justify-between py-2">
                  <span className="font-semibold">Estimated Total</span>
                  <span className="text-2xl font-bold text-primary">
                    ${costFactors.estimated_total.toLocaleString()}
                  </span>
                </div>
              )}
              <p className="text-xs text-muted-foreground/70">Actual costs vary by contractor, access, and disposal method.</p>
              {costFactors.factors_affecting_cost && costFactors.factors_affecting_cost.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Factors Affecting Cost</h4>
                  <ul className="text-sm space-y-1">
                    {costFactors.factors_affecting_cost.map((factor, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-muted-foreground">•</span>
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Hazards */}
        {hazards && hazards.length > 0 && (
          <Card className="border-amber-500/30 bg-amber-500/5 md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
                Potential Hazards
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2">
                {hazards.map((hazard, i) => (
                  <div key={i} className="flex items-start gap-2 bg-amber-500/5 p-3 rounded-lg border border-amber-500/20">
                    <span className="text-amber-600">•</span>
                    <span className="text-sm text-muted-foreground">{hazard}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Informational Disclaimer */}
      <AnalysisDisclaimer />
    </div>
  );
}

function AnalysisSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary Header Skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-6 w-40" />
          </div>
          <Skeleton className="h-4 w-60 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4 mt-2" />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Vegetation Skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-5 w-24" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </CardContent>
        </Card>

        {/* Terrain Skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-5 w-20" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </CardContent>
        </Card>

        {/* Equipment Skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-5 w-44" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </CardContent>
        </Card>

        {/* Labor Skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-5 w-32" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-muted/50 rounded-lg p-4">
                <Skeleton className="h-8 w-8 mx-auto" />
                <Skeleton className="h-3 w-16 mx-auto mt-2" />
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <Skeleton className="h-8 w-8 mx-auto" />
                <Skeleton className="h-3 w-12 mx-auto mt-2" />
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <Skeleton className="h-6 w-16 mx-auto rounded-full" />
                <Skeleton className="h-3 w-14 mx-auto mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cost Skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-5 w-28" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-16" />
            </div>
            <div className="flex items-center justify-between py-2">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-8 w-24" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </CardContent>
        </Card>

        {/* Hazards Skeleton */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-5 w-36" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPreprocessing, setIsPreprocessing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (projectError || !projectData) {
        toast({
          title: "Project not found",
          description: projectError?.message || "Could not load project",
          variant: "destructive",
        });
        navigate("/dashboard/projects");
        return;
      }

      setProject(projectData);

      const { data: analysisData } = await supabase
        .from("analysis")
        .select("*")
        .eq("project_id", id)
        .order("created_at", { ascending: false })
        .maybeSingle();

      if (analysisData) {
        setAnalysis({
          id: analysisData.id,
          land_classification: analysisData.land_classification as unknown as LandAnalysis | null,
          hazards: analysisData.hazards,
          path: analysisData.path,
          created_at: analysisData.created_at
        });
      }

      setIsLoading(false);
    };

    fetchData();
  }, [id, navigate, toast]);

  const runAnalysis = async () => {
    if (!project?.boundary || !project?.acreage) {
      toast({
        title: "Cannot run analysis",
        description: "Please define property boundaries first on the Map tab",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Not authenticated",
          description: "Please sign in to run analysis",
          variant: "destructive",
        });
        setIsAnalyzing(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-land`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            boundary: project.boundary,
            acreage: project.acreage,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Analysis failed");
      }

      const data = await response.json();

      // Save or update analysis in database
      if (analysis) {
        // Update existing analysis
        const { error } = await supabase
          .from("analysis")
          .update({ land_classification: data.analysis as unknown as Json })
          .eq("id", analysis.id);

        if (error) throw error;

        setAnalysis({
          ...analysis,
          land_classification: data.analysis,
          created_at: new Date().toISOString(),
        });
      } else {
        // Create new analysis
        const { data: newAnalysis, error } = await supabase
          .from("analysis")
          .insert({
            project_id: project.id,
            land_classification: data.analysis as unknown as Json,
          })
          .select()
          .single();

        if (error) throw error;

        setAnalysis({
          id: newAnalysis.id,
          land_classification: data.analysis,
          hazards: null,
          path: null,
          created_at: newAnalysis.created_at,
        });
      }

      toast({ title: "Analysis complete!" });
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runPreprocess = async () => {
    if (!project?.boundary) {
      toast({
        title: "Cannot run preprocessing",
        description: "Please define property boundaries first on the Map tab",
        variant: "destructive",
      });
      return;
    }

    setIsPreprocessing(true);

    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be logged in to run preprocessing");
      }

      // Calculate center point from boundary
      const coordinates = project.boundary?.coordinates?.[0];
      let lat = 0, lng = 0;
      if (coordinates && coordinates.length > 0) {
        const sum = coordinates.reduce((acc: { lat: number; lng: number }, coord: number[]) => ({
          lat: acc.lat + coord[1],
          lng: acc.lng + coord[0]
        }), { lat: 0, lng: 0 });
        lat = sum.lat / coordinates.length;
        lng = sum.lng / coordinates.length;
      }

      const response = await supabase.functions.invoke('preprocess-parcel', {
        body: {
          user_id: user.id,
          parcel_geometry: {
            ...project.boundary,
            area: project.acreage || 0,
          },
          lat,
          lng,
          property_goal: project.description || "land management",
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Preprocessing failed");
      }

      toast({
        title: "Preprocessing started",
        description: `Job ID: ${response.data.job_id}. The data is being processed in the background.`,
      });
    } catch (error) {
      console.error("Preprocessing error:", error);
      toast({
        title: "Preprocessing failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsPreprocessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "completed":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      default:
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/dashboard/projects")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <Badge variant="outline" className={getStatusColor(project.status)}>
              {project.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Created {format(new Date(project.created_at), "MMMM d, yyyy")}
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="map">Map</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Acreage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  {project.acreage ? `${project.acreage.toFixed(2)} acres` : "Not measured"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Boundary Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center gap-2">
                  <Map className="h-5 w-5 text-primary" />
                  {project.boundary ? "Defined" : "Not set"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Analysis Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  {analysis ? "Complete" : "Pending"}
                </div>
              </CardContent>
            </Card>
          </div>

          {project.description && (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{project.description}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="map" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="h-5 w-5" />
                Property Map
              </CardTitle>
              <CardDescription>
                Draw boundaries to define your property area. Click the polygon tool to start drawing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[500px] rounded-lg overflow-hidden">
                <MapDrawing
                  initialBoundary={project.boundary as GeoJSON.Polygon | null}
                  initialAcreage={project.acreage}
                  onSave={async (boundary, acreage) => {
                    const { error } = await supabase
                      .from("projects")
                      .update({ 
                        boundary: boundary as unknown as Json, 
                        acreage,
                        status: "active" 
                      })
                      .eq("id", project.id);

                    if (error) {
                      toast({
                        title: "Error saving boundary",
                        description: error.message,
                        variant: "destructive",
                      });
                    } else {
                      toast({ title: "Boundary saved successfully!" });
                      setProject({ ...project, boundary, acreage, status: "active" });
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="mt-6 space-y-6">
          {/* Analysis Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={runPreprocess}
              disabled={isPreprocessing || !project?.boundary}
            >
              {isPreprocessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Preprocessing...
                </>
              ) : (
                <>
                  <Cog className="h-4 w-4 mr-2" />
                  Run Preprocess
                </>
              )}
            </Button>
            <Button
              onClick={runAnalysis}
              disabled={isAnalyzing || !project?.boundary}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : analysis?.land_classification ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Analysis
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Run AI Analysis
                </>
              )}
            </Button>
          </div>

          {isAnalyzing ? (
            <AnalysisSkeleton />
          ) : analysis?.land_classification ? (
            <AnalysisDisplay analysis={analysis.land_classification} createdAt={analysis.created_at} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Land Analysis
                </CardTitle>
                <CardDescription>
                  AI-powered analysis of your property
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  {!project?.boundary ? (
                    <>
                      <Map className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground mb-4">
                        No boundaries defined
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Go to the Map tab and draw property boundaries first
                      </p>
                    </>
                  ) : (
                    <>
                      <Brain className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground mb-4">
                        Ready for analysis
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Click "Run AI Analysis" above to generate insights
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Generated Reports
              </CardTitle>
              <CardDescription>
                Work orders and PDF exports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground mb-4">
                  No reports generated yet
                </p>
                <p className="text-sm text-muted-foreground">
                  Complete an analysis to generate work orders
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
