import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppStep, CanMessage, CanSpeed, SavedTransmitMessage, CanRule, ComButton } from './types';
import SplashScreen from './components/SplashScreen';
import BluetoothConnection from './components/BluetoothConnection';
import CanMonitor from './components/CanMonitor';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.Splash);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [canSpeed, setCanSpeed] = useState<CanSpeed>('250');
  const [isCanOpen, setIsCanOpen] = useState(false);

  const messagesRef = useRef<Map<string, CanMessage>>(new Map());
  const logsRef = useRef<string[]>([]);
  const rulesRef = useRef<CanRule[]>([]);
  
  const [displayMessages, setDisplayMessages] = useState<CanMessage[]>([]);
  const [displayLogs, setDisplayLogs] = useState<string[]>([]);
  const [comLogs, setComLogs] = useState<string[]>([]);
  
  const [isLoggingActive, setIsLoggingActive] = useState(false);
  const [isLoggingPaused, setIsLoggingPaused] = useState(false);
  const isLoggingPausedRef = useRef(false);
  const isLoggingActiveRef = useRef(false);

  const [comButtons, setComButtons] = useState<ComButton[]>([
    { id: '1', name: 'VER', command: 'V', mode: 'text', repeatCount: 1, repeatPeriod: 0 },
    { id: '2', name: 'STAT', command: 'F', mode: 'text', repeatCount: 1, repeatPeriod: 0 },
    { id: '3', name: 'FLAG', command: 'W', mode: 'text', repeatCount: 1, repeatPeriod: 0 },
    { id: '4', name: 'HELP', command: '?', mode: 'text', repeatCount: 1, repeatPeriod: 0 },
    { id: '5', name: 'OPEN', command: 'O', mode: 'text', repeatCount: 1, repeatPeriod: 0 },
    { id: '6', name: 'CLS', command: 'C', mode: 'text', repeatCount: 1, repeatPeriod: 0 }
  ]);

  useEffect(() => {
    isLoggingPausedRef.current = isLoggingPaused;
    isLoggingActiveRef.current = isLoggingActive;
  }, [isLoggingPaused, isLoggingActive]);

  const [savedTxMessages, setSavedTxMessages] = useState<SavedTransmitMessage[]>([]);
  const [activeTxIds, setActiveTxIds] = useState<Set<string>>(new Set());

  const gattServerRef = useRef<any | null>(null);
  const rxCharRef = useRef<any | null>(null);
  const txCharRef = useRef<any | null>(null);
  const dataBufferRef = useRef<string>("");
  const txIntervalsRef = useRef<Map<string, number>>(new Map());
  const comIntervalsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const timer = setInterval(() => {
      if (step === AppStep.Monitor) {
        setDisplayMessages(Array.from(messagesRef.current.values()));
        setDisplayLogs([...logsRef.current]);
      }
    }, 150); 
    return () => clearInterval(timer);
  }, [step]);

  const addComLog = (msg: string, isIncoming: boolean) => {
    const time = new Date().toLocaleTimeString('ru-RU', { hour12: false });
    const entry = `[${time}] ${isIncoming ? 'RX ←' : 'TX →'} ${msg}`;
    setComLogs(prev => [...prev.slice(-49), entry]);
  };

  const sendLawicell = useCallback(async (cmd: string) => {
    if (!txCharRef.current) return;
    try {
      const data = new TextEncoder().encode(cmd + '\r');
      await txCharRef.current.writeValue(data);
      addComLog(cmd, false);
    } catch (err) {
      addComLog("ERR: " + cmd, false);
    }
  }, []);

  const handleComButtonPress = useCallback(async (btn: ComButton) => {
    if (btn.repeatCount > 1 && btn.repeatPeriod > 0) {
      let count = 0;
      const interval = window.setInterval(async () => {
        await sendLawicell(btn.command);
        count++;
        if (count >= btn.repeatCount) {
          window.clearInterval(interval);
          comIntervalsRef.current.delete(btn.id);
        }
      }, btn.repeatPeriod);
      comIntervalsRef.current.set(btn.id, interval);
    } else {
      await sendLawicell(btn.command);
    }
  }, [sendLawicell]);

  const parseLawicellFrame = (frame: string) => {
    if (!frame || frame.length < 4) {
      if (frame && frame.length > 0) addComLog(frame, true);
      return;
    }

    const type = frame[0];
    const isLawicellFrame = type === 't' || type === 'T' || type === 'r' || type === 'R';
    
    if (!isLawicellFrame) {
      addComLog(frame, true);
      return;
    }
    
    try {
      const isStandard = type === 't' || type === 'r';
      const idLen = isStandard ? 3 : 8;
      
      if (frame.length < 1 + idLen + 1) return;

      const id = frame.substring(1, 1 + idLen);
      const dlcChar = frame.substring(1 + idLen, 2 + idLen);
      const dlc = parseInt(dlcChar, 16);
      
      if (isNaN(dlc)) return;

      const rawData = frame.substring(2 + idLen, 2 + idLen + (dlc * 2));
      const dataFormatted = (rawData.match(/.{1,2}/g) || []).join(' ');

      if (isLoggingActiveRef.current && !isLoggingPausedRef.current) {
        const logMsg = `${id} ${dataFormatted}`;
        logsRef.current.push(logMsg);
        if (logsRef.current.length > 500) logsRef.current.shift();
      }

      rulesRef.current.forEach(rule => {
        if (rule.enabled && id === rule.triggerId) {
          if (!rule.triggerData || dataFormatted.includes(rule.triggerData)) {
            const rawActionData = rule.actionData.replace(/\s/g, '');
            const dlcAction = (rawActionData.length / 2).toString(16).toUpperCase();
            const cmd = `${rule.actionId.length <= 3 ? 't' : 'T'}${rule.actionId.padStart(rule.actionId.length <= 3 ? 3 : 8, '0')}${dlcAction}${rawActionData}`;
            sendLawicell(cmd);
          }
        }
      });

      const existing = messagesRef.current.get(id);
      messagesRef.current.set(id, {
        id,
        data: dataFormatted || "00",
        count: (existing?.count || 0) + 1,
        timestamp: Date.now(),
        isExtended: !isStandard
      });
    } catch (e) {
      console.warn("Parsing error:", e);
    }
  };

  const handleCharacteristicValueChange = (event: any) => {
    try {
      const value = event.target.value;
      if (!value) return;
      
      const chunk = new TextDecoder().decode(value);
      dataBufferRef.current += chunk;
      
      if (dataBufferRef.current.length > 8192) {
        dataBufferRef.current = dataBufferRef.current.slice(-2048);
      }
      
      if (dataBufferRef.current.includes('\r')) {
        const parts = dataBufferRef.current.split('\r');
        dataBufferRef.current = parts.pop() || "";
        parts.forEach(frame => {
          const trimmed = frame.trim();
          if (trimmed) parseLawicellFrame(trimmed);
        });
      }
    } catch (err) {
      console.error("BT Data handling error:", err);
    }
  };

  const handleDeviceConnect = async (device: any) => {
    setDeviceName(device.name || 'BT ADAPTER');
    setConnectionStatus('connecting');
    setStep(AppStep.Monitor);
    try {
      const server = await device.gatt?.connect();
      if (!server) throw new Error("GATT connection failed");
      gattServerRef.current = server;
      const services = await server.getPrimaryServices();
      
      for (const service of services) {
        const chars = await service.getCharacteristics();
        for (const c of chars) {
          if (c.properties.notify || c.properties.indicate) rxCharRef.current = c;
          if (c.properties.write || c.properties.writeWithoutResponse) txCharRef.current = c;
        }
      }

      if (rxCharRef.current) {
        await rxCharRef.current.startNotifications();
        rxCharRef.current.addEventListener('characteristicvaluechanged', handleCharacteristicValueChange);
      }
      setConnectionStatus('connected');
    } catch (err) {
      console.error(err);
      setConnectionStatus('disconnected');
    }
  };

  const handleDisconnect = () => {
    txIntervalsRef.current.forEach(i => window.clearInterval(i));
    comIntervalsRef.current.forEach(i => window.clearInterval(i));
    if (gattServerRef.current) gattServerRef.current.disconnect();
    setConnectionStatus('disconnected');
    setStep(AppStep.Bluetooth);
    messagesRef.current.clear();
    logsRef.current = [];
    setComLogs([]);
    dataBufferRef.current = "";
  };

  return (
    <div className="h-full w-full bg-gray-950 text-gray-100 flex flex-col overflow-hidden">
      {step === AppStep.Splash && <SplashScreen onNext={() => setStep(AppStep.Bluetooth)} />}
      {step === AppStep.Bluetooth && <BluetoothConnection onConnect={handleDeviceConnect} />}
      {step === AppStep.Monitor && (
        <CanMonitor 
          deviceName={deviceName || 'Unknown'} 
          connectionStatus={connectionStatus}
          speed={canSpeed}
          onSpeedChange={setCanSpeed}
          isCanOpen={isCanOpen}
          onToggleCan={async (open) => {
             if (open) {
                const sCmd = canSpeed === '125' ? 'S4' : canSpeed === '250' ? 'S5' : 'S6';
                await sendLawicell('C');
                await new Promise(r => setTimeout(r, 150));
                await sendLawicell(sCmd);
                await new Promise(r => setTimeout(r, 150));
                await sendLawicell('O');
                setIsCanOpen(true);
             } else {
                await sendLawicell('C');
                setIsCanOpen(false);
             }
          }}
          messages={displayMessages}
          onDisconnect={handleDisconnect}
          logs={displayLogs}
          comLogs={comLogs}
          onClearComLogs={() => setComLogs([])}
          comButtons={comButtons}
          onUpdateComButtons={setComButtons}
          onComButtonPress={handleComButtonPress}
          isLoggingActive={isLoggingActive}
          onToggleLogging={setIsLoggingActive}
          isLoggingPaused={isLoggingPaused}
          onToggleLogPause={() => setIsLoggingPaused(!isLoggingPaused)}
          onClearLogs={() => { logsRef.current = []; setDisplayLogs([]); }}
          onImportLogs={(newLogs) => { logsRef.current = newLogs; setDisplayLogs([...newLogs]); }}
          onSendCommand={sendLawicell}
          savedTxMessages={savedTxMessages}
          onSaveTxMessage={(msg) => {
            setSavedTxMessages(prev => {
              if (msg.id_key) return prev.map(m => m.id_key === msg.id_key ? { ...m, ...msg } as SavedTransmitMessage : m);
              return [...prev, { ...msg, id_key: Date.now().toString() } as SavedTransmitMessage];
            });
          }}
          onImportTxMessages={setSavedTxMessages}
          onDeleteSavedTx={(id) => setSavedTxMessages(prev => prev.filter(m => m.id_key !== id))}
          activeTxIds={activeTxIds}
          onTogglePeriodicTx={(msg) => {
            if (activeTxIds.has(msg.id_key)) {
              const interval = txIntervalsRef.current.get(msg.id_key);
              if (interval) window.clearInterval(interval);
              txIntervalsRef.current.delete(msg.id_key);
              setActiveTxIds(prev => { const n = new Set(prev); n.delete(msg.id_key); return n; });
            } else {
              const rawData = msg.data.replace(/\s/g, '');
              const cmd = `${msg.id.length <= 3 ? 't' : 'T'}${msg.id.padStart(msg.id.length <= 3 ? 3 : 8, '0')}${(rawData.length / 2).toString(16).toUpperCase()}${rawData}`;
              sendLawicell(cmd);
              const interval = window.setInterval(() => sendLawicell(cmd), msg.period);
              txIntervalsRef.current.set(msg.id_key, interval);
              setActiveTxIds(prev => new Set(prev).add(msg.id_key));
            }
          }}
          rules={rulesRef.current}
          onUpdateRules={(newRules) => { rulesRef.current = newRules; }}
        />
      )}
    </div>
  );
};

export default App;