import React from 'react';
import { Brain, SyncState, SectorZone } from '../types';
import { formatBytes } from '../services/mockData';
import { Icon } from './Icons';

interface BrainCardProps {
  brain: Brain;
}

const StateBadge: React.FC<{ state: SyncState }> = ({ state }) => {
  const styles = {
    [SyncState.COHERENT]: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    [SyncState.ENTANGLING]: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10 animate-pulse',
    [SyncState.STABILIZING]: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
    [SyncState.LOCKED]: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    [SyncState.DECOHERENT]: 'text-red-400 border-red-500/30 bg-red-500/10',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${styles[state]}`}>
      {state}
    </span>
  );
};

const ZoneIndicator: React.FC<{ zone: SectorZone }> = ({ zone }) => {
   const zoneColors = {
     [SectorZone.SINGULARITY]: 'text-fuchsia-400',
     [SectorZone.EVENT_HORIZON]: 'text-cyan-400',
     [SectorZone.DEEP_VOID]: 'text-slate-400'
   };
   
   return (
     <div className="flex items-center gap-1.5 mb-1">
       <span className={`w-1.5 h-1.5 rounded-full ${zone === SectorZone.SINGULARITY ? 'bg-fuchsia-500 shadow-[0_0_8px_rgba(217,70,239,0.8)]' : zone === SectorZone.EVENT_HORIZON ? 'bg-cyan-500' : 'bg-slate-500'}`}></span>
       <span className={`text-[10px] font-mono uppercase tracking-widest ${zoneColors[zone]}`}>
         {zone.replace('_', ' ')}
       </span>
     </div>
   );
};

export const BrainCard: React.FC<BrainCardProps> = ({ brain }) => {
  return (
    <div className="bg-memoria-card border border-slate-700/60 rounded-lg p-5 shadow-lg relative overflow-hidden group hover:border-slate-600 transition-all duration-300">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
        <Icon name="database" className="w-32 h-32 transform rotate-12" />
      </div>

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div>
            <ZoneIndicator zone={brain.zone} />
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              {brain.name}
              {brain.activeLock && (
                <span className="text-amber-400 animate-pulse" title={`Locked by ${brain.activeLock}`}>
                  <Icon name="lock" className="w-3.5 h-3.5" />
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-1 opacity-70">{brain.localPath}</p>
          </div>
          <StateBadge state={brain.state} />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-slate-900/40 p-2.5 rounded border border-slate-700/30">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Mass</p>
            <p className="text-sm font-mono text-slate-200">{formatBytes(brain.massBytes)}</p>
          </div>
          <div className="bg-slate-900/40 p-2.5 rounded border border-slate-700/30">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Neurons</p>
            <p className="text-sm font-mono text-slate-200">{brain.neuronCount.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-700/50 pt-3">
          <div className="flex items-center gap-2">
             <span className="text-[10px] text-slate-500 uppercase">Peers</span>
             <div className="flex -space-x-1.5">
              {brain.peers.length > 0 ? (
                brain.peers.map((peerId, idx) => (
                  <div key={idx} className="w-5 h-5 rounded-full bg-slate-700 border border-memoria-card flex items-center justify-center text-[8px] font-bold text-slate-300" title={peerId}>
                      {idx + 1}
                  </div>
                ))
              ) : (
                <span className="text-[10px] text-slate-600 font-mono">None</span>
              )}
             </div>
          </div>
          <p className="text-[10px] text-slate-500 font-mono">
            Cycle: <span className="text-slate-300">{brain.generation}</span>
          </p>
        </div>
      </div>
      
      {brain.state === SyncState.ENTANGLING && (
        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-800">
           <div className="h-full bg-cyan-500 animate-[loading_1s_ease-in-out_infinite] w-full origin-left"></div>
        </div>
      )}
    </div>
  );
};