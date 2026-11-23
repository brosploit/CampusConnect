import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';

export const PrivacyNotice: React.FC<{ minimumThreshold?: number }> = ({ minimumThreshold = 5 }) => {
  return (
    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 mb-6 text-sm text-slate-300 flex items-start space-x-3">
      <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
      <div>
        <h4 className="font-semibold text-slate-200">Campus Connect Privacy & K-Anonymity Safeguard</h4>
        <p className="mt-1 text-slate-400">
          To protect student anonymity, zone metrics are calculated exclusively across aggregated data.
          Any campus zone with fewer than <span className="font-medium text-slate-200">{minimumThreshold} independent observations</span> is
          explicitly labeled <span className="text-amber-400 font-semibold">INSUFFICIENT DATA</span> to prevent
          individual re-identification.
        </p>
        <div className="mt-2 flex items-center space-x-2 text-xs text-slate-400">
          <Info className="w-4 h-4 text-sky-400" />
          <span>Zero device tracking • No GPS location • Zero personal identifiers published</span>
        </div>
      </div>
    </div>
  );
};
