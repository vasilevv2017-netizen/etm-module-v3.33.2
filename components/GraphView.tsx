import React, { useState, useEffect, useMemo } from 'react';
import { CanMessage, GraphConfig } from '../types';

interface Props {
  messages: CanMessage[];
  configs: GraphConfig[];
  onUpdateConfigs: (cfgs: GraphConfig[]) => void;
  onExportConfigs: () => void;
  onImportConfigs: () => void;
}

const Chart: React.FC<{ config: GraphConfig; messages: CanMessage[]; onDelete: () => void; onEdit: () => void }> = ({ config, messages, onDelete, onEdit }) => {
  const [history, setHistory] = useState<number[]>([]);
  
  useEffect(() => {
    const target = messages.find(m => m.id === config.canId);
    if (target) {
      try {
        const hex = target.data.replace(/\s/g, '');
        const bigIntVal = BigInt('0x' + hex);
        const shift = BigInt((hex.length * 4) - config.bitOffset - config.bitLength);
        const mask = (BigInt(1) << BigInt(config.bitLength)) - BigInt(1);
        const val = Number((bigIntVal >> shift) & mask);
        setHistory(prev => [...prev.slice(-59), val]);
      } catch(e) {}
    }
  }, [messages, config]);

  const points = useMemo(() => {
    if (history.length < 2) return "";
    const range = config.maxVal - config.minVal || 1;
    return history.map((val, i) => {
      const x = (i / 59) * 300;
      const y = 100 - ((val - config.minVal) / range) * 100;
      return `${x},${y}`;
    }).join(" ");
  }, [history, config]);

  return (
    <div className="bg-zinc-800/60 p-5 rounded-[2.5rem] border border-white/5 relative mb-4 shadow-xl shadow-black/20">
      <div className="flex justify-between items-start mb-4">
        <div>
           <div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">{config.label || config.canId}</div>
           <div className="text-3xl font-black text-red-500 tabular-nums tracking-tighter mt-1">{history[history.length-1] || 0}</div>
        </div>
        <div className="flex gap-1">
           <button onClick={onEdit} className="p-3 text-zinc-600 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
           </button>
           <button onClick={onDelete} className="p-3 text-zinc-600 hover:text-red-500 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
           </button>
        </div>
      </div>
      
      <div className="relative h-32 bg-black/40 rounded-3xl border border-white/5 overflow-hidden shadow-inner">
        {/* Scales */}
        <div className="absolute left-2 top-2 text-[8px] font-black text-zinc-700 bg-black/40 px-1 rounded">{config.maxVal}</div>
        <div className="absolute left-2 bottom-2 text-[8px] font-black text-zinc-700 bg-black/40 px-1 rounded">{config.minVal}</div>
        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[7px] font-black text-zinc-800 opacity-50">{Math.round((config.maxVal + config.minVal)/2)}</div>
        
        <svg className="w-full h-full overflow-visible p-3" viewBox="0 0 300 100" preserveAspectRatio="none">
          {/* Grid lines */}
          <line x1="0" y1="50" x2="300" y2="50" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          <polyline fill="none" stroke="rgba(239, 68, 68, 0.7)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" points={points} />
        </svg>
      </div>
    </div>
  );
};

const GraphView: React.FC<Props> = ({ messages, configs, onUpdateConfigs, onExportConfigs, onImportConfigs }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<GraphConfig>({ id: '', canId: '', bitOffset: 0, bitLength: 8, minVal: 0, maxVal: 100, label: '' });

  const openForm = (cfg?: GraphConfig) => {
    if (cfg) { setForm(cfg); setEditingId(cfg.id); }
    else { setForm({ id: '', canId: '', bitOffset: 0, bitLength: 8, minVal: 0, maxVal: 100, label: '' }); setEditingId('new'); }
  };

  const save = () => {
    if (editingId === 'new') onUpdateConfigs([...configs, { ...form, id: Date.now().toString() }]);
    else onUpdateConfigs(configs.map(c => c.id === editingId ? { ...form } : c));
    setEditingId(null);
  };

  return (
    <div className="flex-1 flex flex-col p-4 overflow-y-auto monitor-scroll bg-zinc-950/20">
      <div className="flex justify-between items-center mb-4">
         <div className="flex gap-2">
            <button onClick={onImportConfigs} className="bg-zinc-800 px-3 py-2.5 rounded-xl text-[9px] font-black uppercase text-zinc-400 border border-white/5 shadow-sm active:bg-zinc-700 transition-colors flex items-center gap-1.5">
               <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/></svg> Load Set
            </button>
            <button onClick={onExportConfigs} className="bg-zinc-800 px-3 py-2.5 rounded-xl text-[9px] font-black uppercase text-zinc-400 border border-white/5 shadow-sm active:bg-zinc-700 transition-colors flex items-center gap-1.5">
               <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h-2v5.586l-1.293-1.293z"/></svg> Save Set
            </button>
         </div>
         <button onClick={() => openForm()} className="bg-emerald-500 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase text-white shadow-lg active:scale-95 transition-all">Add Graph</button>
      </div>
      
      <div className="text-[7px] text-zinc-700 uppercase font-black mb-4 opacity-50 tracking-tighter ml-1">📁 Папка: Downloads/ETM-doc</div>
      
      <div className="pb-24 space-y-4">
        {configs.map(c => (
          <Chart key={c.id} config={c} messages={messages} onEdit={() => openForm(c)} onDelete={() => onUpdateConfigs(configs.filter(x => x.id !== c.id))} />
        ))}
        {configs.length === 0 && (
          <div className="py-20 text-center text-zinc-700 text-[10px] font-black uppercase tracking-[0.3em] opacity-30">Empty chart engine</div>
        )}
      </div>

      {editingId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl">
           <div className="w-full max-w-sm bg-zinc-900 p-8 rounded-[2.5rem] border border-white/10 shadow-2xl">
              <h4 className="text-md font-black uppercase mb-8 text-zinc-100 tracking-tight">{editingId === 'new' ? 'Create New Trace' : 'Trace Settings'}</h4>
              <div className="space-y-5">
                 <div className="space-y-1">
                    <label className="text-[8px] font-black text-zinc-600 uppercase ml-1 block">Chart Label</label>
                    <input type="text" value={form.label} className="w-full bg-black/50 border border-white/5 rounded-2xl p-4 text-xs font-bold outline-none text-zinc-100" onChange={e => setForm({...form, label: e.target.value})} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-zinc-600 uppercase ml-1 block">CAN ID (HEX)</label>
                      <input type="text" value={form.canId} className="w-full bg-black border border-white/5 rounded-xl p-4 text-xs font-mono text-red-500 outline-none" onChange={e => setForm({...form, canId: e.target.value.toUpperCase()})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-zinc-600 uppercase ml-1 block">Length (Bits)</label>
                      <input type="number" value={form.bitLength} className="w-full bg-black border border-white/5 rounded-xl p-4 text-xs outline-none text-zinc-100" onChange={e => setForm({...form, bitLength: parseInt(e.target.value) || 1})} />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-zinc-600 uppercase ml-1 block">Offset (Bits)</label>
                      <input type="number" value={form.bitOffset} className="w-full bg-black border border-white/5 rounded-xl p-4 text-xs outline-none text-zinc-100" onChange={e => setForm({...form, bitOffset: parseInt(e.target.value) || 0})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-zinc-600 uppercase ml-1 block">Scale (Min-Max)</label>
                      <div className="flex gap-2">
                        <input type="number" value={form.minVal} className="w-full bg-black border border-white/5 rounded-xl p-3 text-[10px] text-zinc-100" onChange={e => setForm({...form, minVal: parseInt(e.target.value) || 0})} />
                        <input type="number" value={form.maxVal} className="w-full bg-black border border-white/5 rounded-xl p-3 text-[10px] text-zinc-100" onChange={e => setForm({...form, maxVal: parseInt(e.target.value) || 100})} />
                      </div>
                    </div>
                 </div>
                 <div className="flex gap-3 pt-6">
                    <button onClick={save} className="flex-1 py-4 bg-emerald-500 rounded-2xl font-black text-[10px] uppercase text-white shadow-xl shadow-emerald-900/40">Apply</button>
                    <button onClick={() => setEditingId(null)} className="flex-1 py-4 bg-zinc-800 rounded-2xl font-black text-[10px] uppercase text-zinc-500 transition-all">Cancel</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default GraphView;