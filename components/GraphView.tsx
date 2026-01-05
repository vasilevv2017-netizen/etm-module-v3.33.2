import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CanMessage, GraphConfig } from '../types';

interface Props {
  messages: CanMessage[];
}

interface ChartProps {
  config: GraphConfig;
  messages: CanMessage[];
  onConfigOpen: (config: GraphConfig) => void;
}

const Chart: React.FC<ChartProps> = ({ config, messages, onConfigOpen }) => {
  const [history, setHistory] = useState<{ value: number; time: number }[]>([]);
  const [autoScale, setAutoScale] = useState(false);
  const [zoomOffset, setZoomOffset] = useState({ min: config.minVal, max: config.maxVal });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!autoScale) {
      setZoomOffset({ min: config.minVal, max: config.maxVal });
    }
  }, [config.minVal, config.maxVal, autoScale]);

  const extractValue = (hexData: string, offset: number, length: number) => {
    try {
      const hex = hexData.replace(/\s/g, '');
      if (!hex) return 0; // Guard for empty data frames (DLC 0)
      const bigIntValue = BigInt('0x' + hex);
      const totalBits = hex.length * 4;
      const shift = BigInt(totalBits - offset - length);
      const mask = (BigInt(1) << BigInt(length)) - BigInt(1);
      return Number((bigIntValue >> shift) & mask);
    } catch {
      return 0;
    }
  };

  useEffect(() => {
    const target = messages.find(m => m.id === config.canId);
    if (target) {
      const val = extractValue(target.data, config.bitOffset, config.bitLength);
      setHistory(prev => {
        const next = [...prev, { value: val, time: Date.now() }];
        return next.slice(-100);
      });
    }
  }, [messages, config.canId, config.bitOffset, config.bitLength]);

  useEffect(() => {
    if (autoScale && history.length > 0) {
      const values = history.map(h => h.value);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const padding = (max - min) * 0.1 || 1;
      setZoomOffset({ min: min - padding, max: max + padding });
    }
  }, [history, autoScale]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    longPressTimer.current = window.setTimeout(() => {
      onConfigOpen(config);
    }, 2000);
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const points = useMemo(() => {
    if (history.length < 2) return "";
    const w = 350;
    const h = 150;
    const range = zoomOffset.max - zoomOffset.min || 1;
    return history.map((p, i) => {
      const x = (i / (history.length - 1)) * w;
      const y = h - ((p.value - zoomOffset.min) / range) * h;
      return `${x},${y}`;
    }).join(" ");
  }, [history, zoomOffset]);

  const currentValue = history.length > 0 ? history[history.length - 1].value : 0;

  const adjustZoom = (factor: number) => {
    setAutoScale(false);
    const center = (zoomOffset.max + zoomOffset.min) / 2;
    const range = (zoomOffset.max - zoomOffset.min) / factor;
    setZoomOffset({
      min: center - range / 2,
      max: center + range / 2
    });
  };

  return (
    <div 
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-4 relative overflow-hidden shadow-inner group active:bg-white/10 transition-colors"
    >
      <div className="absolute top-4 right-6 text-right z-10 pointer-events-none">
        <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1">{config.label || config.canId}</div>
        <div className="text-2xl font-black text-red-500/80 tabular-nums drop-shadow-sm">
          {currentValue}
        </div>
      </div>

      <div className="absolute left-4 top-4 flex flex-col gap-2 z-20">
        <button 
          onClick={() => setAutoScale(!autoScale)}
          className={`px-2 py-1 rounded text-[8px] font-black uppercase transition-all ${autoScale ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'bg-gray-800 text-gray-500 border border-white/5'}`}
        >
          Auto
        </button>
        <div className="flex flex-col bg-gray-900/80 border border-white/5 rounded overflow-hidden shadow-lg">
          <button 
            onClick={() => adjustZoom(1.2)}
            className="p-1.5 hover:bg-white/10 text-gray-400 active:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </button>
          <div className="h-px bg-white/5"></div>
          <button 
            onClick={() => adjustZoom(0.8)}
            className="p-1.5 hover:bg-white/10 text-gray-400 active:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
          </button>
        </div>
      </div>

      <div className="absolute left-4 bottom-2 right-4 text-[8px] font-mono text-gray-700 flex justify-between pointer-events-none">
        <span>T-10s</span>
        <div className="flex gap-4">
          <span>Min: {zoomOffset.min.toFixed(1)}</span>
          <span>Max: {zoomOffset.max.toFixed(1)}</span>
        </div>
        <span>T-0s</span>
      </div>
      
      <svg className="w-full h-full mb-2" viewBox="0 0 350 150" preserveAspectRatio="none">
        {[0, 0.25, 0.5, 0.75, 1].map(v => (
          <line key={`h-${v}`} x1="0" y1={v * 150} x2="350" y2={v * 150} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map(v => (
          <line key={`v-${v}`} x1={v * 350} y1="0" x2={v * 350} y2="150" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
        ))}
        
        <polyline
          fill="none"
          stroke="rgba(220, 38, 38, 0.8)"
          strokeWidth="2"
          strokeLinejoin="round"
          points={points}
        />
        
        <line x1="0" y1="145" x2="350" y2="145" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      </svg>
    </div>
  );
};

const GraphView: React.FC<Props> = ({ messages }) => {
  const [configs, setConfigs] = useState<GraphConfig[]>([
    { id: '1', canId: '0CF00400', bitOffset: 24, bitLength: 16, minVal: 0, maxVal: 8000, label: 'Engine RPM' },
    { id: '2', canId: '18FEF200', bitOffset: 0, bitLength: 8, minVal: 0, maxVal: 255, label: 'Fuel Level' }
  ]);
  const [editingConfig, setEditingConfig] = useState<GraphConfig | null>(null);

  const handleUpdateConfig = (cfg: GraphConfig) => {
    setConfigs(prev => prev.map(c => c.id === cfg.id ? cfg : c));
    setEditingConfig(null);
  };

  return (
    <div className="flex-1 flex flex-col gap-4 p-4 overflow-hidden bg-gray-950">
      <Chart config={configs[0]} messages={messages} onConfigOpen={setEditingConfig} />
      <Chart config={configs[1]} messages={messages} onConfigOpen={setEditingConfig} />

      {editingConfig && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl">
          <div className="w-full max-w-sm bg-gray-900 border border-white/10 rounded-2xl p-7 shadow-2xl">
            <h3 className="text-xl font-black text-white uppercase mb-5 tracking-tight">Настройки графиков</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-mono text-gray-600 uppercase mb-1 block">Метка</label>
                <input 
                  type="text" 
                  value={editingConfig.label} 
                  onChange={e => setEditingConfig({...editingConfig, label: e.target.value})} 
                  className="w-full bg-black/60 border border-white/5 rounded-lg p-3 font-mono text-gray-100 outline-none focus:border-red-600" 
                />
              </div>
              <div>
                <label className="text-[9px] font-mono text-gray-600 uppercase mb-1 block">CAN ID (Hex)</label>
                <input 
                  type="text" 
                  value={editingConfig.canId} 
                  onChange={e => setEditingConfig({...editingConfig, canId: e.target.value.toUpperCase()})} 
                  className="w-full bg-black/60 border border-white/5 rounded-lg p-3 font-mono text-red-500 outline-none focus:border-red-600" 
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-mono text-gray-600 uppercase mb-1 block">Bit Offset</label>
                  <input 
                    type="number" 
                    value={editingConfig.bitOffset} 
                    onChange={e => setEditingConfig({...editingConfig, bitOffset: parseInt(e.target.value) || 0})} 
                    className="w-full bg-black/60 border border-white/5 rounded-lg p-3 font-mono text-gray-100 outline-none focus:border-red-600" 
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono text-gray-600 uppercase mb-1 block">Bit Length</label>
                  <input 
                    type="number" 
                    value={editingConfig.bitLength} 
                    onChange={e => setEditingConfig({...editingConfig, bitLength: parseInt(e.target.value) || 0})} 
                    className="w-full bg-black/60 border border-white/5 rounded-lg p-3 font-mono text-gray-100 outline-none focus:border-red-600" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-mono text-gray-600 uppercase mb-1 block">Min Value</label>
                  <input 
                    type="number" 
                    value={editingConfig.minVal} 
                    onChange={e => setEditingConfig({...editingConfig, minVal: parseInt(e.target.value) || 0})} 
                    className="w-full bg-black/60 border border-white/5 rounded-lg p-3 font-mono text-gray-100 outline-none focus:border-red-600" 
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono text-gray-600 uppercase mb-1 block">Max Value</label>
                  <input 
                    type="number" 
                    value={editingConfig.maxVal} 
                    onChange={e => setEditingConfig({...editingConfig, maxVal: parseInt(e.target.value) || 1})} 
                    className="w-full bg-black/60 border border-white/5 rounded-lg p-3 font-mono text-gray-100 outline-none focus:border-red-600" 
                  />
                </div>
              </div>
              <div className="flex gap-2.5 pt-3">
                <button 
                  onClick={() => handleUpdateConfig(editingConfig)}
                  className="flex-1 py-4 bg-red-600 text-white font-black rounded-xl uppercase text-[10px] shadow-lg shadow-red-900/30 border-t border-white/20 active:scale-95"
                >
                  Save
                </button>
                <button 
                  onClick={() => setEditingConfig(null)}
                  className="flex-1 py-4 bg-gray-800 text-gray-400 font-black rounded-xl uppercase text-[10px] border border-white/5 active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GraphView;