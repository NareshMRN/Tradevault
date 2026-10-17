// TradeVault Firebase Cloud Messaging & Web Push Service Worker
/* eslint-disable no-restricted-globals */

self.addEventListener("install", function (event) {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", function (event) {
  if (event.data) {
    let payload;
    try {
      payload = event.data.json();
    } catch (e) {
      payload = { notification: { title: "TradeVault Market Alert", body: event.data.text() } };
    }

    const title =
      payload.notification?.title || payload.data?.title || "TradeVault Market Alert";
    const body =
      payload.notification?.body || payload.data?.body || "New market intelligence or order update.";
    const link = payload.data?.link || payload.fcmOptions?.link || "/notifications";

    const options = {
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      data: {
        link,
        ...payload.data,
      },
      vibrate: [200, 100, 200],
      requireInteraction: true,
      actions: [
        { action: "view", title: "View Details" },
        { action: "dismiss", title: "Dismiss" },
      ],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const link = event.notification.data?.link || "/notifications";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientList) {
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if ("focus" in client) {
            client.navigate(link);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(link);
        }
      })
  );
});
