"use client";

import { useEffect, useState } from "react";
import { Download, Share, Smartphone, X } from "lucide-react";

import { Button } from "@/components/ui/button";

const SESSION_KEY = "banii-pwa-sessions";
const DISMISSED_KEY = "banii-pwa-install-dismissed";
const SHOW_AFTER_SESSIONS = 3;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone ===
      true
  );
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [showIosHint, setShowIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISSED_KEY) === "1") return;

    // Counter sesiuni: se incrementează o dată per montare.
    const sessions =
      Number.parseInt(localStorage.getItem(SESSION_KEY) ?? "0", 10) + 1;
    localStorage.setItem(SESSION_KEY, String(sessions));

    if (sessions < SHOW_AFTER_SESSIONS) return;

    function onBip(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", onBip);

    let timer: ReturnType<typeof setTimeout> | null = null;
    if (isIos()) {
      // Defer state updates to next tick pentru a evita cascading renders.
      timer = setTimeout(() => {
        setShowIosHint(true);
        setVisible(true);
      }, 0);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      if (timer !== null) clearTimeout(timer);
    };
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem(DISMISSED_KEY, "1");
    }
    setVisible(false);
    setDeferred(null);
  }

  if (!visible) return null;

  return (
    <div
      className="border-border/60 bg-card fixed inset-x-3 bottom-24 z-40 rounded-xl border p-3 shadow-lg md:bottom-6 md:left-auto md:right-6 md:max-w-sm"
      role="dialog"
      aria-label="Instalează aplicația"
    >
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
          {showIosHint ? (
            <Smartphone className="size-5" aria-hidden />
          ) : (
            <Download className="size-5" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Instalează Banii</p>
          {showIosHint ? (
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              Atinge{" "}
              <Share className="inline size-3 align-text-bottom" aria-hidden />{" "}
              <span className="font-medium">Share</span>, apoi{" "}
              <span className="font-medium">Adaugă la ecran principal</span>.
            </p>
          ) : (
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              Adaugă pe ecran pentru deschidere rapidă, offline și
              notificări.
            </p>
          )}
          {!showIosHint ? (
            <div className="mt-3 flex items-center gap-2">
              <Button size="sm" onClick={install}>
                Instalează
              </Button>
              <Button size="sm" variant="ghost" onClick={dismiss}>
                Mai târziu
              </Button>
            </div>
          ) : (
            <div className="mt-3">
              <Button size="sm" variant="ghost" onClick={dismiss}>
                Am înțeles
              </Button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Închide"
          className="text-muted-foreground hover:text-foreground -mt-1 -mr-1 p-1"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
