"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  updateHousehold,
  updateProfile,
} from "@/app/(dashboard)/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  email: string;
  initial: {
    full_name: string | null;
    language: string | null;
    default_currency: string | null;
    household_name: string;
    base_currency: string;
  };
};

export function ProfilePanel({ email, initial }: Props) {
  const [pending, startTransition] = useTransition();
  const [fullName, setFullName] = useState(initial.full_name ?? "");
  const [language, setLanguage] = useState(initial.language ?? "ro");
  const [defaultCurrency, setDefaultCurrency] = useState(
    initial.default_currency ?? "RON",
  );
  const [householdName, setHouseholdName] = useState(initial.household_name);
  const [baseCurrency, setBaseCurrency] = useState(initial.base_currency);

  function saveProfile() {
    startTransition(async () => {
      const r = await updateProfile({
        full_name: fullName,
        language: language as "ro" | "en",
        default_currency: defaultCurrency,
      });
      if (!r.ok) toast.error("Salvare eșuată", { description: r.error });
      else toast.success("Profil actualizat");
    });
  }

  function saveHousehold() {
    startTransition(async () => {
      const r = await updateHousehold({
        name: householdName,
        base_currency: baseCurrency,
      });
      if (!r.ok) toast.error("Salvare eșuată", { description: r.error });
      else toast.success("Gospodărie actualizată");
    });
  }

  return (
    <div className="space-y-5">
      <section className="glass-thin rounded-(--radius-card) p-5">
        <h2 className="text-base font-semibold">Profil personal</h2>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Aceste informații apar în greeting și sunt folosite pentru
          formatare.
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <Label className="mb-1.5 block">Email</Label>
            <Input value={email} disabled className="bg-(--surface-tint-faint)" />
            <p className="text-muted-foreground mt-1 text-xs">
              Email-ul nu poate fi modificat.
            </p>
          </div>
          <div>
            <Label htmlFor="profile-name" className="mb-1.5 block">
              Nume complet
            </Label>
            <Input
              id="profile-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Andrei Popescu"
              maxLength={100}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="profile-lang" className="mb-1.5 block">
                Limbă
              </Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger id="profile-lang">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ro">Română</SelectItem>
                  <SelectItem value="en">Engleză</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="profile-currency" className="mb-1.5 block">
                Monedă implicită
              </Label>
              <Select
                value={defaultCurrency}
                onValueChange={setDefaultCurrency}
              >
                <SelectTrigger id="profile-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RON">RON (lei)</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            variant="eu"
            onClick={saveProfile}
            disabled={pending}
            className="w-full sm:w-auto"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden /> Salvez…
              </>
            ) : (
              "Salvează profilul"
            )}
          </Button>
        </div>
      </section>

      <section className="glass-thin rounded-(--radius-card) p-5">
        <h2 className="text-base font-semibold">Gospodărie</h2>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Numele și moneda de bază a gospodăriei tale.
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="household-name" className="mb-1.5 block">
              Nume gospodărie
            </Label>
            <Input
              id="household-name"
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
              placeholder="Casa Popescu"
              maxLength={80}
            />
          </div>
          <div>
            <Label htmlFor="household-currency" className="mb-1.5 block">
              Monedă de bază
            </Label>
            <Select value={baseCurrency} onValueChange={setBaseCurrency}>
              <SelectTrigger id="household-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RON">RON (lei)</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-muted-foreground mt-1 text-xs">
              Toate sumele se vor afișa convertite în această monedă pe
              dashboard.
            </p>
          </div>
          <Button
            variant="eu"
            onClick={saveHousehold}
            disabled={pending}
            className="w-full sm:w-auto"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden /> Salvez…
              </>
            ) : (
              "Salvează gospodărie"
            )}
          </Button>
        </div>
      </section>
    </div>
  );
}
