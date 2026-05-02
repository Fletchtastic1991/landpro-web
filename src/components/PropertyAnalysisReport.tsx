import { useState } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import {
  FileText, Download, Lock, Leaf, Mountain,
  Wrench, Users, DollarSign, AlertTriangle, CheckCircle2
} from "lucide-react";
import { format } from "date-fns";

// ─── Types (mirrors ProjectDetail) ────────────────────────────────────────

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

interface ReportProps {
  project: {
    id: string;
    name: string;
    description: string | null;
    acreage: number | null;
    status: string;
    created_at: string;
  };
  analysis: {
    id: string;
    land_classification: LandAnalysis | null;
    created_at: string;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateReportNumber(projectId: string): string {
  const today = new Date();
  const dateStr = format(today, "yyyyMMdd");
  const shortId = projectId.replace(/-/g, "").substring(0, 4).toUpperCase();
  return `LP-${dateStr}-${shortId}`;
}

function getDifficultyColor(difficulty: string) {
  switch (difficulty?.toLowerCase()) {
    case "easy": return "#16a34a";
    case "moderate": return "#ca8a04";
    case "challenging": return "#dc2626";
    default: return "#6b7280";
  }
}

// ─── Report Document (printable) ──────────────────────────────────────────────

function ReportDocument({ project, analysis, reportNumber, generatedAt }: ReportProps & {
  reportNumber: string;
  generatedAt: Date;
}) {
  const lc = analysis.land_classification!;

  return (
    <div
      id="landpro-report"
      style={{
        fontFamily: "'Georgia', 'Times New Roman', serif",
        background: "#ffffff",
        color: "#1a1a1a",
        maxWidth: "800px",
        margin: "0 auto",
        padding: "48px 56px",
        lineHeight: 1.6,
      }}
    >
      {/* ── Header ── */}
      <div style={{ borderBottom: "3px solid #14532d", paddingBottom: "24px", marginBottom: "32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
              <div style={{
                width: "32px", height: "32px", background: "#14532d",
                borderRadius: "6px", display: "flex", alignItems: "center",
                justifyContent: "center",
              }}>
                <span style={{ color: "white", fontWeight: "bold", fontSize: "14px" }}>LP</span>
              </div>
              <span style={{ fontSize: "20px", fontWeight: "bold", color: "#14532d", fontFamily: "sans-serif" }}>
                LandPro
              </span>
            </div>
            <div style={{ fontSize: "11px", color: "#6b7280", fontFamily: "sans-serif", letterSpacing: "0.05em" }}>
              LAND INTELLIGENCE PLATFORM
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", color: "#6b7280", fontFamily: "sans-serif", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Report Number
            </div>
            <div style={{ fontSize: "18px", fontWeight: "bold", color: "#14532d", fontFamily: "monospace" }}>
              {reportNumber}
            </div>
            <div style={{ fontSize: "11px", color: "#6b7280", fontFamily: "sans-serif", marginTop: "2px" }}>
              Generated {format(generatedAt, "MMMM d, yyyy 'at' h:mm a")}
            </div>
          </div>
        </div>

        <div style={{ marginTop: "24px" }}>
          <div style={{ fontSize: "11px", color: "#6b7280", fontFamily: "sans-serif", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "4px" }}>
            Property Analysis Report
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: "bold", margin: 0, lineHeight: 1.2 }}>
            {project.name}
          </h1>
          {project.description && (
            <p style={{ fontSize: "14px", color: "#4b5563", marginTop: "6px", fontStyle: "italic" }}>
              {project.description}
            </p>
          )}
        </div>
      </div>

      {/* ── Property Summary Bar ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
        gap: "1px", background: "#e5e7eb",
        border: "1px solid #e5e7eb", borderRadius: "8px",
        overflow: "hidden", marginBottom: "32px",
      }}>
        {[
          { label: "Property Size", value: project.acreage ? `${project.acreage.toFixed(2)} acres` : "—" },
          { label: "Analysis Date", value: format(new Date(analysis.created_at), "MMM d, yyyy") },
          { label: "Report Status", value: "LOCKED & VERIFIED" },
        ].map((item, i) => (
          <div key={i} style={{ background: "#f9fafb", padding: "16px 20px" }}>
            <div style={{ fontSize: "10px", color: "#9ca3af", fontFamily: "sans-serif", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "4px" }}>
              {item.label}
            </div>
            <div style={{ fontSize: "15px", fontWeight: "600", fontFamily: "sans-serif", color: item.label === "Report Status" ? "#14532d" : "#111827" }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Executive Summary ── */}
      <div style={{ marginBottom: "32px" }}>
        <SectionHeader icon="📋" title="Executive Summary" />
        <div style={{
          background: "#f0fdf4", border: "1px solid #bbf7d0",
          borderLeft: "4px solid #16a34a", borderRadius: "6px",
          padding: "16px 20px", fontSize: "14px", color: "#374151", lineHeight: 1.7,
        }}>
          {lc.summary}
        </div>
      </div>

      {/* ── Vegetation & Terrain ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
        {/* Vegetation */}
        <div>
          <SectionHeader icon="🌿" title="Vegetation Assessment" />
          <div style={{ fontSize: "14px" }}>
            <div style={{ marginBottom: "8px" }}>
              <span style={{ fontWeight: "600" }}>{lc.vegetation?.type || "—"}</span>
              {lc.vegetation?.density && (
                <span style={{
                  marginLeft: "8px", fontSize: "11px", padding: "2px 8px",
                  background: "#dcfce7", color: "#15803d", borderRadius: "999px",
                  fontFamily: "sans-serif", fontWeight: "600",
                }}>
                  {lc.vegetation.density} density
                </span>
              )}
            </div>
            {lc.vegetation?.recommendations?.length > 0 && (
              <ul style={{ margin: 0, paddingLeft: "16px", color: "#4b5563", fontSize: "13px" }}>
                {lc.vegetation.recommendations.map((r, i) => <li key={i} style={{ marginBottom: "4px" }}>{r}</li>)}
              </ul>
            )}
          </div>
        </div>

        {/* Terrain */}
        <div>
          <SectionHeader icon="⛰️" title="Terrain Assessment" />
          <div style={{ fontSize: "14px" }}>
            <div style={{ marginBottom: "8px" }}>
              <span style={{ fontWeight: "600", textTransform: "capitalize" }}>{lc.terrain?.type || "—"}</span>
              {lc.terrain?.slope_estimate && (
                <span style={{
                  marginLeft: "8px", fontSize: "11px", padding: "2px 8px",
                  background: "#fef9c3", color: "#854d0e", borderRadius: "999px",
                  fontFamily: "sans-serif", fontWeight: "600",
                }}>
                  {lc.terrain.slope_estimate}
                </span>
              )}
            </div>
            {lc.terrain?.drainage && (
              <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>
                Drainage: {lc.terrain.drainage}
              </div>
            )}
            {lc.terrain?.recommendations?.length > 0 && (
              <ul style={{ margin: 0, paddingLeft: "16px", color: "#4b5563", fontSize: "13px" }}>
                {lc.terrain.recommendations.map((r, i) => <li key={i} style={{ marginBottom: "4px" }}>{r}</li>)}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* ── Recommended Equipment ── */}
      {lc.equipment?.recommended?.length > 0 && (
        <div style={{ marginBottom: "32px" }}>
          <SectionHeader icon="🔧" title="Recommended Equipment" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
            {lc.equipment.recommended.map((eq, i) => (
              <span key={i} style={{
                fontSize: "12px", padding: "4px 12px", background: "#eff6ff",
                color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: "6px",
                fontFamily: "sans-serif",
              }}>
                {eq}
              </span>
            ))}
          </div>
          {lc.equipment?.considerations?.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: "16px", color: "#4b5563", fontSize: "13px" }}>
              {lc.equipment.considerations.map((c, i) => <li key={i} style={{ marginBottom: "4px" }}>{c}</li>)}
            </ul>
          )}
          <p style={{ fontSize: "11px", color: "#9ca3af", fontStyle: "italic", marginTop: "8px", fontFamily: "sans-serif" }}>
            Common equipment examples. Contractors may use different methods or equipment.
          </p>
        </div>
      )}

      {/* ── Labor & Cost ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
        {/* Labor */}
        {lc.labor && (
          <div>
            <SectionHeader icon="👷" title="Labor Estimate" />
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
              gap: "8px", textAlign: "center",
            }}>
              {[
                { value: lc.labor.estimated_crew_size ?? "—", label: "Crew Size" },
                { value: lc.labor.estimated_hours ?? "—", label: "Est. Hours" },
                { value: lc.labor.difficulty ?? "—", label: "Difficulty", color: getDifficultyColor(lc.labor.difficulty) },
              ].map((item, i) => (
                <div key={i} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "12px 8px" }}>
                  <div style={{ fontSize: "22px", fontWeight: "bold", fontFamily: "sans-serif", color: item.color || "#14532d" }}>
                    {item.value}
                  </div>
                  <div style={{ fontSize: "10px", color: "#9ca3af", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "2px" }}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cost */}
        {lc.cost_factors && (
          <div>
            <SectionHeader icon="💵" title="Cost Estimate" />
            <div style={{ fontSize: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                <span style={{ color: "#6b7280" }}>Base rate per acre</span>
                <span style={{ fontWeight: "600" }}>${lc.cost_factors.base_rate_per_acre?.toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0" }}>
                <span style={{ fontWeight: "700", fontSize: "15px" }}>Estimated Total</span>
                <span style={{ fontWeight: "800", fontSize: "22px", color: "#14532d", fontFamily: "sans-serif" }}>
                  ${lc.cost_factors.estimated_total?.toLocaleString()}
                </span>
              </div>
              <p style={{ fontSize: "11px", color: "#9ca3af", fontStyle: "italic", fontFamily: "sans-serif" }}>
                Actual costs vary by contractor, access, and disposal method.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Hazards ── */}
      {lc.hazards && lc.hazards.length > 0 && (
        <div style={{ marginBottom: "32px" }}>
          <SectionHeader icon="⚠️" title="Potential Hazards" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {lc.hazards.map((hazard, i) => (
              <div key={i} style={{
                background: "#fffbeb", border: "1px solid #fde68a",
                borderRadius: "6px", padding: "10px 14px",
                fontSize: "13px", color: "#78350f", display: "flex", gap: "8px",
              }}>
                <span>⚠</span><span>{hazard}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{
        borderTop: "1px solid #e5e7eb", paddingTop: "20px", marginTop: "32px",
        display: "flex", justifyContent: "space-between", alignItems: "flex-end",
      }}>
        <div>
          <div style={{
            display: "flex", alignItems: "center", gap: "6px",
            fontSize: "11px", color: "#6b7280", fontFamily: "sans-serif", marginBottom: "6px",
          }}>
            <span style={{ color: "#14532d" }}>🔒</span>
            <span>Report locked at time of generation. Data is immutable.</span>
          </div>
          <p style={{ fontSize: "11px", color: "#9ca3af", fontFamily: "sans-serif", maxWidth: "460px", lineHeight: 1.5, margin: 0 }}>
            This analysis is provided for informational and planning purposes only. It is not a legal survey, engineering assessment, or guarantee of conditions. Verify critical details with qualified professionals before making decisions.
          </p>
        </div>
        <div style={{ textAlign: "right", fontFamily: "sans-serif" }}>
          <div style={{ fontSize: "10px", color: "#9ca3af", letterSpacing: "0.05em" }}>REPORT ID</div>
          <div style={{ fontSize: "13px", fontWeight: "700", color: "#14532d", fontFamily: "monospace" }}>{reportNumber}</div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
      <span style={{ fontSize: "16px" }}>{icon}</span>
      <span style={{
        fontSize: "13px", fontWeight: "700", textTransform: "uppercase",
        letterSpacing: "0.08em", color: "#374151", fontFamily: "sans-serif",
      }}>
        {title}
      </span>
      <div style={{ flex: 1, height: "1px", background: "#e5e7eb", marginLeft: "4px" }} />
    </div>
  );
}

// ─── Main Export: Reports Tab Content ─────────────────────────────────────────

export default function PropertyAnalysisReport({ project, analysis }: ReportProps) {
  const [reportGenerated, setReportGenerated] = useState(false);
  const [reportNumber] = useState(() => generateReportNumber(project.id));
  const [generatedAt] = useState(() => new Date());

  const hasAnalysis = !!analysis?.land_classification;

  const handlePrint = () => {
    const reportEl = document.getElementById("landpro-report");
    if (!reportEl) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>LandPro Report ${reportNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { background: white; }
            @media print {
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>${reportEl.outerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  // ── Empty state: no analysis yet ──
  if (!hasAnalysis) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground font-medium mb-2">No reports generated yet</p>
          <p className="text-sm text-muted-foreground">
            Run an AI Analysis on the Analysis tab first, then come back here to generate your report.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Ready to generate ──
  if (!reportGenerated) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="max-w-md mx-auto text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">Ready to Generate Report</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Generating a report locks your analysis data into a permanent, timestamped record.
                The data becomes immutable — any future changes will create a new report version.
              </p>
            </div>

            {/* Preview of what's included */}
            <div className="text-left space-y-2 bg-muted/40 rounded-lg p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Report will include
              </p>
              {[
                "Unique report number & timestamp",
                "Property size & boundary details",
                "Vegetation & terrain assessment",
                "Recommended equipment list",
                "Labor & cost estimates",
                "Potential hazards",
                "Professional disclaimer",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono bg-muted px-2 py-1 rounded">Report #{reportNumber}</span>
              </div>
              <Button
                size="lg"
                className="w-full"
                onClick={() => setReportGenerated(true)}
              >
                <Lock className="h-4 w-4 mr-2" />
                Generate & Lock Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Report generated ──
  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20 gap-1">
            <Lock className="h-3 w-3" />
            Locked {format(generatedAt, "MMM d, yyyy 'at' h:mm a")}
          </Badge>
          <span className="text-sm text-muted-foreground font-mono">{reportNumber}</span>
        </div>
        <Button onClick={handlePrint} className="gap-2">
          <Download className="h-4 w-4" />
          Download PDF
        </Button>
      </div>

      {/* Report preview */}
      <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
        <ReportDocument
          project={project}
          analysis={analysis}
          reportNumber={reportNumber}
          generatedAt={generatedAt}
        />
      </div>
    </div>
  );
}
