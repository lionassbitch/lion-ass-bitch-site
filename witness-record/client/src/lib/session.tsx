import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, ApiError, type Config, type Me } from "./api";

interface SessionValue {
  me: Me | null;
  config: Config | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue>({ me: null, config: null, loading: true, refresh: async () => {}, signOut: async () => {} });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try {
      const cfg = await api<Config>("GET", "/api/config");
      setConfig(cfg);
    } catch {
      setConfig(null);
    }
    try {
      const probe = await api<{ authenticated: boolean }>("GET", "/api/session");
      if (!probe.authenticated) {
        setMe(null);
      } else {
        setMe(await api<Me>("GET", "/api/me"));
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setMe(null);
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const signOut = useCallback(async () => {
    await api("POST", "/api/auth/logout");
    setMe(null);
  }, []);
  const value = useMemo(() => ({ me, config, loading, refresh, signOut }), [me, config, loading, refresh, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}
