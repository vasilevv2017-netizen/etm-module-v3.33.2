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
    <div className="flex flex-col h-full w-full overflow-hidden bg-gray-950 safe-pb">
      {/* HEADER: СТРОГО ФИКСИРОВАН */}
      <div className="bg-gray-900 border-b border-white/5 p-3 flex justify-between items-center shrink-0 z-30 safe-pt">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${props.connectionStatus === 'connected' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500 animate-pulse'}`}></div>
          <div className="text-[10px] font-black uppercase text-red-600 truncate max-w-[150px]">{props.deviceName}</div>
        </div>
        <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded border border-white/5">
          {props.isCanOpen ? 'CAN ACTIVE' : 'CAN IDLE'}
        </div>
      </div>

      {/* NAVIGATION: СТРОГО ФИКСИРОВАН */}
      <div className="flex bg-gray-900 p-1 gap-1 shrink-0 border-b border-white/5 overflow-x-auto monitor-scroll z-30">
        {(Object.values(MonitorView) as MonitorView[]).map(v => (
          <button 
            key={v} 
            onClick={() => setActiveView(v)} 
            className={`flex-none py-2 px-4 text-[9px] font-black rounded uppercase transition-all ${activeView === v ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 active:bg-white/5'}`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* MAIN CONTENT AREA: ТОЛЬКО ЭТА ЧАСТЬ СКРОЛЛИТСЯ */}
      <div className="flex-1 min-h-0 relative flex flex-col overflow-hidden bg-black/20">
        {activeView === MonitorView.Live && (
          <div className="flex-1 flex flex-col p-2 gap-2 overflow-hidden">
            <div className="grid grid-cols-3 gap-1 shrink-0">
              {(['125', '250', '500'] as CanSpeed[]).map(s => (
                <button 
                  key={s} 
                  onClick={() => props.onSpeedChange(s)} 
                  disabled={props.isCanOpen} 
                  className={`py-2 rounded font-mono text-[10px] border transition-all ${props.speed === s ? 'bg-red-600 text-white border-red-400' : 'bg-gray-900 text-gray-600 border-white/5 opacity-50'}`}
                >
                  {s}K
                </button>
              ))}
            </div>
            <button 
              onClick={() => props.onToggleCan(!props.isCanOpen)} 
              className={`w-full py-4 rounded font-black text-[11px] uppercase border shrink-0 transition-all active:scale-[0.98] ${props.isCanOpen ? 'bg-red-900/40 text-red-500 border-red-500' : 'bg-green-600 text-white border-green-400 shadow-lg shadow-green-900/20'}`}
            >
              {props.isCanOpen ? 'СТОП CAN-ШИНУ' : 'ЗАПУСК CAN-ШИНЫ'}
            </button>
            
            {/* ИЗОЛИРОВАННЫЙ СПИСОК СООБЩЕНИЙ */}
            <div className="flex-1 min-h-0 bg-black/40 border border-white/5 rounded-xl overflow-y-auto font-mono monitor-scroll">
               <div className="sticky top-0 bg-gray-900 grid grid-cols-4 p-2 text-[8px] text-gray-600 uppercase font-black border-b border-white/5 z-10">
                 <div>ID</div><div className="col-span-2">DATA</div><div className="text-right">CNT</div>
               </div>
               {props.messages.sort((a,b)=>a.id.localeCompare(b.id)).map(m => (
                 <div key={m.id} className="grid grid-cols-4 p-2.5 border-b border-white/5 items-center active:bg-red-600/10 transition-colors">
                   <div className="text-red-500 font-bold text-[14px] leading-tight tracking-tight">{m.id}</div>
                   <div className="col-span-2 text-gray-300 text-[12px] tabular-nums tracking-wider truncate">{m.data}</div>
                   <div className="text-right text-green-500 text-[10px] font-black">{m.count}</div>
                 </div>
               ))}
               {props.messages.length === 0 && (
                 <div className="h-full flex items-center justify-center text-gray-700 text-[10px] uppercase font-mono italic">
                    Ожидание данных...
                 </div>
               )}
            </div>
          </div>
        )}

        {activeView === MonitorView.Logs && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-2 bg-gray-900 grid grid-cols-2 gap-2 shrink-0 border-b border-white/5">
               <button onClick={() => props.onToggleLogging(!props.isLoggingActive)} className={`py-2 rounded text-[9px] font-black uppercase border transition-all ${props.isLoggingActive ? 'bg-red-600 text-white border-red-400' : 'bg-green-600 text-white border-green-400'}`}>{props.isLoggingActive ? 'ВЫКЛ ЛОГ' : 'ВКЛ ЛОГ'}</button>
               <button onClick={props.onToggleLogPause} className={`py-2 rounded text-[9px] font-black uppercase border border-white/5 ${props.isLoggingPaused ? 'bg-yellow-600 text-white' : 'bg-gray-800 text-gray-400'}`}>{props.isLoggingPaused ? 'ПРОДОЛЖИТЬ' : 'ПАУЗА'}</button>
               <button onClick={props.onClearLogs} className="py-2 bg-gray-800 text-[9px] font-black uppercase text-gray-500 rounded border border-white/5">ОЧИСТИТЬ</button>
               <button onClick={() => logFileRef.current?.click()} className="py-2 bg-gray-800 text-[9px] font-black uppercase text-gray-500 rounded border border-white/5">ИМПОРТ</button>
               <input type="file" ref={logFileRef} onChange={(e) => {
                 const file = e.target.files?.[0];
                 if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => props.onImportLogs((ev.target?.result as string).split('\n').filter(l => l.trim()));
                    reader.readAsText(file);
                 }
               }} className="hidden" />
            </div>
            <div className="flex-1 min-h-0 p-3 font-mono overflow-y-auto bg-black/60 monitor-scroll scroll-smooth">
               {props.logs.map((l, i) => (
                 <div key={i} className="mb-1 truncate leading-none text-green-500/80 text-[11px] tracking-tighter border-l border-green-500/20 pl-2">
                   {l}
                 </div>
               ))}
               <div ref={logEndRef} className="h-4" />
            </div>
          </div>
        )}

        {activeView === MonitorView.TX && (
          <div className="flex-1 min-h-0 flex flex-col p-4 overflow-y-auto monitor-scroll bg-gray-950">
            <div className="space-y-3 pb-24">
              {props.savedTxMessages.map(msg => (
                <div key={msg.id_key} className="bg-gray-900 border border-white/5 rounded-2xl p-4 flex justify-between items-center shadow-xl relative overflow-hidden group">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600 opacity-50"></div>
                  <div className="min-w-0 flex-1" onClick={() => { setEditingTx(msg); setIsTxDialogOpen(true); }}>
                    <div className="text-[13px] font-black text-white truncate uppercase tracking-tight">{msg.name}</div>
                    <div className="text-[10px] font-mono mt-1.5 flex gap-3 text-gray-500">
                      <span className="text-red-500 font-bold">{msg.id}</span>
                      <span className="truncate">{msg.data}</span>
                      <span className="text-[8px] opacity-50 italic">{msg.period}ms</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => props.onDeleteSavedTx(msg.id_key)}
                      className="p-2 text-gray-700 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    <button 
                      onClick={() => props.onTogglePeriodicTx(msg)} 
                      className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all shadow-lg ${props.activeTxIds.has(msg.id_key) ? 'bg-red-600 animate-pulse text-white' : 'bg-blue-600 text-white active:scale-95'}`}
                    >
                      {props.activeTxIds.has(msg.id_key) ? 'STOP' : 'SEND'}
                    </button>
                  </div>
                </div>
              ))}
              {props.savedTxMessages.length === 0 && (
                <div className="text-center py-20 text-gray-700 text-[10px] uppercase font-black tracking-widest">
                  Нет сохраненных команд
                </div>
              )}
            </div>
            <button 
              onClick={() => { setEditingTx(null); setIsTxDialogOpen(true); }} 
              className="fixed bottom-24 right-6 w-14 h-14 bg-red-600 text-white rounded-full shadow-2xl shadow-red-900/50 flex items-center justify-center active:scale-90 transition-transform z-40 border-4 border-gray-950"
            >
               <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        )}

        {activeView === MonitorView.ComPort && (
          <div className="flex-1 flex flex-col overflow-hidden bg-gray-950">
            <div className="p-3 bg-gray-900 border-b border-white/5 shrink-0 shadow-lg z-10">
               <div className="flex justify-between items-center mb-3">
                 <h4 className="text-[9px] font-black text-gray-500 uppercase tracking-widest">System Console</h4>
                 <button onClick={() => { setEditingCom(null); setIsComDialogOpen(true); }} className="bg-red-600/10 text-red-500 px-3 py-1 rounded text-[8px] font-black uppercase border border-red-500/20">Add Macro</button>
               </div>
               <div className="grid grid-cols-3 gap-2 max-h-[160px] overflow-y-auto monitor-scroll pr-1">
                  {props.comButtons.map(btn => (
                    <button 
                      key={btn.id} 
                      onClick={() => props.onComButtonPress(btn)} 
                      className="h-12 bg-gray-800 border border-white/5 rounded-xl flex flex-col items-center justify-center active:bg-red-600 active:border-red-400 transition-all shadow-inner"
                    >
                      <span className="text-[10px] font-black text-white truncate w-full px-2 text-center">{btn.name}</span>
                      <span className="text-[7px] font-mono text-gray-500 uppercase">{btn.command}</span>
                    </button>
                  ))}
               </div>
            </div>
            <div className="p-3 bg-black/40 border-b border-white/5 shrink-0">
               <input 
                 type="text" 
                 placeholder="Введите команду (напр. V)..." 
                 className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-[13px] font-mono text-white focus:border-red-600 transition-all outline-none shadow-inner" 
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
                 <div key={i} className={`mb-1.5 leading-tight ${log.includes('TX →') ? 'text-blue-500' : 'text-green-500'}`}>
                   {log}
                 </div>
               ))}
               <div ref={comLogEndRef} className="h-2" />
            </div>
          </div>
        )}

        {activeView === MonitorView.Graph && <GraphView messages={props.messages} />}
        {activeView === MonitorView.Logic && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
             <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center border border-white/5 text-gray-700 animate-pulse">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
             </div>
             <p className="text-gray-600 text-[10px] font-black uppercase tracking-[0.2em]">Интеллектуальная логика находится в разработке</p>
          </div>
        )}
      </div>

      {/* FOOTER: СТРОГО ФИКСИРОВАН ВНИЗУ */}
      <div className="p-4 bg-gray-900 border-t border-white/5 shrink-0 z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
         <button 
           onClick={props.onDisconnect} 
           className="w-full py-4 bg-gray-800 hover:bg-red-900/40 text-gray-500 hover:text-red-500 font-black rounded-2xl text-[11px] uppercase tracking-[0.4em] transition-all active:scale-[0.98] border border-white/5"
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