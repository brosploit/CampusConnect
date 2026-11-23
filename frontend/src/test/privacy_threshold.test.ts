import { describe, it, expect } from 'vitest';

describe('Privacy K-Anonymity & Minimum Sample Thresholds', () => {
  it('strictly enforces INSUFFICIENT_DATA and suppresses metrics when samples are below threshold', () => {
    const MINIMUM_THRESHOLD = 5;

    function applyPrivacyThreshold(rawZone: {
      zoneId: string;
      sampleCount: number;
      avgLatencyMs: number | null;
      avgDownloadMbps: number | null;
    }): {
      status: string;
      hasSufficientData: boolean;
      latencyMs: number | null;
      downloadMbps: number | null;
    } {
      if (rawZone.sampleCount < MINIMUM_THRESHOLD) {
        return {
          status: 'INSUFFICIENT_DATA',
          hasSufficientData: false,
          latencyMs: null,
          downloadMbps: null,
        };
      }
      return {
        status: 'GOOD',
        hasSufficientData: true,
        latencyMs: rawZone.avgLatencyMs,
        downloadMbps: rawZone.avgDownloadMbps,
      };
    }

    // Zone with only 2 observations
    const sparseZone = applyPrivacyThreshold({
      zoneId: 'z-dorm-1',
      sampleCount: 2,
      avgLatencyMs: 45,
      avgDownloadMbps: 50.0,
    });

    expect(sparseZone.status).toBe('INSUFFICIENT_DATA');
    expect(sparseZone.hasSufficientData).toBe(false);
    expect(sparseZone.latencyMs).toBeNull();
    expect(sparseZone.downloadMbps).toBeNull();

    // Zone with 6 observations (meeting threshold)
    const sufficientZone = applyPrivacyThreshold({
      zoneId: 'z-lib-1',
      sampleCount: 6,
      avgLatencyMs: 30,
      avgDownloadMbps: 85.0,
    });

    expect(sufficientZone.status).toBe('GOOD');
    expect(sufficientZone.hasSufficientData).toBe(true);
    expect(sufficientZone.latencyMs).toBe(30);
    expect(sufficientZone.downloadMbps).toBe(85.0);
  });
});
