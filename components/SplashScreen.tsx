import React from 'react';

interface Props {
  onNext: () => void;
}

const SplashScreen: React.FC<Props> = ({ onNext }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-between p-6 bg-gray-900 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-600/10 rounded-full blur-[120px]"></div>
      
      <div className="h-20"></div>

      <div className="text-center z-10 flex flex-col items-center">
        <h1 className="text-6xl font-black tracking-tighter text-red-600 animate-pulse drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]">
          ETM module <span className="text-3xl block mt-2 opacity-80">v3.1.1.26</span>
        </h1>
        <div className="mt-4 flex flex-col items-center">
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-red-900 to-transparent mb-2"></div>
          <p className="text-gray-500 font-mono tracking-[0.3em] text-xs uppercase">
            CAN Interface Systems
          </p>
        </div>
      </div>

      <div className="w-full flex justify-end items-end z-10 pb-12 pr-4">
        <button
          onClick={onNext}
          className="w-40 py-4 px-4 bg-gradient-to-b from-green-600 to-green-800 hover:from-green-500 hover:to-green-700 text-white font-black rounded-2xl shadow-[0_10px_30px_rgba(34,197,94,0.4)] border-t border-white/20 transition-all active:scale-95 text-xs uppercase tracking-[0.2em]"
        >
          ПОЕХАЛИ
        </button>
      </div>
    </div>
  );
};

export default SplashScreen;