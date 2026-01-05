
import React, { useState } from 'react';
import { ComButton } from '../types';

interface Props {
  initialBtn: Omit<ComButton, 'id'>;
  onSave: (btn: Omit<ComButton, 'id'>) => void;
  onClose: () => void;
}

const ComButtonDialog: React.FC<Props> = ({ initialBtn, onSave, onClose }) => {
  const [name, setName] = useState(initialBtn.name);
  const [command, setCommand] = useState(initialBtn.command);
  const [mode, setMode] = useState<'text' | 'hex'>(initialBtn.mode);
  const [repeatCount, setRepeatCount] = useState(initialBtn.repeatCount);
  const [repeatPeriod, setRepeatPeriod] = useState(initialBtn.repeatPeriod);

  const handleSave = () => {
    if (!name || !command) {
      alert("Название и Команда обязательны");
      return;
    }
    onSave({ name, command, mode, repeatCount: Math.max(1, repeatCount), repeatPeriod: Math.max(0, repeatPeriod) });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl">
      <div className="w-full max-w-sm bg-gray-900 border border-white/10 rounded-2xl p-6 shadow-2xl border-t-white/10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black text-gray-100 uppercase tracking-tight">Настройка кнопки COM</h3>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[8px] font-black text-gray-600 uppercase block mb-1">Название кнопки</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-black border border-white/5 rounded-xl p-3 text-[12px] font-bold text-white focus:border-red-600 outline-none" placeholder="Напр: VERSION" />
          </div>

          <div>
            <label className="text-[8px] font-black text-gray-600 uppercase block mb-1">Команда (Lawicell)</label>
            <input type="text" value={command} onChange={e => setCommand(e.target.value)} className="w-full bg-black border border-white/5 rounded-xl p-3 text-[12px] font-mono text-red-500 focus:border-red-600 outline-none" placeholder="V" />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="text-[8px] font-black text-gray-600 uppercase block mb-1">Формат</label>
               <select value={mode} onChange={e => setMode(e.target.value as 'text' | 'hex')} className="w-full bg-black border border-white/5 rounded-xl p-3 text-[11px] text-white outline-none">
                 <option value="text">TEXT</option>
                 <option value="hex">HEX</option>
               </select>
             </div>
             <div>
               <label className="text-[8px] font-black text-gray-600 uppercase block mb-1">Повторов (раз)</label>
               <input type="number" value={repeatCount} onChange={e => setRepeatCount(parseInt(e.target.value) || 1)} className="w-full bg-black border border-white/5 rounded-xl p-3 text-[11px] font-mono text-white outline-none" />
             </div>
          </div>

          <div>
            <label className="text-[8px] font-black text-gray-600 uppercase block mb-1">Частота (мс)</label>
            <input type="number" value={repeatPeriod} onChange={e => setRepeatPeriod(parseInt(e.target.value) || 0)} className="w-full bg-black border border-white/5 rounded-xl p-3 text-[11px] font-mono text-white outline-none" placeholder="0 = без задержки" />
          </div>

          <button onClick={handleSave} className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95 border-t border-white/20 mt-4">
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComButtonDialog;
