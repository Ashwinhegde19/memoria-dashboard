import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface NetworkGraphProps {
  data: { time: string; mbps: number }[];
}

export const NetworkGraph: React.FC<NetworkGraphProps> = ({ data }) => {
  return (
    <div className="h-64 w-full">
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Context Sync Throughput (Mbps)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorMbps" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="time" stroke="#475569" tick={{fontSize: 12}} />
          <YAxis stroke="#475569" tick={{fontSize: 12}} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#e2e8f0' }}
            itemStyle={{ color: '#38bdf8' }}
          />
          <Area type="monotone" dataKey="mbps" stroke="#38bdf8" fillOpacity={1} fill="url(#colorMbps)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};