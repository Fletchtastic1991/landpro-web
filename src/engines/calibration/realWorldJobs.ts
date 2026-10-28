/**
 * Real-world calibration data points.
 *
 * These are ACTUAL jobs (what the contractor really charged) used to check
 * how close the engine's quote lands. They are reported by a test, NOT used
 * to change any rates or production hours. One anecdote is not a dataset —
 * only adjust defaults once several jobs point the same way.
 */
import type { ClearingProInput } from "../ClearingPro";

export interface CalibrationJob {
  id:          string;
  source:      string;    // where the number came from
  region:      string;
  description: string;
  actualTotal: number;    // what was actually charged, $
  /** The engine inputs that best describe the job. We don't know the exact
   *  vegetation density, so each plausible reading is listed. */
  candidateInputs: { label: string; input: ClearingProInput }[];
}

const base = {
  acreage:        0.75,
  terrain:        "flat",
  accessibility:  "easy",
  water:          "none",
  debris:         "none",
  structures:     "none",
  productionRate: "standard",
} as const;

export const CALIBRATION_JOBS: CalibrationJob[] = [
  {
    id:          "ga-075ac-mulch-2026",
    source:      "William Fletcher — anecdotal, one job (Oct 2026)",
    region:      "Georgia",
    description: "~0.75 acre: a few trees removed, forestry mulcher on undergrowth/small stuff. Charged ~$6,000 total (~$8,000/acre).",
    actualTotal: 6000,
    candidateInputs: [
      { label: "light",  input: { ...base, vegetation: "light"  } },
      { label: "medium", input: { ...base, vegetation: "medium" } },
      { label: "heavy",  input: { ...base, vegetation: "heavy"  } },
    ],
  },
];
