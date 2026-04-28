"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { startAuthentication } from "@simplewebauthn/browser";
import { Fingerprint, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Introdu adresa de email")
    .email("Adresă de email invalidă"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const nextParam = searchParams.get("next");
  const hintParam = searchParams.get("hint");
  const [sent, setSent] = useState<string | null>(null);
  const [passkeyPending, setPasskeyPending] = useState(false);
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "" },
  });

  useEffect(() => {
    if (hintParam) form.setValue("email", hintParam);
  }, [hintParam, form]);

  async function signInWithPasskey() {
    setPasskeyPending(true);
    try {
      const email = form.getValues("email").trim();
      const optsRes = await fetch("/api/auth/passkey/auth-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(email ? { email } : {}),
      });
      if (!optsRes.ok) throw new Error("Nu pot iniția autentificarea");
      const opts = await optsRes.json();

      const response = await startAuthentication({
        optionsJSON: opts,
      });

      const verifyRes = await fetch("/api/auth/passkey/auth-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response }),
      });
      if (!verifyRes.ok) {
        const err = await verifyRes.json().catch(() => ({}));
        throw new Error(err.error ?? "Verificare eșuată");
      }
      const verify = await verifyRes.json() as {
        token_hash: string;
        type: "magiclink";
      };

      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        token_hash: verify.token_hash,
        type: verify.type,
      });
      if (error) throw new Error(error.message);

      toast.success("Autentificat cu passkey");
      const safeNext =
        nextParam && /^\/[^\/].*$/.test(nextParam) && !nextParam.startsWith("//")
          ? nextParam
          : "/";
      router.replace(safeNext);
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Eroare neașteptată";
      if (!msg.toLowerCase().includes("not allowed") && !msg.toLowerCase().includes("aborted")) {
        toast.error("Login passkey eșuat", { description: msg });
      }
    } finally {
      setPasskeyPending(false);
    }
  }

  async function onSubmit({ email }: LoginValues) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      toast.error("Supabase nu este configurat încă", {
        description: "Completează NEXT_PUBLIC_SUPABASE_URL în .env.local",
      });
      return;
    }

    // Validăm `next` să fie path intern (nu URL extern, evită open-redirect).
    const safeNext =
      nextParam && /^\/[^\/].*$/.test(nextParam) && !nextParam.startsWith("//")
        ? nextParam
        : "/";

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/callback?next=${encodeURIComponent(safeNext)}`,
        shouldCreateUser: true,
      },
    });

    if (error) {
      toast.error("Nu am putut trimite link-ul", {
        description: error.message,
      });
      return;
    }

    setSent(email);
    toast.success("Link trimis", {
      description: `Verifică inbox-ul ${email} și deschide link-ul de pe acest dispozitiv.`,
    });
  }

  return (
    <Card variant="glass">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-3xl font-semibold tracking-tight text-(--accent-blue)">
          Bun venit la Banii
        </CardTitle>
        <CardDescription>
          Introdu emailul și îți trimitem un link magic. Fără parolă, fără
          social.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <div className="space-y-4 text-center">
            <div
              className="mx-auto flex size-14 items-center justify-center rounded-full text-(--accent-blue)"
              style={{
                background: "color-mix(in oklch, var(--accent-blue), transparent 85%)",
                boxShadow:
                  "inset 0 1px 0 oklch(1 0 0 / 0.1), 0 0 0 1px color-mix(in oklch, var(--accent-blue), transparent 75%), 0 0 32px -4px color-mix(in oklch, var(--accent-blue), transparent 60%)",
              }}
            >
              <Mail className="size-5" aria-hidden strokeWidth={1.75} />
            </div>
            <p className="text-sm">
              Am trimis un link la
              <br />
              <span className="font-medium">{sent}</span>
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setSent(null);
                form.reset();
              }}
            >
              Trimite alt link
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
              noValidate
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        placeholder="tu@example.ro"
                        autoFocus
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                variant="eu"
                size="lg"
                className="w-full"
                disabled={form.formState.isSubmitting || passkeyPending}
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Se trimite…
                  </>
                ) : (
                  "Trimite link"
                )}
              </Button>

              <div className="flex items-center gap-3 py-1">
                <div className="bg-(--glass-border) h-px flex-1" />
                <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.2em]">
                  sau
                </span>
                <div className="bg-(--glass-border) h-px flex-1" />
              </div>

              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                onClick={signInWithPasskey}
                disabled={passkeyPending || form.formState.isSubmitting}
              >
                {passkeyPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                    Se verifică…
                  </>
                ) : (
                  <>
                    <Fingerprint className="mr-2 size-4" aria-hidden />
                    Conectează cu passkey
                  </>
                )}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
