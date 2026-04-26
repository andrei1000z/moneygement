"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, MicOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type VoiceParseResult = {
  amount: number | null; // minor units
  currency: string;
  merchant: string | null;
  category_id: string | null;
  date: string | null; // YYYY-MM-DD
  notes: string | null;
};

type Props = {
  onResult: (result: VoiceParseResult) => void;
};

type Status = "idle" | "listening" | "processing";

// Minimal types — Web Speech API nu e în lib.dom.
type AnyWindow = Window & {
  SpeechRecognition?: typeof SpeechRecognition;
  webkitSpeechRecognition?: typeof SpeechRecognition;
};

declare class SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type SpeechRecognitionEvent = Event & {
  results: ArrayLike<{
    isFinal: boolean;
    [index: number]: { transcript: string; confidence: number };
  }>;
};

export function VoiceInput({ onResult }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Detectează disponibilitatea API-ului.
  const supported =
    typeof window !== "undefined" &&
    !!(
      (window as AnyWindow).SpeechRecognition ||
      (window as AnyWindow).webkitSpeechRecognition
    );

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  function start() {
    if (!supported) {
      toast.error("Recunoaștere vocală neacceptată", {
        description:
          "Browser-ul tău nu are Web Speech API. Folosește Chrome / Safari.",
      });
      return;
    }
    const w = window as AnyWindow;
    const Ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition)!;
    const rec = new Ctor();
    rec.lang = "ro-RO";
    rec.continuous = false;
    rec.interimResults = true;

    rec.onresult = (event) => {
      let combined = "";
      for (let i = 0; i < event.results.length; i++) {
        combined += event.results[i]![0]!.transcript;
      }
      setTranscript(combined);
    };
    rec.onerror = () => {
      toast.error("Recunoașterea vocală a eșuat");
      setStatus("idle");
    };
    rec.onend = async () => {
      const text = transcript.trim();
      if (!text) {
        setStatus("idle");
        return;
      }
      setStatus("processing");
      try {
        const res = await fetch("/api/ai/parse-voice", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ transcript: text }),
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as VoiceParseResult;
        onResult(data);
        toast.success("Form pre-populat din voce");
      } catch (err) {
        toast.error("Nu am putut interpreta", {
          description: err instanceof Error ? err.message : String(err),
        });
      } finally {
        setStatus("idle");
      }
    };

    recognitionRef.current = rec;
    setTranscript("");
    setStatus("listening");
    try {
      rec.start();
    } catch {
      setStatus("idle");
    }
  }

  function stop() {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        type="button"
        size="lg"
        onClick={status === "listening" ? stop : start}
        disabled={status === "processing"}
        aria-label={status === "listening" ? "Oprește" : "Vorbește"}
        className={cn(
          "size-16 rounded-full",
          status === "listening" &&
            "bg-destructive hover:bg-destructive/90 animate-pulse",
        )}
      >
        {status === "processing" ? (
          <Loader2 className="size-6 animate-spin" aria-hidden />
        ) : status === "listening" ? (
          <MicOff className="size-6" aria-hidden />
        ) : (
          <Mic className="size-6" aria-hidden />
        )}
      </Button>
      {status === "listening" && transcript ? (
        <p className="text-muted-foreground max-w-xs text-center text-sm">
          „{transcript}”
        </p>
      ) : status === "listening" ? (
        <p className="text-muted-foreground text-xs">Spune ce ai cumpărat…</p>
      ) : status === "processing" ? (
        <p className="text-muted-foreground text-xs">Interpretează…</p>
      ) : (
        <p className="text-muted-foreground text-xs">
          {supported
            ? "Apasă și spune ce ai cumpărat"
            : "Browser-ul nu suportă voce"}
        </p>
      )}
    </div>
  );
}
