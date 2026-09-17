import { useEffect, useState } from "react";
export function OfflineStatus() {
  const [ready, setReady] = useState(false);
  const [refresh, setRefresh] = useState<null | (() => void)>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (
      !__WEB_BUILD__ ||
      !import.meta.env.PROD ||
      !("serviceWorker" in navigator)
    )
      return;
    let active = true;
    void import("virtual:pwa-register")
      .then(({ registerSW }) => {
        if (!active) return;
        const update = registerSW({
          onRegisteredSW: (_url, registration) => {
            if (
              active &&
              registration?.active?.state === "activated" &&
              navigator.serviceWorker.controller
            )
              setReady(true);
          },
          onOfflineReady: () => {
            if (active) setReady(true);
          },
          onNeedRefresh: () => {
            if (active) setRefresh(() => () => void update(true));
          },
          onRegisterError: () => {
            if (active) setError(true);
          },
        });
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);
  if (refresh)
    return (
      <div className="offline-status" role="status">
        A new version is ready.{" "}
        <button onClick={refresh}>Update application</button>
      </div>
    );
  if (error)
    return (
      <p className="offline-status">
        Offline caching is unavailable in this browser. You can keep using the
        planner online.
      </p>
    );
  return ready ? (
    <p className="offline-status" role="status">
      Ready for offline use · use your browser’s Install app / Add to Home
      Screen option to keep it handy.
    </p>
  ) : null;
}
