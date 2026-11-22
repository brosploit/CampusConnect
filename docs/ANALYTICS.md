# Analytics and Interpretation — Campus Connect

## Purpose
Analytics summarize observed connectivity. They do not establish the cause of a failure.

## Metrics
**Cellular service availability:** eligible observations with cellular service / eligible observations where service state was measured.

**Internet test success:** successful internet tests / attempted valid internet tests.

**Signal strength:** median of valid, sufficiently fresh signal observations. Do not assume measurements from different devices/radio technologies are directly equivalent.

**Latency:** median latency from successful tests to a controlled HTTPS endpoint.

**Throughput:** summarize only comparable tests; document endpoint and test conditions.

## Confidence
Consider total observations, distinct devices, sessions, time spread, carrier representation, device/API availability, and freshness. Repeated samples from one device/session are not independent contributors.

## Heatmap labels
GOOD, UNSTABLE, POOR, VERY_POOR, INSUFFICIENT_DATA. Set thresholds after pilot data review; do not present arbitrary thresholds as scientific facts.

## Distinctions
- Cellular service does not guarantee internet access.
- Internet failure does not mean cellular signal is absent.
- Wi-Fi differs from mobile-network connectivity.
- Failures may result from server issues, congestion, captive portals, device settings, routing, or other causes.
- No-service observations alone do not prove jamming.
- Carrier comparisons need adequate samples and controls.

Every chart/status should show time window, sample count, safe distinct-device count, last update, stale/insufficient-data warnings, and metric definition.
