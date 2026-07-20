import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "list_memory_records",
  title: "List Memory Core records",
  description:
    "List append-only Memory Core v0 records for one of the signed-in user's parcels (immutable facts, unknowns, and conflicts).",
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
    const { data, error } = await supabase
      .from("memory_records")
      .select("record_id, parcel_id, category, value, source, confidence, timestamp")
      .eq("parcel_id", parcel_id)
      .order("timestamp", { ascending: false })
      .limit(limit ?? 100);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { records: data ?? [] },
    };
  },
});
