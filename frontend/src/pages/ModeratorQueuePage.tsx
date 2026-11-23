import React, { useState, useEffect } from 'react';
import { IssueReport, IssueStatus } from '../types';
import { apiClient } from '../api/client';
import { SafeText } from '../components/common/SafeText';
import { Edit3 } from 'lucide-react';

export const ModeratorQueuePage: React.FC = () => {
  const [issues, setIssues] = useState<IssueReport[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIssue, setActiveIssue] = useState<IssueReport | null>(null);
  const [moderatorNote, setModeratorNote] = useState<string>('');
  const [newStatus, setNewStatus] = useState<IssueStatus>('REVIEWING');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  useEffect(() => {
    async function loadIssues() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiClient<{ issues: IssueReport[] }>('/admin/issues').catch(() => ({
          issues: [
            {
              id: 'iss-101',
              reporterId: 'u-std-481',
              reporterDisplayName: 'Student #481',
              zoneId: 'zone-lib-north',
              zoneName: 'Main Library — North Reading Room',
              category: 'WIFI_DISCONNECT' as const,
              description: 'Wi-Fi drops connection abruptly during peak study hours between 2 PM and 4 PM.',
              status: 'REVIEWING' as const,
              moderatorNotes: 'IT Operations investigating AP-LIB-02 access point firmware.',
              createdAt: '2026-11-23T14:30:00Z',
              updatedAt: '2026-11-23T15:10:00Z',
              resolvedAt: null,
            },
            {
              id: 'iss-102',
              reporterId: 'u-std-920',
              reporterDisplayName: 'Student #920',
              zoneId: 'zone-eng-3',
              zoneName: 'Engineering Hall — Basement Lab 04',
              category: 'CELLULAR_DEAD_ZONE' as const,
              description: 'Complete lack of cellular reception; emergency calls intermittently fail.',
              status: 'NEW' as const,
              moderatorNotes: null,
              createdAt: '2026-11-23T16:45:00Z',
              updatedAt: '2026-11-23T16:45:00Z',
              resolvedAt: null,
            },
          ],
        }));
        setIssues(res.issues);
      } catch (err: any) {
        setError(err.message || 'Failed to load moderator issue queue.');
      } finally {
        setIsLoading(false);
      }
    }

    loadIssues();
  }, []);

  const handleUpdateStatus = async () => {
    if (!activeIssue) return;
    setIsUpdating(true);
    try {
      await apiClient(`/admin/issues/${activeIssue.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: newStatus,
          adminNotes: moderatorNote.trim(),
        }),
      });

      setIssues((prev) =>
        prev.map((it) =>
          it.id === activeIssue.id
            ? { ...it, status: newStatus, moderatorNotes: moderatorNote.trim() }
            : it
        )
      );
      setActiveIssue(null);
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredIssues = issues.filter(
    (item) => selectedStatus === 'all' || item.status === selectedStatus
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Moderator Triage & Issue Queue</h1>
          <p className="text-slate-400 text-sm mt-1">
            Review, classify, and dispatch campus connectivity trouble reports.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <label htmlFor="filter-status-select" className="text-xs text-slate-400 uppercase font-semibold">Filter:</label>
          <select
            id="filter-status-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-amber-400"
          >
            <option value="all">All Statuses</option>
            <option value="NEW">New</option>
            <option value="REVIEWING">Reviewing</option>
            <option value="RESOLVED">Resolved</option>
            <option value="DISMISSED">Dismissed</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400"></div>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-center">
          <SafeText content={error} />
        </div>
      ) : (
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4">Ticket</th>
                  <th className="px-6 py-4">Zone</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Reported</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {filteredIssues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-slate-800/80 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-slate-300">
                      <SafeText content={issue.id} />
                    </td>
                    <td className="px-6 py-4 font-medium text-white">
                      <SafeText content={issue.zoneName || issue.zoneId} />
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-900 border border-slate-700 text-slate-300">
                        {issue.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        {issue.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(issue.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setActiveIssue(issue);
                          setNewStatus(issue.status);
                          setModeratorNote(issue.moderatorNotes || '');
                        }}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-medium text-white transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Triage</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Triage Modal */}
      {activeIssue && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">
              Triage Issue Ticket: <SafeText content={activeIssue.id} />
            </h3>
            <div className="mb-4 text-xs text-slate-400 bg-slate-800/80 p-3 rounded-lg border border-slate-700">
              <span className="font-semibold block text-slate-300 mb-1">Student Description:</span>
              <SafeText content={activeIssue.description} />
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="triage-status-select" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Update Resolution Status
                </label>
                <select
                  id="triage-status-select"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as IssueStatus)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-amber-400"
                >
                  <option value="NEW">NEW</option>
                  <option value="REVIEWING">REVIEWING</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="DISMISSED">DISMISSED</option>
                </select>
              </div>

              <div>
                <label htmlFor="triage-mod-note" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Moderator Audit Notes
                </label>
                <textarea
                  id="triage-mod-note"
                  rows={3}
                  value={moderatorNote}
                  onChange={(e) => setModeratorNote(e.target.value)}
                  placeholder="Document actions taken or reason for status change..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setActiveIssue(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={isUpdating}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-lg transition-colors flex items-center space-x-2"
              >
                {isUpdating ? 'Saving...' : 'Apply Status Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
