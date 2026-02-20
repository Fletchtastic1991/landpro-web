import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function SettingsPage() {
  const handleSave = () => {
    toast.success("Settings saved successfully!");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your business preferences and account settings
        </p>
      </div>

      <div className="grid gap-6">
        {/* Business Information */}
        <Card>
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
            <CardDescription>
              Update your company details and contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company">Company Name</Label>
                <Input id="company" defaultValue="LandPro Services" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" defaultValue="(555) 123-4567" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" defaultValue="contact@landpro.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Business Address</Label>
              <Input id="address" defaultValue="123 Main Street, Portland, OR 97201" />
            </div>
            <Button onClick={handleSave}>Save Changes</Button>
          </CardContent>
        </Card>

        {/* AI Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>AI Preferences</CardTitle>
            <CardDescription>
              Configure how AI assists with your business operations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="ai-suggestions">Enable AI Suggestions</Label>
                <p className="text-sm text-muted-foreground">
                  Get AI-powered recommendations for scheduling and pricing
                </p>
              </div>
              <Switch id="ai-suggestions" defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-schedule">Auto-Schedule Jobs</Label>
                <p className="text-sm text-muted-foreground">
                  Let AI automatically optimize your job schedule
                </p>
              </div>
              <Switch id="auto-schedule" defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="smart-quotes">Smart Quote Generation</Label>
                <p className="text-sm text-muted-foreground">
                  Use AI to generate accurate quotes based on job details
                </p>
              </div>
              <Switch id="smart-quotes" defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Manage how you receive updates about your business
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notif">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive email updates for important events
                </p>
              </div>
              <Switch id="email-notif" defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sms-notif">SMS Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Get text messages for urgent updates
                </p>
              </div>
              <Switch id="sms-notif" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
