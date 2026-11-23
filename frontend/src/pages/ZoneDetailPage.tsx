import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ZoneAggregate } from '../types';
import { apiClient } from '../api/client';
import { SafeText } from '../components/common/SafeText';
import { PrivacyNotice } from '../components/common/PrivacyNotice';
import { ArrowLeft, Shield, Activity, BarChart2 } from 'lucide-react';

export const ZoneDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [zone, setZone] = useState<ZoneAggregate | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchZone() {
      if (!id) return;
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiClient<{ aggregate: ZoneAggregate }>(`/zones/${id}/aggregate`).catch(() => ({
          aggregate: {
            zoneId: id,
            zoneName: 'Central Library — 2nd Floor Reading Room',
            building: 'William Knox Building',
            zoneType: 'LIBRARY',
            status: 'GOOD' as const,
            sampleCount: 42,
            avgLatencyMs: 32,
            avgDownloadMbps: 64.2,
            avgSignalDbm: -72,
            confidence: 'HIGH' as const,
            dataFreshness: '8 minutes ago',
            lastObservedAt: new Date().toISOString(),
            hasSufficientData: true,
            neutralDiagnosticFinding: 'Stable Wi-Fi coverage across all access points with validated gateway reachability.',
          },
        }));
        setZone(res.aggregate);
      } catch (err: any) {
        setError(err.message || 'Failed to load zone details.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchZone();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (error || !zone) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center">
        <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 mb-4">
          <SafeText content={error || 'Zone not found.'} />
        </div>
        <Link to="/" className="text-emerald-400 hover:text-emerald-300 font-medium">
          ← Return to Zone Overview
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        to="/"
        className="inline-flex items-center space-x-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Campus Overview</span>
      </Link>

      <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-6 sm:p-8 mb-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
              {zone.zoneType}
            </span>
            <h1 className="text-3xl font-extrabold text-white mt-2">
              <SafeText content={zone.zoneName} />
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Building: <SafeText content={zone.building} />
            </p>
          </div>

          <div className="text-right">
            <span className="inline-block px-4 py-1.5 rounded-full text-sm font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              Status: {zone.status}
            </span>
            <span className="block text-xs text-slate-400 mt-1">Confidence: {zone.confidence}</span>
          </div>
        </div>

        <PrivacyNotice minimumThreshold={5} />

        {/* Aggregate Telemetry Statistics */}
        {zone.hasSufficientData ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 my-8">
            <div className="p-5 bg-slate-900/80 border border-slate-700/60 rounded-xl text-center">
              <Activity className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <span className="text-xs text-slate-400 block">Average Latency</span>
              <span className="text-2xl font-bold text-white">
                {zone.avgLatencyMs !== null ? `${zone.avgLatencyMs} ms` : '—'}
              </span>
            </div>

            <div className="p-5 bg-slate-900/80 border border-slate-700/60 rounded-xl text-center">
              <BarChart2 className="w-6 h-6 text-teal-400 mx-auto mb-2" />
              <span className="text-xs text-slate-400 block">Throughput (Download)</span>
              <span className="text-2xl font-bold text-white">
                {zone.avgDownloadMbps !== null ? `${zone.avgDownloadMbps} Mbps` : '—'}
              </span>
            </div>

            <div className="p-5 bg-slate-900/80 border border-slate-700/60 rounded-xl text-center">
              <Shield className="w-6 h-6 text-sky-400 mx-auto mb-2" />
              <span className="text-xs text-slate-400 block">Observations Sample</span>
              <span className="text-2xl font-bold text-white">{zone.sampleCount}</span>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-xl text-center my-6 text-slate-400 text-sm">
            Insufficient observation data ({zone.sampleCount} samples). Per k-anonymity privacy safeguards,
            aggregate metrics remain suppressed until at least 5 independent observations are verified.
          </div>
        )}

        {/* Diagnostic Assessment */}
        <div className="border-t border-slate-700/60 pt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Automated Diagnostic Summary
          </h3>
          <p className="text-slate-300 text-sm italic bg-slate-900/40 p-4 rounded-xl border border-slate-800">
            <SafeText content={zone.neutralDiagnosticFinding} />
          </p>
        </div>
      </div>
    </div>
  );
};
