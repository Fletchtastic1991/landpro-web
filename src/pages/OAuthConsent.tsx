import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// Minimal typed wrapper for the beta supabase.auth.oauth namespace.
type OAuthClientDetails = {
  client?: { name?: string; redirect_uri?: string; scope?: string };
  redirect_url?: string;
  redirect_to?: string;
  scope?: string;
};
type OAuthApi = {
  getAuthorizationDetails(id: string): Promise<{ data: OAuthClientDetails | null; error: { message: string } | null }>;
  approveAuthorization(id: string): Promise<{ data: OAuthClientDetails | null; error: { message: string } | null }>;
  denyAuthorization(id: string): Promise<{ data: OAuthClientDetails | null; error: { message: string } | null }>;
};
const oauth = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<OAuthClientDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Connect {details?.client?.name ?? "an app"} to LandPro AI</CardTitle>
          <CardDescription>
            This lets {details?.client?.name ?? "the client"} use LandPro AI as you. It does not
            bypass LandPro's permissions or backend policies.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p className="text-sm text-destructive">Could not complete this request: {error}</p>
          )}
          {!error && !details && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading authorization request…
            </div>
          )}
          {details && (
            <>
              <div className="text-sm space-y-2">
                <p>
                  <strong>{details.client?.name ?? "This client"}</strong> is asking to access
                  LandPro AI on your behalf.
                </p>
                {details.client?.redirect_uri && (
                  <p className="text-xs text-muted-foreground break-all">
                    Redirect URI: {details.client.redirect_uri}
                  </p>
                )}
                <ul className="list-disc list-inside text-sm">
                  <li>Read your LandPro parcel projects</li>
                  <li>Read Memory Core records and reality events for those parcels</li>
                </ul>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => decide(true)} disabled={busy}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Approve
                </Button>
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => decide(false)}
                  disabled={busy}
                >
                  Cancel connection
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
