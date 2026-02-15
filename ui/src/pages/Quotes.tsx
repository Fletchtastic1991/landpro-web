import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Sparkles, Loader2, Download, Clock, FileText } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Quote {
  id: string;
  client_id: string | null;
  client_name: string;
  job_description: string;
  property_size: string;
  property_unit: string;
  labor_cost: number;
  material_cost: number;
  equipment_cost: number;
  total_cost: number;
  completion_time: string;
  status: string;
  created_at: string;
  project_id: string | null;
}

interface Client {
  id: string;
  client_name: string;
}

interface Project {
  id: string;
  name: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  sent: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  approved: "bg-green-500/10 text-green-700 border-green-500/20",
  declined: "bg-red-500/10 text-red-700 border-red-500/20",
};

interface GeneratedQuote {
  jobTitle: string;
  laborCost: number;
  materialCost: number;
  totalEstimate: number;
  completionTime: number;
}

export default function Quotes() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuote, setGeneratedQuote] = useState<GeneratedQuote | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form state
  const [clientName, setClientName] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [jobDescription, setJobDescription] = useState("");
  const [propertySize, setPropertySize] = useState("");
  const [propertyUnit, setPropertyUnit] = useState("acres");
  const [materialNotes, setMaterialNotes] = useState("");

  useEffect(() => {
    if (user) {
      fetchQuotes();
      fetchClients();
      fetchProjects();
    }
  }, [user]);

  const fetchQuotes = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotes(data || []);
    } catch (error) {
      console.error('Error fetching quotes:', error);
      toast.error("Failed to load quotes");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClients = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, client_name')
        .eq('landscaper_id', user.id)
        .order('client_name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchProjects = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    if (clientId && clientId !== "none") {
      const client = clients.find(c => c.id === clientId);
      if (client) {
        setClientName(client.client_name);
      }
    }
  };

  const handleGenerateQuote = async () => {
    if (!clientName || !jobDescription || !propertySize) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsGenerating(true);
    setGeneratedQuote(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-quote', {
        body: {
          clientName,
          jobDescription,
          propertySize: parseFloat(propertySize),
          propertyUnit,
          materialNotes
        }
      });

      if (error) {
        console.error('Error generating quote:', error);
        throw new Error(error.message || 'Failed to generate quote');
      }

      const quote: GeneratedQuote = {
        jobTitle: data.jobTitle,
        laborCost: data.laborCost,
        materialCost: data.materialCost,
        totalEstimate: data.totalEstimate,
        completionTime: data.completionTime,
      };

      setGeneratedQuote(quote);
      toast.success("AI Quote generated successfully!", {
        description: `Total estimate: $${quote.totalEstimate.toLocaleString()}`,
      });
    } catch (error) {
      console.error('Error:', error);
      toast.error("Failed to generate quote", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveQuote = async () => {
    if (!generatedQuote || !user) return;

    try {
      const { data, error } = await supabase
        .from('quotes')
        .insert({
          user_id: user.id,
          client_id: selectedClientId && selectedClientId !== "none" ? selectedClientId : null,
          project_id: selectedProjectId && selectedProjectId !== "none" ? selectedProjectId : null,
          client_name: clientName,
          job_description: jobDescription,
          property_size: propertySize,
          property_unit: propertyUnit,
          labor_cost: generatedQuote.laborCost,
          material_cost: generatedQuote.materialCost,
          equipment_cost: 0,
          total_cost: generatedQuote.totalEstimate,
          completion_time: `${generatedQuote.completionTime} days`,
          material_notes: materialNotes || null,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      setQuotes([data, ...quotes]);
      toast.success("Quote saved!", {
        description: "Quote has been added to your quotes.",
      });
      
      // Reset form
      setClientName("");
      setSelectedClientId("");
      setSelectedProjectId("");
      setJobDescription("");
      setPropertySize("");
      setMaterialNotes("");
      setGeneratedQuote(null);
      setOpen(false);
    } catch (error) {
      console.error('Error saving quote:', error);
      toast.error("Failed to save quote");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quotes</h1>
          <p className="text-muted-foreground mt-1">
            Manage and generate quotes for your clients
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Generate Quote with AI
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Quote Generator
              </DialogTitle>
              <DialogDescription>
                Provide job details and let LandPro AI generate an accurate quote for you.
              </DialogDescription>
            </DialogHeader>
            
            {!generatedQuote ? (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="selectClient">Select Client (Optional)</Label>
                    <Select value={selectedClientId} onValueChange={handleClientSelect}>
                      <SelectTrigger id="selectClient">
                        <SelectValue placeholder="Choose a client..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No client selected</SelectItem>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.client_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="selectProject">Link to Project (Optional)</Label>
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                      <SelectTrigger id="selectProject">
                        <SelectValue placeholder="Choose a project..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No project selected</SelectItem>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client">Client Name *</Label>
                  <Input 
                    id="client" 
                    placeholder="Enter client name"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    disabled={isGenerating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job">Job Description *</Label>
                  <Textarea
                    id="job"
                    placeholder="e.g., Land clearing, grading, mulching, tree removal..."
                    rows={3}
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    disabled={isGenerating}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="size">Property Size *</Label>
                    <Input 
                      id="size" 
                      type="number"
                      placeholder="e.g., 2 or 5000"
                      value={propertySize}
                      onChange={(e) => setPropertySize(e.target.value)}
                      disabled={isGenerating}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Select value={propertyUnit} onValueChange={setPropertyUnit} disabled={isGenerating}>
                      <SelectTrigger id="unit">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="acres">Acres</SelectItem>
                        <SelectItem value="sqft">Square Feet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Material Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional materials or special requirements..."
                    rows={2}
                    value={materialNotes}
                    onChange={(e) => setMaterialNotes(e.target.value)}
                    disabled={isGenerating}
                  />
                </div>
                
                {isGenerating && (
                  <div className="flex flex-col items-center justify-center py-8 space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground animate-pulse">
                      LandPro AI is analyzing your job...
                    </p>
                  </div>
                )}
                
                <Button 
                  onClick={handleGenerateQuote} 
                  className="w-full gap-2"
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate Quote with AI
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Quote Generated
                    </CardTitle>
                    <CardDescription>{generatedQuote.jobTitle}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Client:</span>
                        <span className="font-medium">{clientName}</span>
                      </div>
                      {selectedProjectId && selectedProjectId !== "none" && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Project:</span>
                          <span className="font-medium">
                            {projects.find(p => p.id === selectedProjectId)?.name}
                          </span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Estimated Labor:</span>
                        <span className="font-semibold text-lg">
                          ${generatedQuote.laborCost.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Estimated Materials:</span>
                        <span className="font-semibold text-lg">
                          ${generatedQuote.materialCost.toLocaleString()}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total Project Estimate:</span>
                        <span className="font-bold text-2xl text-primary">
                          ${generatedQuote.totalEstimate.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Completion Time:
                        </span>
                        <span className="font-medium">
                          {generatedQuote.completionTime} {generatedQuote.completionTime === 1 ? 'day' : 'days'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleSaveQuote} className="flex-1 gap-2">
                        Save Quote
                      </Button>
                      <Button 
                        variant="outline" 
                        className="gap-2"
                        onClick={() => toast.info("PDF export coming soon!")}
                      >
                        <Download className="h-4 w-4" />
                        PDF
                      </Button>
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      className="w-full"
                      onClick={() => setGeneratedQuote(null)}
                    >
                      Generate Another Quote
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Quotes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : quotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No quotes yet</p>
              <p className="text-sm mt-1">Generate your first AI quote to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Job Description</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Estimate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="font-medium">{quote.client_name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {quote.job_description}
                    </TableCell>
                    <TableCell>
                      {quote.property_size} {quote.property_unit}
                    </TableCell>
                    <TableCell className="font-semibold">
                      ${quote.total_cost.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[quote.status] || ''}>
                        {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(quote.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
