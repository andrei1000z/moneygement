"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

const ACTIONS_KEY = "banii-actions-count";
const DISMISSED_KEY = "banii-push-dismissed";
const ACTIONS_THRESHOLD = 5;

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buffer = new ArrayBuffer(raw.length);
  const arr = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isSupported(): boolean {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function PushPrompt() {
  const [visible, setVisible] = useState(false);
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (!vapidKey) return;
    if (!isSupported()) return;
    if (Notification.permission !== "default") return;
    if (localStorage.getItem(DISMISSED_KEY) === "1") return;

    // iOS necesită PWA installed pentru push.
    const ua = navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua);
    if (isIos && !isStandalone()) return;

    const actions = Number.parseInt(
      localStorage.getItem(ACTIONS_KEY) ?? "0",
      10,
    );
    if (actions < ACTIONS_THRESHOLD) return;

    const t = setTimeout(() => setVisible(true), 0);
    return () => clearTimeout(t);
  }, [vapidKey]);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  }

  async function subscribe() {
    if (!vapidKey) return;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        dismiss();
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const json = subscription.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        }),
      });
      if (!res.ok) throw new Error("subscribe_failed");
      toast.success("Notificări activate");
      setVisible(false);
    } catch {
      toast.error("Nu am putut activa notificările");
      dismiss();
    }
  }

  if (!visible) return null;

  return (
    <div
      className="border-border/60 bg-card fixed inset-x-3 bottom-24 z-40 rounded-xl border p-3 shadow-lg md:bottom-6 md:left-auto md:right-6 md:max-w-sm"
      role="dialog"
      aria-label="Activează notificările"
    >
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
          <Bell className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Activează notificările</p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            Pentru recap-ul săptămânal, alerte abonamente și balanțe joase.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={subscribe}>
              Activează
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>
              Mai târziu
            </Button>
          </div>
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

/**
 * Helper apelat dintr-un succes de tranzacție / quick-add pentru a
 * incrementa contorul de acțiuni — push prompt-ul apare după N
 * acțiuni.
 */
export function bumpActionCounter() {
  if (typeof window === "undefined") return;
  const current = Number.parseInt(
    localStorage.getItem(ACTIONS_KEY) ?? "0",
    10,
  );
  localStorage.setItem(ACTIONS_KEY, String(current + 1));
}
