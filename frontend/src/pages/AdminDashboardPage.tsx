import React, { useState } from 'react';
import { AdminMetrics } from '../types';
import { Shield, AlertTriangle, Activity, Settings, Database, Lock } from 'lucide-react';
import { SafeText } from '../components/common/SafeText';

export const AdminDashboardPage: React.FC = () => {
  const [metrics] = useState<AdminMetrics>({
    totalObservations: 14820,
    activeZonesCount: 36,
    activeIssuesCount: 4,
    dataQualityWarningsCount: 1,
    averageCampusLatencyMs: 38.4,
    privacyComplianceScore: 100,
  });

  const [thresholds, setThresholds] = useState<Record<string, number>>({
    'zone-lib-north': 5,
    'zone-eng-3': 5,
    'zone-science-quad': 10,
    'zone-student-center': 8,
  });

  const [updateMsg, setUpdateMsg] = useState<string | null>(null);

  const handleUpdateThreshold = (zoneId: string, val: number) => {
    setThresholds((prev) => ({ ...prev, [zoneId]: val }));
    setUpdateMsg(`Updated minimum sample threshold for ${zoneId} to ${val}`);
    setTimeout(() => setUpdateMsg(null), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Administrator Security & Health Console</h1>
          <p className="text-slate-400 text-sm mt-1">
            Institutional network telemetry governance, access auditing, and privacy compliance.
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-full text-emerald-400 text-xs font-bold">
          <Shield className="w-4 h-4" />
          <span>K-Anonymity Guard: ACTIVE</span>
        </div>
      </div>

      {updateMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl mb-6 text-sm">
          <SafeText content={updateMsg} />
        </div>
      )}

      {/* System Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Observations Ingested</span>
            <Database className="w-5 h-5 text-sky-400" />
          </div>
          <span className="text-3xl font-extrabold text-white">{metrics.totalObservations.toLocaleString()}</span>
          <span className="block text-xs text-slate-400 mt-1">Aggregated across 36 zones</span>
        </div>

        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Zones</span>
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <span className="text-3xl font-extrabold text-white">{metrics.activeZonesCount}</span>
          <span className="block text-xs text-slate-400 mt-1">Monitored campus areas</span>
        </div>

        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Open Trouble Tickets</span>
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <span className="text-3xl font-extrabold text-white">{metrics.activeIssuesCount}</span>
          <span className="block text-xs text-slate-400 mt-1">Awaiting moderator triage</span>
        </div>

        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Privacy Posture</span>
            <Lock className="w-5 h-5 text-emerald-400" />
          </div>
          <span className="text-3xl font-extrabold text-emerald-400">{metrics.privacyComplianceScore}%</span>
          <span className="block text-xs text-slate-400 mt-1">Zero individual tracking</span>
        </div>
      </div>

      {/* Privacy Threshold Control Table */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 mb-8 shadow-xl">
        <div className="flex items-center space-x-2 mb-4">
          <Settings className="w-5 h-5 text-sky-400" />
          <h2 className="text-lg font-bold text-white">Zone K-Anonymity Sample Thresholds</h2>
        </div>
        <p className="text-xs text-slate-400 mb-6">
          Enforce the minimum independent observation sample count required before public aggregates are published.
          Setting a threshold ensures individual observations cannot be isolated by differential queries.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/60 text-xs uppercase text-slate-400 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3">Zone Identifier</th>
                <th className="px-4 py-3">Area Name</th>
                <th className="px-4 py-3">Min. Sample Threshold</th>
                <th className="px-4 py-3 text-right">Adjustment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {Object.entries(thresholds).map(([zoneId, threshold]) => (
                <tr key={zoneId}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{zoneId}</td>
                  <td className="px-4 py-3 font-medium text-white">{zoneId.replace('zone-', '').toUpperCase()}</td>
                  <td className="px-4 py-3 font-bold text-emerald-400">{threshold} observations</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => handleUpdateThreshold(zoneId, Math.max(3, threshold - 1))}
                      className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white"
                    >
                      -1
                    </button>
                    <button
                      onClick={() => handleUpdateThreshold(zoneId, threshold + 1)}
                      className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white"
                    >
                      +1
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
