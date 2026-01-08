import React, { useState, useRef, useEffect } from 'react';
import { ComButton } from '../types';
import ComButtonDialog from './ComButtonDialog';

interface Props {
  comButtons: ComButton[];
  comLogs: string[];
  onUpdateComButtons: (btns: ComButton[]) => void;
  onComButtonPress: (btn: ComButton) => void;
  onSendCommand: (cmd: string) => void;
  onClearComLogs: () => void;
  onExportButtons: () => void;
  onImportButtons: () => void;
}

const ComPortView: React.FC<Props> = (props) => {
  const [editingBtn, setEditingBtn] = useState<{ btn: ComButton; index: number } | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<any>(null);
  const hasMovedRef = useRef(false);
  const isSetupTriggered = useRef(false);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [props.comLogs.length]);

  const handleStart = (btn: ComButton, index: number) => {
    hasMovedRef.current = false;
    isSetupTriggered.current = false;
    // Set to 700ms to avoid "jokes" or accidental edits
    longPressTimer.current = setTimeout(() => {
      isSetupTriggered.current = true;
      setEditingBtn({ btn, index });
    }, 700);
  };

  const handleEnd = (btn: ComButton) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    // Only send command if it wasn't a long-press and no significant movement happened
    if (!isSetupTriggered.current && !hasMovedRef.current) {
      props.onComButtonPress(btn);
    }
  };

  const handleSaveBtn = (updated: Omit<ComButton, 'id'>) => {
    if (editingBtn) {
      const newBtns = [...props.comButtons];
      newBtns[editingBtn.index] = { ...updated, id: editingBtn.btn.id };
      props.onUpdateComButtons(newBtns);
    } else if (isAdding) {
      props.onUpdateComButtons([...props.comButtons, { ...updated, id: Date.now().toString() }]);
    }
    setEditingBtn(null); setIsAdding(false);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/30">
      <div className="p-4 bg-zinc-900 border-b border-white/5 shrink-0">
        <div className="flex justify-between items-center mb-3">
          <div className="flex gap-2">
            <button onClick={props.onImportButtons} className="text-[8px] font-black uppercase text-zinc-500 bg-zinc-800 px-3 py-2 rounded-lg border border-white/5 shadow-sm active:bg-zinc-700 flex items-center gap-1.5">
               <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/></svg> Load Set
            </button>
            <button onClick={props.onExportButtons} className="text-[8px] font-black uppercase text-zinc-500 bg-zinc-800 px-3 py-2 rounded-lg border border-white/5 shadow-sm active:bg-zinc-700 flex items-center gap-1.5">
               <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h-2v5.586l-1.293-1.293z"/></svg> Save Set
            </button>
          </div>
          <button onClick={() => setIsAdding(true)} className="text-[8px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20 shadow-lg active:scale-95 transition-all">Add Button</button>
        </div>
        
        <div className="text-[7px] text-zinc-700 uppercase font-black mb-2 opacity-50 tracking-tighter">📁 Папка: Downloads/ETM-doc</div>

        <div className="grid grid-cols-3 gap-3 max-h-56 overflow-y-auto pr-1 monitor-scroll no-scrollbar">
          {props.comButtons.map((btn, idx) => (
            <button
              key={btn.id}
              onTouchStart={() => handleStart(btn, idx)}
              onTouchEnd={() => handleEnd(btn)}
              onMouseDown={() => handleStart(btn, idx)}
              onMouseUp={() => handleEnd(btn)}
              onTouchMove={() => { hasMovedRef.current = true; }}
              onContextMenu={(e) => e.preventDefault()}
              className="aspect-square bg-zinc-800/80 border border-white/10 rounded-[1.8rem] flex flex-col items-center justify-center p-3 active:bg-red-600 transition-all shadow-xl shadow-black/30 overflow-hidden"
            >
              <div className="text-[11px] font-black text-zinc-100 uppercase tracking-tighter truncate w-full text-center mb-1 leading-none">{btn.name}</div>
              <div className="text-[7px] font-mono text-zinc-500 truncate w-full text-center opacity-60 font-bold">{btn.command}</div>
            </button>
          ))}
          {props.comButtons.length === 0 && (
            <div className="col-span-3 py-12 text-center text-[10px] text-zinc-700 uppercase font-black tracking-widest opacity-40">Setup keys to begin</div>
          )}
        </div>
      </div>

      <div className="px-4 py-4 bg-zinc-900/80 shrink-0">
        <input type="text" placeholder="DIRECT CMD (ENTER)..." className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 font-mono text-sm text-red-400 outline-none focus:border-red-500/50 shadow-inner tracking-widest uppercase" onKeyDown={e => { if (e.key === 'Enter') { props.onSendCommand(e.currentTarget.value); e.currentTarget.value = ''; } }} />
      </div>

      <div className="flex-1 flex flex-col min-h-0 bg-black/10">
        <div className="px-4 py-2.5 flex justify-between items-center bg-zinc-900/40 border-y border-white/5 shrink-0">
           <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Bus Terminal stream</span>
           <button onClick={props.onClearComLogs} className="text-[8px] font-black text-zinc-500 uppercase border border-white/10 px-3 py-1 rounded-lg hover:bg-white/5 shadow-sm">Flush</button>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 font-mono text-[10px] monitor-scroll leading-relaxed">
          {props.comLogs.map((log, i) => (
            <div key={i} className={`mb-1 ${log.includes('RX ←') ? 'text-blue-400/80' : 'text-emerald-400/80'}`}>{log}</div>
          ))}
          <div className="h-4" />
        </div>
      </div>

      {(editingBtn || isAdding) && (
        <ComButtonDialog 
          initialBtn={editingBtn?.btn || { name: '', command: '', mode: 'text', repeatCount: 1, repeatPeriod: 0 }}
          onSave={handleSaveBtn}
          onDelete={() => { if (editingBtn) props.onUpdateComButtons(props.comButtons.filter((_, i) => i !== editingBtn.index)); setEditingBtn(null); }}
          onClose={() => { setEditingBtn(null); setIsAdding(false); }}
        />
      )}
    </div>
  );
};

export default ComPortView;