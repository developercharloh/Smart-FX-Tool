let lastSignalId = null;
let apiBase = "";

self.addEventListener("message", (event) => {
  if (event.data?.type === "INIT") {
    apiBase = event.data.apiBase || "";
    lastSignalId = event.data.lastSignalId || null;
  }
});

async function checkForNewSignals() {
  try {
    const res = await fetch(`${apiBase}/api/signals`);
    if (!res.ok) return;
    const signals = await res.json();
    if (!signals.length) return;
    const latest = signals[0];
    if (lastSignalId === null) { lastSignalId = latest.id; return; }
    if (latest.id > lastSignalId) {
      lastSignalId = latest.id;
      const emoji = latest.signal === "BUY" ? "🟢" : "🔴";
      self.registration.showNotification(`${emoji} SmartFX Signal — ${latest.pair}`, {
        body: `${latest.signal} @ ${latest.entry} | TP ${latest.takeProfit} | SL ${latest.stopLoss}`,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: `signal-${latest.id}`,
        requireInteraction: false,
        data: { signalId: latest.id },
      });
    }
  } catch {}
}

self.addEventListener("install",  () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clients => {
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow("/");
    })
  );
});

setInterval(checkForNewSignals, 60_000);
