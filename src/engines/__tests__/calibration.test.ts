/**
 * Calibration report — compares engine quotes (default rates) to real jobs.
 * This test does NOT fail when the quote misses; it prints where the quote
 * lands so we can watch the gap as more real data points come in.
 */
import { describe, it, expect } from "vitest";
import { runClearingPro } from "../ClearingPro";
import { CALIBRATION_JOBS } from "../calibration/realWorldJobs";

describe("calibration against real jobs (report only)", () => {
  for (const job of CALIBRATION_JOBS) {
    it(`${job.id}: actual $${job.actualTotal.toLocaleString()}`, () => {
      const rows = job.candidateInputs.map(({ label, input }) => {
        const { min, max } = runClearingPro(input).cost.total;
        const where = job.actualTotal < min ? "actual BELOW range" : job.actualTotal > max ? "actual ABOVE range" : "actual INSIDE range";
        return { reading: label, quoteLow: min, quoteHigh: max, actual: job.actualTotal, where };
      });
      console.log(`\n[calibration] ${job.description}\n  source: ${job.source}`);
      console.table(rows);
      expect(rows.length).toBeGreaterThan(0);
    });
  }
});
