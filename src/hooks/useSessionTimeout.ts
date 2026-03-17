import { useEffect, useRef, useCallback, useState } from "react";

const STORAGE_KEY = "session_last_activity";
const CRITICAL_FLOW_KEY = "session_critical_flow";
const REMEMBER_ME_KEY = "session_remember_me";

const DEFAULT_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const REMEMBER_ME_TIMEOUT = 7 * 24 * 60 * 60 * 1000; // 7 days
const WARNING_BEFORE = 2 * 60 * 1000; // 2 minutes before expiry

const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart", "click"] as const;

interface UseSessionTimeoutOptions {
  onLogout: () => Promise<void>;
  enabled: boolean;
}

export function useSessionTimeout({ onLogout, enabled }: UseSessionTimeoutOptions) {
  const [showWarning, setShowWarning] = useState(false);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const isLoggingOut = useRef(false);

  const getTimeout = useCallback(() => {
    const rememberMe = localStorage.getItem(REMEMBER_ME_KEY) === "true";
    return rememberMe ? REMEMBER_ME_TIMEOUT : DEFAULT_TIMEOUT;
  }, []);

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
  }, []);

  const performLogout = useCallback(async () => {
    // Don't logout during critical flows
    if (localStorage.getItem(CRITICAL_FLOW_KEY) === "true") {
      // Retry in 30 seconds
      logoutTimerRef.current = setTimeout(() => performLogout(), 30_000);
      return;
    }
    if (isLoggingOut.current) return;
    isLoggingOut.current = true;
    setShowWarning(false);

    // Broadcast logout to other tabs
    localStorage.setItem("session_logout", Date.now().toString());

    try {
      await onLogout();
    } finally {
      isLoggingOut.current = false;
    }
  }, [onLogout]);

  const resetTimers = useCallback(() => {
    if (!enabled) return;
    clearTimers();
    setShowWarning(false);

    const timeout = getTimeout();
    const now = Date.now();
    localStorage.setItem(STORAGE_KEY, now.toString());

    // Warning timer
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
    }, timeout - WARNING_BEFORE);

    // Logout timer
    logoutTimerRef.current = setTimeout(() => {
      performLogout();
    }, timeout);
  }, [enabled, clearTimers, getTimeout, performLogout]);

  const stayLoggedIn = useCallback(() => {
    setShowWarning(false);
    resetTimers();
  }, [resetTimers]);

  const logoutNow = useCallback(() => {
    performLogout();
  }, [performLogout]);

  // Activity tracking
  useEffect(() => {
    if (!enabled) return;

    const handleActivity = () => {
      if (!showWarning) {
        resetTimers();
      }
    };

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, handleActivity, { passive: true })
    );

    resetTimers();

    return () => {
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, handleActivity)
      );
      clearTimers();
    };
  }, [enabled, showWarning, resetTimers, clearTimers]);

  // Multi-tab sync via storage events
  useEffect(() => {
    if (!enabled) return;

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "session_logout" && e.newValue) {
        // Another tab logged out
        isLoggingOut.current = true;
        setShowWarning(false);
        onLogout();
      }
      if (e.key === STORAGE_KEY && e.newValue) {
        // Another tab had activity — sync timers
        resetTimers();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [enabled, onLogout, resetTimers]);

  // Check on mount if session already expired
  useEffect(() => {
    if (!enabled) return;
    const lastActivity = localStorage.getItem(STORAGE_KEY);
    if (lastActivity) {
      const elapsed = Date.now() - parseInt(lastActivity, 10);
      if (elapsed >= getTimeout()) {
        performLogout();
      }
    }
  }, [enabled, getTimeout, performLogout]);

  return { showWarning, stayLoggedIn, logoutNow };
}

// Helpers for critical flows (booking/payment)
export function enterCriticalFlow() {
  localStorage.setItem(CRITICAL_FLOW_KEY, "true");
}
export function exitCriticalFlow() {
  localStorage.removeItem(CRITICAL_FLOW_KEY);
}

export function setRememberMe(value: boolean) {
  localStorage.setItem(REMEMBER_ME_KEY, value ? "true" : "false");
}
