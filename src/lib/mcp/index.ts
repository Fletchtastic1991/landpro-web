import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listProjectsTool from "./tools/list-projects";
import getProjectTool from "./tools/get-project";
import listMemoryRecordsTool from "./tools/list-memory-records";
import listRealityEventsTool from "./tools/list-reality-events";

// The OAuth issuer MUST be the direct supabase.co host — never SUPABASE_URL,
// which on Lovable Cloud is the .lovable.cloud proxy. Vite inlines
// import.meta.env.VITE_SUPABASE_PROJECT_ID at build time so the entry stays
// import-safe (no runtime env read at module top level).
const projectRef =
  import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "landpro-ai-mcp",
  title: "LandPro AI",
  version: "0.1.0",
  instructions:
    "Read-only access to a signed-in LandPro user's parcel projects, Memory Core records, and parcel reality events. Use list_projects to discover parcels, then get_project, list_memory_records, or list_reality_events for details on a specific parcel.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listProjectsTool,
    getProjectTool,
    listMemoryRecordsTool,
    listRealityEventsTool,
  ],
});
