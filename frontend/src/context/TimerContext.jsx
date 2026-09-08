import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';
const TimerContext = createContext(null);
export function TimerProvider({ children }) {
  const { user } = useAuth();
  const [activeEntry, setActiveEntry] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);
  const clearTick = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };
  const startTick = (startTime) => {
    clearTick();
    const startMs = new Date(startTime).getTime();
    const tick = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));
    tick();
    intervalRef.current = setInterval(tick, 1000);
  };
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return () => {};
    }
    setLoading(true);
    api
      .get('/time-entries/active')
      .then((res) => {
        if (res.data) {
          setActiveEntry(res.data);
          startTick(res.data.startTime);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => clearTick();
  }, [user?._id]);
  const startTimer = useCallback(async (taskId, note) => {
    const res = await api.post('/time-entries/start', {
      taskId,
      note,
    });
    setActiveEntry(res.data);
    startTick(res.data.startTime);
    return res.data;
  }, []);
  const stopTimer = useCallback(async () => {
    if (!activeEntry) return null;
    const res = await api.patch(`/time-entries/${activeEntry._id}/stop`);
    clearTick();
    setActiveEntry(null);
    setElapsedSeconds(0);
    return res.data;
  }, [activeEntry]);
  return (
    <TimerContext.Provider
      value={{
        activeEntry,
        elapsedSeconds,
        loading,
        startTimer,
        stopTimer,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}
export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used within a TimerProvider');
  return ctx;
}
