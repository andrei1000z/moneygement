import { getDashboardContext } from "@/lib/dashboard";

function greeting(hours: number): string {
  if (hours < 5) return "Noapte bună";
  if (hours < 12) return "Bună dimineața";
  if (hours < 18) return "Bună ziua";
  if (hours < 22) return "Bună seara";
  return "Noapte bună";
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
  const hello = greeting(now.getHours());
  const displayName = ctx?.fullName ?? ctx?.user.email?.split("@")[0] ?? "";
  const initialsLetters = initials(ctx?.fullName ?? null, ctx?.user.email ?? null);

  return (
    <header className="border-border/60 bg-card flex items-center gap-3 rounded-xl border p-4">
      <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
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
