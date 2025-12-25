import React from 'react';
import { Icon } from './Icons';

// This component is deprecated and should not be used in the active UI.
export const IntelligencePanel: React.FC<any> = () => {
  return (
    <div className="bg-memoria-card border border-slate-700 rounded-lg p-6 h-full flex flex-col items-center justify-center text-slate-500">
      <Icon name="shield" className="w-12 h-12 mb-4 opacity-50" />
      <h2 className="text-xl font-bold text-slate-400">Module Disabled</h2>
      <p>AI Intelligence features have been deactivated.</p>
    </div>
  );
};