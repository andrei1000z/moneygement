import { getDashboardContext } from "@/lib/dashboard";

function greeting(hours: number): string {
  if (hours < 5) return "Noapte bună";
  if (hours < 12) return "Bună dimineața";
  if (hours < 18) return "Bună ziua";
  if (hours < 22) return "Bună seara";
  return "Noapte bună";
}

function dayEmoji(hours: number): string {
  if (hours < 6) return "🌙";
  if (hours < 11) return "☀️";
  if (hours < 17) return "🌤️";
  if (hours < 21) return "🌇";
  return "🌙";
}

function initials(name: string | null, email: string | null): string {
  if (name) {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");
  }
  if (email) return email[0]?.toUpperCase() ?? "?";
  return "?";
}

export async function GreetingCard() {
  const ctx = await getDashboardContext();
  const now = new Date();
  const hours = now.getHours();
  const hello = greeting(hours);
  const emoji = dayEmoji(hours);
  const displayName = ctx?.fullName ?? ctx?.user.email?.split("@")[0] ?? "";
  const initialsLetters = initials(
    ctx?.fullName ?? null,
    ctx?.user.email ?? null,
  );

  return (
    <header className="glass-thin noise relative flex items-center gap-3 overflow-hidden rounded-[--radius-card] p-4">
      <div
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-[--accent-emerald]"
        style={{
          background: "oklch(from var(--accent-emerald) l c h / 0.18)",
          boxShadow:
            "inset 0 1px 0 oklch(1 0 0 / 0.08), 0 0 0 1px oklch(from var(--accent-emerald) l c h / 0.25)",
        }}
      >
        {initialsLetters}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-xs">
          {now.toLocaleDateString("ro-RO", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
        <h1 className="text-lg font-semibold tracking-tight md:text-xl">
          <span aria-hidden className="mr-1">
            {emoji}
          </span>
          {hello}
          {displayName ? `, ${capitalize(displayName)}` : ""}
        </h1>
      </div>
    </header>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
