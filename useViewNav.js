import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';

export function useViewNav(defaults = {}) {
  const [sp, setSP] = useSearchParams();

  const params = useMemo(() => {
    const result = { ...defaults };
    for (const [k, v] of sp.entries()) result[k] = v;
    return result;
  }, [sp, defaults]);

  const set = useCallback((obj) => {
    setSP(prev => {
      const next = new URLSearchParams(prev);
      Object.entries(obj).forEach(([k, v]) => {
        if (v == null || v === '') next.delete(k);
        else next.set(k, String(v));
      });
      return next;
    });
  }, [setSP]);

  const replace = useCallback((obj) => {
    setSP(prev => {
      const next = new URLSearchParams(prev);
      Object.entries(obj).forEach(([k, v]) => {
        if (v == null || v === '') next.delete(k);
        else next.set(k, String(v));
      });
      return next;
    }, { replace: true });
  }, [setSP]);

  return { params, set, replace };
}
