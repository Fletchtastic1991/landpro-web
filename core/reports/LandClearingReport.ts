export type LandClearingReport = {
    parcelId: string;
    clearedAreaSqM: number;
    treesRemoved: number;
    estimatedCostUSD: number;
    generatedAt: string;
    notes?: string;
};

export function generateLandClearingReport(parcelId: string): LandClearingReport {
    const now = new Date().toISOString();
    return {
        parcelId,
        clearedAreaSqM: 1234.5,
        treesRemoved: 42,
        estimatedCostUSD: 9876.5,
        generatedAt: now,
        notes: "Simulated report",
    };
}