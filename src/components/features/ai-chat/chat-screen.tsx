"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ArrowUp, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Cât am cheltuit luna asta pe mâncare?",
  "Cât mai am de strâns pentru obiectivul de vacanță?",
  "Care e cea mai mare cheltuială din ultima săptămână?",
  "Dacă pun 500 lei lunar 5 ani la 6%, cât am la final?",
];

export function ChatScreen() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/ai/chat" }),
  });

  const isStreaming = status === "submitted" || status === "streaming";

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMessage({ text: trimmed });
    setInput("");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      {/* Mesaje */}
      <div className="glass-thin flex-1 overflow-y-auto rounded-[--radius-card] p-3">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Sparkles
              className="text-muted-foreground size-6"
              aria-hidden
            />
            <p className="text-muted-foreground text-sm">
              Pune o întrebare despre banii voștri.
            </p>
            <div className="grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="border-border/60 bg-background hover:bg-accent/40 rounded-lg border px-3 py-2 text-left text-xs"
                  disabled={isStreaming}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="space-y-3">
            {(messages as UIMessage[]).map((m) => (
              <li
                key={m.id}
                className={cn(
                  "flex",
                  m.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  {(m.parts ?? []).map((part, i) => {
                    if (part.type === "text")
                      return (
                        <p key={i} className="whitespace-pre-wrap">
                          {part.text}
                        </p>
                      );
                    if (
                      typeof part.type === "string" &&
                      part.type.startsWith("tool-")
                    )
                      return (
                        <p
                          key={i}
                          className="text-muted-foreground mt-1 italic text-xs"
                        >
                          • interoghez date…
                        </p>
                      );
                    return null;
                  })}
                </div>
              </li>
            ))}
            {isStreaming ? (
              <li className="flex justify-start">
                <div className="bg-muted text-muted-foreground flex items-center gap-2 rounded-2xl px-3 py-2 text-sm">
                  <Loader2 className="size-3 animate-spin" />
                  <span className="text-xs">scriu…</span>
                </div>
              </li>
            ) : null}
          </ul>
        )}
      </div>

      {error ? (
        <p className="text-red-500 text-xs">
          {error.message ?? "A apărut o eroare. Reîncearcă."}
        </p>
      ) : null}

      {/* Compose */}
      <form
        onSubmit={onSubmit}
        className="flex items-center gap-2"
      >
        <Input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Scrie o întrebare…"
          autoFocus
          disabled={isStreaming}
          className="flex-1"
        />
        <Button
          type="submit"
          size="icon"
          disabled={isStreaming || input.trim().length === 0}
          aria-label="Trimite"
        >
          {isStreaming ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ArrowUp className="size-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
