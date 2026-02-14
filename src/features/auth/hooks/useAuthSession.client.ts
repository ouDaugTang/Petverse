"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  getAuthClientAction,
  getCurrentSessionEmailAction,
  isAuthConfiguredAction,
  subscribeAuthStateAction,
  type BrowserAuthClient,
} from "@/features/auth/model";

type UseAuthSessionResult = {
  client: BrowserAuthClient | null;
  userEmail: string | null;
  authReady: boolean;
  isConfigured: boolean;
};

export function useAuthSession(onSessionChange?: () => void): UseAuthSessionResult {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const client = useMemo(() => getAuthClientAction(), []);
  const isConfigured = isAuthConfiguredAction();
  const onSessionChangeRef = useRef(onSessionChange);

  useEffect(() => {
    onSessionChangeRef.current = onSessionChange;
  }, [onSessionChange]);

  useEffect(() => {
    let isMounted = true;
    if (!client) {
      setAuthReady(true);
      return;
    }
    const activeClient = client;

    async function syncAuthUser() {
      const email = await getCurrentSessionEmailAction(activeClient);
      if (!isMounted) {
        return;
      }

      setUserEmail(email);
      setAuthReady(true);
    }

    void syncAuthUser();
    const unsubscribe = subscribeAuthStateAction(activeClient, (session) => {
      setUserEmail(session?.user?.email ?? null);
      setAuthReady(true);
      onSessionChangeRef.current?.();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [client]);

  return {
    client,
    userEmail,
    authReady,
    isConfigured,
  };
}
