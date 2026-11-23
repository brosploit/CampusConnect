import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { IssueCategory } from '../types';
import { AlertCircle, CheckCircle, Send } from 'lucide-react';
import { SafeText } from '../components/common/SafeText';

export const SubmitReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [zoneId, setZoneId] = useState<string>('zone-library-north');
  const [category, setCategory] = useState<IssueCategory>('WIFI_DISCONNECT');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side length validation
    if (description.trim().length < 10) {
      setError('Please provide at least 10 characters describing the connectivity issue.');
      return;
    }
    if (description.trim().length > 1000) {
      setError('Description cannot exceed 1000 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient('/issues', {
        method: 'POST',
        body: JSON.stringify({
          zoneId,
          category,
          description: description.trim(),
        }),
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit issue report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Report Connectivity Issue</h1>
            <p className="text-xs text-slate-400">Submit an anonymous, localized connectivity trouble ticket.</p>
          </div>
        </div>

        {success ? (
          <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center text-emerald-400">
            <CheckCircle className="w-12 h-12 mx-auto mb-2 text-emerald-400" />
            <h3 className="text-lg font-bold">Trouble Ticket Logged</h3>
            <p className="text-sm text-slate-300 mt-1">
              Thank you for helping improve campus network infrastructure. Redirecting to overview...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                <SafeText content={error} />
              </div>
            )}

            <div>
              <label htmlFor="zone-select" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Campus Zone
              </label>
              <select
                id="zone-select"
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="zone-library-north">Main Library — North Reading Room</option>
                <option value="zone-eng-hall">Engineering Hall — Lab B</option>
                <option value="zone-science-quad">Science Quadrangle (Outdoor)</option>
                <option value="zone-student-center">Student Union — Dining Commons</option>
              </select>
            </div>

            <div>
              <label htmlFor="category-select" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Issue Category
              </label>
              <select
                id="category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value as IssueCategory)}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="WIFI_DISCONNECT">Wi-Fi Disconnection / Deauth Loop</option>
                <option value="CAPTIVE_PORTAL_FAILURE">Captive Portal Sign-in Failure</option>
                <option value="CELLULAR_DEAD_ZONE">Cellular Dead Zone (No Service)</option>
                <option value="HIGH_LATENCY">Excessive Latency / Jitter</option>
                <option value="SPEED_DEGRADATION">Throughput Drop (&lt; 1 Mbps)</option>
                <option value="OTHER">Other Network Anomaly</option>
              </select>
            </div>

            <div>
              <label htmlFor="issue-description" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Description of Symptom
              </label>
              <textarea
                id="issue-description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you observed (e.g., Wi-Fi authentication fails with timeout; repeated portal prompts)."
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 resize-none"
                maxLength={1000}
                required
              />
              <span className="text-xs text-slate-400 block text-right mt-1">
                {description.length} / 1000 characters
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-lg"
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Ticket</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
