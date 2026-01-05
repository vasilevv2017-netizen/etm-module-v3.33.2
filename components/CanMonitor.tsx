import React, { useState, useRef, useEffect } from 'react';
import { CanMessage, CanSpeed, MonitorView, SavedTransmitMessage, ComButton, CanRule } from '../types';
import TransmitDialog from './TransmitDialog';
import ComButtonDialog from './ComButtonDialog';
import GraphView from './GraphView';

interface Props {
  deviceName: string; connectionStatus: string; speed: CanSpeed; onSpeedChange: (s: CanSpeed) => void;
  isCanOpen: boolean; onToggleCan: (open: boolean) => void; messages: CanMessage[]; onDisconnect: () => void;
  logs: string[]; comLogs: string[]; onClearComLogs: () => void; comButtons: ComButton[];
  onUpdateComButtons: (btns: ComButton[]) => void; onComButtonPress: (btn: ComButton) => void;
  isLoggingActive: boolean; onToggleLogging: (active: boolean) => void; isLoggingPaused: boolean;
  onToggleLogPause: () => void; onClearLogs: () => void; onImportLogs: (logs: string[]) => void;
  onSendCommand: (cmd: string) => void; savedTxMessages: SavedTransmitMessage[];
  onSaveTxMessage: (msg: Partial<SavedTransmitMessage>) => void; onImportTxMessages: (messages: SavedTransmitMessage[]) => void;
  onDeleteSavedTx: (id: string) => void; activeTxIds: Set<string>; onTogglePeriodicTx: (msg: SavedTransmitMessage) => void;
  rules: CanRule[]; onUpdateRules: (rules: CanRule[]) => void;
}

const CanMonitor: React.FC<Props> = (props) => {
  const [activeView, setActiveView] = useState<MonitorView>(MonitorView.Live);
  const [isTxDialogOpen, setIsTxDialogOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<SavedTransmitMessage | null>(null);
  const [isComDialogOpen, setIsComDialogOpen] = useState(false);
  const [editingCom, setEditingCom] = useState<ComButton | null>(null);
  
  const logEndRef = useRef<HTMLDivElement>(null);
  const comLogEndRef = useRef<HTMLDivElement>(null);
  const logFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeView === MonitorView.Logs && !props.isLoggingPaused) {
      logEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
    if (activeView === MonitorView.ComPort) {
      comLogEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [props.logs.length, props.comLogs.length, activeView, props.isLoggingPaused]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-gray-950">
      {/* HEADER: FIXED */}
      <div className="bg-gray-900 border-b border-white/5 p-3 flex justify-between items-center shrink-0 z-30 safe-pt">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${props.connectionStatus === 'connected' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500 animate-pulse'}`}></div>
          <div className="text-[10px] font-black uppercase text-red-600 truncate max-w-[150px]">{props.deviceName}</div>
        </div>
        <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded border border-white/5">
          {props.isCanOpen ? 'CAN ACTIVE' : 'CAN IDLE'}
        </div>
      </div>

      {/* NAV: FIXED */}
      <div className="flex bg-gray-900 p-1 gap-1 shrink-0 border-b border-white/5 overflow-x-auto monitor-scroll z-30">
        {(Object.values(MonitorView) as MonitorView[]).map(v => (
          <button 
            key={v} 
            onClick={() => setActiveView(v)} 
            className={`flex-none py-2 px-4 text-[9px] font-black rounded uppercase transition-all ${activeView === v ? 'bg-red-600 text-white' : 'text-gray-500 active:bg-white/5'}`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* CONTENT AREA: SCROLLABLE ISOLATED */}
      <div className="flex-1 min-h-0 relative bg-black/20 overflow-hidden">
        {activeView === MonitorView.Live && (
          <div className="absolute inset-0 flex flex-col p-2 gap-2">
            <div className="grid grid-cols-3 gap-1 shrink-0">
              {(['125', '250', '500'] as CanSpeed[]).map(s => (
                <button 
                  key={s} 
                  onClick={() => props.onSpeedChange(s)} 
                  disabled={props.isCanOpen} 
                  className={`py-2 rounded font-mono text-[10px] border ${props.speed === s ? 'bg-red-600 text-white border-red-400' : 'bg-gray-900 text-gray-600 border-white/5'}`}
                >
                  {s}K
                </button>
              ))}
            </div>
            <button 
              onClick={() => props.onToggleCan(!props.isCanOpen)} 
              className={`w-full py-4 rounded font-black text-[11px] uppercase border shrink-0 ${props.isCanOpen ? 'bg-red-900/40 text-red-500 border-red-500' : 'bg-green-600 text-white border-green-400'}`}
            >
              {props.isCanOpen ? 'СТОП CAN-ШИНУ' : 'ЗАПУСК CAN-ШИНЫ'}
            </button>
            <div className="flex-1 min-h-0 bg-black/40 border border-white/5 rounded-xl overflow-y-auto font-mono monitor-scroll">
               <div className="sticky top-0 bg-gray-900 grid grid-cols-4 p-2 text-[8px] text-gray-600 uppercase font-black border-b border-white/5 z-10">
                 <div>ID</div><div className="col-span-2">DATA</div><div className="text-right">CNT</div>
               </div>
               {props.messages.sort((a,b)=>a.id.localeCompare(b.id)).map(m => (
                 <div key={m.id} className="grid grid-cols-4 p-2.5 border-b border-white/5 items-center active:bg-red-600/10">
                   <div className="text-red-500 font-bold text-[14px] leading-tight">{m.id}</div>
                   <div className="col-span-2 text-gray-300 text-[12px] tabular-nums truncate">{m.data}</div>
                   <div className="text-right text-green-500 text-[10px] font-black">{m.count}</div>
                 </div>
               ))}
            </div>
          </div>
        )}

        {activeView === MonitorView.Logs && (
          <div className="absolute inset-0 flex flex-col">
            <div className="p-2 bg-gray-900 grid grid-cols-2 gap-2 shrink-0 border-b border-white/5">
               <button onClick={() => props.onToggleLogging(!props.isLoggingActive)} className={`py-2 rounded text-[9px] font-black uppercase border ${props.isLoggingActive ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>{props.isLoggingActive ? 'ВЫКЛ ЛОГ' : 'ВКЛ ЛОГ'}</button>
               <button onClick={props.onToggleLogPause} className="py-2 bg-gray-800 text-[9px] font-black uppercase text-gray-400 rounded">{props.isLoggingPaused ? 'ПРОДОЛЖИТЬ' : 'ПАУЗА'}</button>
            </div>
            <div className="flex-1 min-h-0 p-3 font-mono overflow-y-auto bg-black/60 monitor-scroll">
               {props.logs.map((l, i) => (
                 <div key={i} className="mb-1 truncate text-green-500/80 text-[11px]">{l}</div>
               ))}
               <div ref={logEndRef} className="h-4" />
            </div>
          </div>
        )}

        {activeView === MonitorView.TX && (
          <div className="absolute inset-0 overflow-y-auto monitor-scroll p-4 bg-gray-950">
            <div className="space-y-3 pb-24">
              {props.savedTxMessages.map(msg => (
                <div key={msg.id_key} className="bg-gray-900 border border-white/5 rounded-2xl p-4 flex justify-between items-center shadow-xl">
                  <div className="min-w-0 flex-1" onClick={() => { setEditingTx(msg); setIsTxDialogOpen(true); }}>
                    <div className="text-[13px] font-black text-white truncate uppercase">{msg.name}</div>
                    <div className="text-[10px] font-mono mt-1 flex gap-3 text-gray-500">
                      <span className="text-red-500 font-bold">{msg.id}</span>
                      <span className="truncate">{msg.data}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => props.onTogglePeriodicTx(msg)} 
                    className={`ml-3 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase ${props.activeTxIds.has(msg.id_key) ? 'bg-red-600 animate-pulse text-white' : 'bg-blue-600 text-white'}`}
                  >
                    {props.activeTxIds.has(msg.id_key) ? 'STOP' : 'SEND'}
                  </button>
                </div>
              ))}
            </div>
            <button 
              onClick={() => { setEditingTx(null); setIsTxDialogOpen(true); }} 
              className="fixed bottom-28 right-6 w-14 h-14 bg-red-600 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform z-40"
            >
               <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        )}

        {activeView === MonitorView.ComPort && (
          <div className="absolute inset-0 flex flex-col bg-gray-950">
            <div className="p-3 bg-gray-900 border-b border-white/5 shrink-0">
               <div className="grid grid-cols-3 gap-2 max-h-[140px] overflow-y-auto monitor-scroll">
                  {props.comButtons.map(btn => (
                    <button key={btn.id} onClick={() => props.onComButtonPress(btn)} className="h-10 bg-gray-800 border border-white/5 rounded-xl flex items-center justify-center active:bg-red-600 transition-all">
                      <span className="text-[9px] font-black text-white truncate px-2">{btn.name}</span>
                    </button>
                  ))}
               </div>
            </div>
            <div className="p-3 bg-black/40 border-b border-white/5 shrink-0">
               <input 
                 type="text" 
                 placeholder="CMD..." 
                 className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-[13px] font-mono text-white focus:border-red-600 outline-none" 
                 onKeyDown={(e) => { 
                   if(e.key === 'Enter'){ 
                     props.onSendCommand((e.target as HTMLInputElement).value); 
                     (e.target as HTMLInputElement).value = ''; 
                   } 
                 }} 
               />
            </div>
            <div className="flex-1 min-h-0 bg-black p-4 font-mono text-[11px] overflow-y-auto monitor-scroll">
               {props.comLogs.map((log, i) => (
                 <div key={i} className={`mb-1 ${log.includes('TX →') ? 'text-blue-500' : 'text-green-500'}`}>{log}</div>
               ))}
               <div ref={comLogEndRef} className="h-2" />
            </div>
          </div>
        )}

        {activeView === MonitorView.Graph && <GraphView messages={props.messages} />}
        {activeView === MonitorView.Logic && <div className="p-10 text-center text-gray-700 uppercase text-[10px] font-black">Logic in Dev</div>}
      </div>

      {/* FOOTER: FIXED AT BOTTOM */}
      <div className="p-4 bg-gray-900 border-t border-white/5 shrink-0 z-30 safe-pb">
         <button 
           onClick={props.onDisconnect} 
           className="w-full py-4 bg-gray-800 hover:bg-red-900/20 text-gray-500 font-black rounded-2xl text-[11px] uppercase tracking-[0.4em] transition-all border border-white/5"
         >
           DISCONNECT
         </button>
      </div>

      {isTxDialogOpen && <TransmitDialog initialMsg={editingTx || { id: '', data: '', period: 100 }} onSave={(msg) => { props.onSaveTxMessage(editingTx ? { ...msg, id_key: editingTx.id_key } : msg); setIsTxDialogOpen(false); }} onClose={() => setIsTxDialogOpen(false)} />}
      {isComDialogOpen && <ComButtonDialog initialBtn={editingCom || { name: '', command: '', mode: 'text', repeatCount: 1, repeatPeriod: 0 }} onSave={(btn) => { if(editingCom) props.onUpdateComButtons(props.comButtons.map(b=>b.id===editingCom.id?{...btn, id:b.id}:b)); else props.onUpdateComButtons([...props.comButtons, {...btn, id:Date.now().toString()}]); setIsComDialogOpen(false); }} onClose={() => setIsComDialogOpen(false)} />}
    </div>
  );
};

export default CanMonitor;