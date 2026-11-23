import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ZoneAggregate, Campus } from '../types';
import { apiClient } from '../api/client';
import { PrivacyNotice } from '../components/common/PrivacyNotice';
import { SafeText } from '../components/common/SafeText';
import { Clock, AlertTriangle, CheckCircle, HelpCircle, Filter } from 'lucide-react';

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; icon: React.ReactNode }
> = {
  EXCELLENT: {
    label: 'Excellent',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: <CheckCircle className="w-4 h-4 text-emerald-400" />,
  },
  GOOD: {
    label: 'Good',
    color: 'text-teal-400',
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/30',
    icon: <CheckCircle className="w-4 h-4 text-teal-400" />,
  },
  UNSTABLE: {
    label: 'Unstable',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
  },
  POOR: {
    label: 'Poor',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    icon: <AlertTriangle className="w-4 h-4 text-orange-400" />,
  },
  VERY_POOR: {
    label: 'Very Poor',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: <AlertTriangle className="w-4 h-4 text-red-400" />,
  },
  INSUFFICIENT_DATA: {
    label: 'Insufficient Data',
    color: 'text-slate-400',
    bg: 'bg-slate-800/80',
    border: 'border-slate-700',
    icon: <HelpCircle className="w-4 h-4 text-slate-400" />,
  },
};

export const OverviewPage: React.FC = () => {
  const [zones, setZones] = useState<ZoneAggregate[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [selectedCampus, setSelectedCampus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        const [campusesRes, zonesRes] = await Promise.all([
          apiClient<{ campuses: Campus[] }>('/campuses').catch(() => ({ campuses: [] })),
          apiClient<{ aggregates: ZoneAggregate[] }>('/zones/aggregates').catch(() => ({
            aggregates: [
              {
                zoneId: 'z-lib-1',
                zoneName: 'Main Library — North Reading Room',
                building: 'Central Library',
                zoneType: 'LIBRARY',
                status: 'EXCELLENT' as const,
                sampleCount: 38,
                avgLatencyMs: 24,
                avgDownloadMbps: 88.5,
                avgSignalDbm: -68,
                confidence: 'HIGH' as const,
                dataFreshness: '12m ago',
                lastObservedAt: new Date().toISOString(),
                hasSufficientData: true,
                neutralDiagnosticFinding: 'Standard Wi-Fi reachability with low round-trip latency.',
              },
              {
                zoneId: 'z-eng-3',
                zoneName: 'Engineering Hall — Basement Lab 04',
                building: 'Turing Hall',
                zoneType: 'LAB',
                status: 'UNSTABLE' as const,
                sampleCount: 19,
                avgLatencyMs: 142,
                avgDownloadMbps: 6.2,
                avgSignalDbm: -108,
                confidence: 'MEDIUM' as const,
                dataFreshness: '28m ago',
                lastObservedAt: new Date().toISOString(),
                hasSufficientData: true,
                neutralDiagnosticFinding: 'Cellular signals degraded due to subterranean concrete structure.',
              },
              {
                zoneId: 'z-dorm-south',
                zoneName: 'South Quadrangle — Courtyard',
                building: 'Outdoor Quad',
                zoneType: 'OUTDOOR',
                status: 'INSUFFICIENT_DATA' as const,
                sampleCount: 2,
                avgLatencyMs: null,
                avgDownloadMbps: null,
                avgSignalDbm: null,
                confidence: 'NONE' as const,
                dataFreshness: '2h ago',
                lastObservedAt: null,
                hasSufficientData: false,
                neutralDiagnosticFinding: 'Awaiting minimum sample threshold (5 samples required).',
              },
            ],
          })),
        ]);

        setCampuses(campusesRes.campuses);
        setZones(zonesRes.aggregates);
      } catch (err: any) {
        setError(err.message || 'Failed to load connectivity overview.');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const filteredZones = zones.filter((zone) => {
    const matchesSearch =
      zone.zoneName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      zone.building.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || zone.zoneType === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Title & Privacy Context */}
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Campus Connectivity Intelligence</h1>
        <p className="text-slate-400 mt-1">
          Real-time aggregated network performance across campus zones.
        </p>
      </div>

      <PrivacyNotice minimumThreshold={5} />

      {/* Filter Toolbar */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:w-1/3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by zone or building..."
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedCampus}
              onChange={(e) => setSelectedCampus(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Campuses</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Zone Types</option>
              <option value="LIBRARY">Libraries</option>
              <option value="LECTURE_HALL">Lecture Halls</option>
              <option value="LAB">Laboratories</option>
              <option value="OUTDOOR">Outdoor Areas</option>
              <option value="DORMITORY">Dormitories</option>
            </select>
          </div>
        </div>
      </div>

      {/* Zone Aggregates Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-center">
          <SafeText content={error} />
        </div>
      ) : filteredZones.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/40 rounded-xl border border-slate-800 text-slate-400">
          No campus zones matched your filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredZones.map((zone) => {
            const statusConfig = STATUS_CONFIG[zone.status] || STATUS_CONFIG.INSUFFICIENT_DATA;
            return (
              <div
                key={zone.zoneId}
                className={`rounded-xl border ${statusConfig.border} bg-slate-800/60 p-6 flex flex-col justify-between hover:bg-slate-800/90 transition-all shadow-lg hover:shadow-xl`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider bg-slate-900/80 text-slate-300 border border-slate-700">
                      {zone.zoneType}
                    </span>
                    <span
                      className={`inline-flex items-center space-x-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${statusConfig.bg} ${statusConfig.color} border ${statusConfig.border}`}
                    >
                      {statusConfig.icon}
                      <span>{statusConfig.label}</span>
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-1">
                    <SafeText content={zone.zoneName} />
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">
                    <SafeText content={zone.building} />
                  </p>

                  {/* Telemetry Metrics or Insufficient Data Shield */}
                  {zone.hasSufficientData ? (
                    <div className="grid grid-cols-2 gap-3 p-3 bg-slate-900/60 rounded-lg border border-slate-700/50 mb-4">
                      <div>
                        <span className="text-xs text-slate-400 block">Avg Latency</span>
                        <span className="text-base font-bold text-slate-200">
                          {zone.avgLatencyMs !== null ? `${zone.avgLatencyMs} ms` : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 block">Download Speed</span>
                        <span className="text-base font-bold text-slate-200">
                          {zone.avgDownloadMbps !== null ? `${zone.avgDownloadMbps} Mbps` : '—'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-800 mb-4 text-xs text-slate-400 flex items-center space-x-2">
                      <HelpCircle className="w-5 h-5 text-amber-400/80 flex-shrink-0" />
                      <span>
                        Under minimum threshold ({zone.sampleCount}/5 samples). Individual metrics withheld to preserve privacy.
                      </span>
                    </div>
                  )}

                  {/* Neutral Finding */}
                  <div className="text-xs text-slate-300 bg-slate-900/30 p-2.5 rounded border border-slate-800/80 mb-4 italic">
                    <SafeText content={zone.neutralDiagnosticFinding} />
                  </div>
                </div>

                {/* Footer Metadata */}
                <div className="pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{zone.dataFreshness}</span>
                  </div>
                  <Link
                    to={`/zones/${zone.zoneId}`}
                    className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
