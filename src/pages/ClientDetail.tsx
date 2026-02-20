import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Plus, 
  Sparkles, 
  Loader2, 
  Clock,
  FileText,
  Edit,
  Save
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Client {
  id: string;
  client_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Quote {
  id: string;
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
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  sent: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  approved: "bg-green-500/10 text-green-700 border-green-500/20",
  declined: "bg-red-500/10 text-red-700 border-red-500/20",
};

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [client, setClient] = useState<Client | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");

  // Quote generation state
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [propertySize, setPropertySize] = useState("");
  const [propertyUnit, setPropertyUnit] = useState("acres");
  const [materialNotes, setMaterialNotes] = useState("");
  const [generatedQuote, setGeneratedQuote] = useState<{
    jobTitle: string;
    laborCost: number;
    materialCost: number;
    totalEstimate: number;
    completionTime: number;
  } | null>(null);

  useEffect(() => {
    if (user && id) {
      fetchClient();
      fetchClientQuotes();
    }
  }, [user, id]);

  const fetchClient = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      setClient(data);
      setEditName(data.client_name);
      setEditEmail(data.email);
      setEditPhone(data.phone || "");
      setEditAddress(data.address || "");
    } catch (error) {
      console.error('Error fetching client:', error);
      toast({
        title: "Error",
        description: "Failed to load client details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClientQuotes = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('client_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotes(data || []);
    } catch (error) {
      console.error('Error fetching quotes:', error);
    }
  };

  const handleSaveClient = async () => {
    if (!client || !editName || !editEmail) {
      toast({
        title: "Validation Error",
        description: "Name and email are required",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          client_name: editName,
          email: editEmail,
          phone: editPhone || null,
          address: editAddress || null,
        })
        .eq('id', client.id);

      if (error) throw error;

      setClient({
        ...client,
        client_name: editName,
        email: editEmail,
        phone: editPhone || null,
        address: editAddress || null,
      });
      setIsEditing(false);
      toast({
        title: "Client Updated",
        description: "Client information has been saved.",
      });
    } catch (error) {
      console.error('Error updating client:', error);
      toast({
        title: "Error",
        description: "Failed to update client",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateQuote = async () => {
    if (!jobDescription || !propertySize || !client) {
      toast({
        title: "Validation Error",
        description: "Please fill in job description and property size",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedQuote(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-quote', {
        body: {
          clientName: client.client_name,
          jobDescription,
          propertySize: parseFloat(propertySize),
          propertyUnit,
          materialNotes
        }
      });

      if (error) throw error;

      setGeneratedQuote({
        jobTitle: data.jobTitle,
        laborCost: data.laborCost,
        materialCost: data.materialCost,
        totalEstimate: data.totalEstimate,
        completionTime: data.completionTime,
      });

      toast({
        title: "Quote Generated",
        description: `Total estimate: $${data.totalEstimate.toLocaleString()}`,
      });
    } catch (error) {
      console.error('Error generating quote:', error);
      toast({
        title: "Error",
        description: "Failed to generate quote. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveQuote = async () => {
    if (!generatedQuote || !client || !user) return;

    try {
      const { data, error } = await supabase
        .from('quotes')
        .insert({
          user_id: user.id,
          client_id: client.id,
          client_name: client.client_name,
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
      toast({
        title: "Quote Saved",
        description: "Quote has been saved to this client's profile.",
      });

      // Reset form
      setJobDescription("");
      setPropertySize("");
      setMaterialNotes("");
      setGeneratedQuote(null);
      setQuoteDialogOpen(false);
    } catch (error) {
      console.error('Error saving quote:', error);
      toast({
        title: "Error",
        description: "Failed to save quote",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Client not found</p>
        <Button variant="link" onClick={() => navigate('/dashboard/clients')}>
          Back to Clients
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/clients')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{client.client_name}</h1>
          <p className="text-muted-foreground">Client Profile</p>
        </div>
        <Dialog open={quoteDialogOpen} onOpenChange={setQuoteDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Quote
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Generate Quote for {client.client_name}
              </DialogTitle>
              <DialogDescription>
                Provide job details and let LandPro AI generate an accurate quote.
              </DialogDescription>
            </DialogHeader>

            {!generatedQuote ? (
              <div className="space-y-4 py-4">
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
                        <Save className="h-4 w-4" />
                        Save Quote to Client
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

      <div className="grid gap-6 md:grid-cols-3">
        {/* Client Info Card */}
        <Card className="md:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Client Information</CardTitle>
            {!isEditing ? (
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {!isEditing ? (
              <>
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{client.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{client.phone || "Not provided"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{client.address || "Not provided"}</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Client Since</p>
                    <p className="font-medium">
                      {new Date(client.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <Badge variant="outline" className={client.status === 'active' 
                    ? 'bg-green-500/10 text-green-700 border-green-500/20' 
                    : 'bg-muted text-muted-foreground'
                  }>
                    {client.status}
                  </Badge>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editName">Name *</Label>
                  <Input
                    id="editName"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editEmail">Email *</Label>
                  <Input
                    id="editEmail"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editPhone">Phone</Label>
                  <Input
                    id="editPhone"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editAddress">Address</Label>
                  <Textarea
                    id="editAddress"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    disabled={isSaving}
                    rows={3}
                  />
                </div>
                <Button onClick={handleSaveClient} className="w-full" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Client Quotes Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Quotes
            </CardTitle>
            <CardDescription>
              All quotes generated for this client
            </CardDescription>
          </CardHeader>
          <CardContent>
            {quotes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No quotes yet</p>
                <p className="text-sm mt-1">Create a quote for this client to get started</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job Description</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">
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
    </div>
  );
}
