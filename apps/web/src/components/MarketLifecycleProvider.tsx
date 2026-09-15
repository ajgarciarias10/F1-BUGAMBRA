import { createContext, useContext, type ReactNode } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useSplits } from "../hooks/useData";
import { useMarketLifecycle } from "../hooks/useMarketLifecycle";

const MarketLifecycleContext = createContext("");
export const useMarketLifecycleStatus = () => useContext(MarketLifecycleContext);

export function MarketLifecycleProvider({ children }: { children: ReactNode }) {
  const { userData } = useAuth();
  const { splits, loading } = useSplits();
  const isAdmin = userData?.rol === "admin" || ["ajgarciarias@gmail.com", "admin@f1bugambra.com"].includes(userData?.email?.toLowerCase() || "");
  const error = useMarketLifecycle(isAdmin && !loading, splits);
  return <MarketLifecycleContext.Provider value={error}>{children}</MarketLifecycleContext.Provider>;
}
