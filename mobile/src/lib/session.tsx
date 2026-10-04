import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ActivityIndicator, View } from "react-native";
import { api, onSessionLost } from "./api";
import type { User } from "./api-client";

const SessionContext = createContext<{
  user: User | null;
  ready: boolean;
  error: string;
  setUser: (user: User | null) => void;
  retry: () => void;
}>({ user: null, ready: false, error: "", setUser: () => {}, retry: () => {} });
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    onSessionLost(() => {
      if (active) setUser(null);
    });
    api
      .restore()
      .then((u) => {
        if (active) {
          setUser(u);
          setError("");
        }
      })
      .catch((e: Error) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
      onSessionLost(() => {});
    };
  }, [attempt]);
  return (
    <SessionContext.Provider
      value={{
        user,
        setUser,
        ready,
        error,
        retry: () => {
          setReady(false);
          setAttempt((n) => n + 1);
        },
      }}
    >
      {ready ? (
        children
      ) : (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator accessibilityLabel="Đang khôi phục phiên" />
        </View>
      )}
    </SessionContext.Provider>
  );
}
export const useSession = () => useContext(SessionContext);
