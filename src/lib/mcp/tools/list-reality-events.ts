import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "list_reality_events",
  title: "List parcel reality events",
  description:
    "List append-only Reality Events for a parcel — reported or observed history entries linked to the parcel state object.",
  inputSchema: {
    parcel_id: z.string().uuid().describe("Parcel (project) UUID."),
    limit: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ parcel_id, limit }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const { data: pso, error: psoErr } = await supabase
      .from("parcel_state_objects")
      .select("id")
      .eq("parcel_id", parcel_id)
      .maybeSingle();
    if (psoErr) {
      return { content: [{ type: "text", text: psoErr.message }], isError: true };
    }
    if (!pso) {
      return {
        content: [{ type: "text", text: "No parcel state object for this parcel yet." }],
        structuredContent: { events: [] },
      };
    }
    const { data, error } = await supabase
      .from("reality_events")
      .select("*")
      .eq("parcel_state_id", pso.id)
      .order("created_at", { ascending: false })
      .limit(limit ?? 100);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { events: data ?? [] },
    };
  },
});
