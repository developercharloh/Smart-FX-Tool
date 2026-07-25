import { useState, useEffect, useCallback } from "react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type PermissionState = "default" | "granted" | "denied" | "unsupported";

export function usePushNotifications() {
  const [permission, setPermission] = useState<PermissionState>(() => {
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission as PermissionState;
  });

  useEffect(() => {
    if (permission !== "granted") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").then(async (reg) => {
      await navigator.serviceWorker.ready;
      reg.active?.postMessage({
        type: "INIT",
        apiBase: API_BASE,
        lastSignalId: null,
      });
    }).catch(() => {});
  }, [permission]);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) { setPermission("unsupported"); return; }
    const result = await Notification.requestPermission();
    setPermission(result as PermissionState);
  }, []);

  return { permission, requestPermission };
}
