"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { CloudOff } from "lucide-react";
import { toast } from "sonner";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

export function ConnectionStatus() {
  const online = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const prev = useRef(online);

  useEffect(() => {
    if (prev.current === false && online === true) {
      toast.success("Conexiune restabilită", {
        description: "Modificările offline se sincronizează acum.",
      });
    }
    prev.current = online;
  }, [online]);

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-amber-500/10 text-amber-600 dark:text-amber-300 sticky top-0 z-50 flex items-center justify-center gap-2 px-3 py-1.5 text-xs"
    >
      <CloudOff className="size-3.5" aria-hidden />
      <span>Offline — modificările se vor sincroniza la reconectare.</span>
    </div>
  );
}
