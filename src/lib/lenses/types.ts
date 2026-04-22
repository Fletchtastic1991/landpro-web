// ─── The contract every lens must return ─────────────────────────────────────

export interface LensResult {
  id:      string;
  name:    string;
  enabled: boolean;
  summary: Record<string, unknown>;
  details: Record<string, unknown>;
  cost?: {
    low:  number;
    high: number;
  };
  warnings?: string[];
}

// ─── The signature every lens engine must follow ─────────────────────────────

export type LensEngine<TInputs = unknown> = (
  project: LensProject,
  inputs:  TInputs
) => LensResult;

// ─── The project shape lenses can read from ──────────────────────────────────

export interface LensProject {
  acreage:  number;
  boundary: GeoJSON.Polygon | null | undefined;
  terrain:  "flat" | "slight_slope" | "steep";
  accessibility: "easy" | "moderate" | "difficult";
  water:    "none" | "pond_or_creek" | "wetland";
}

// ─── Lens state (ON/OFF switches) ────────────────────────────────────────────

export type LensState = Record<string, boolean>;

// ─── All lens inputs keyed by lens id ────────────────────────────────────────

export type LensInputMap = Record<string, unknown>;

// ─── The result map returned by runLenses ─────────────────────────────────────

export type LensResultMap = Record<string, LensResult>;
