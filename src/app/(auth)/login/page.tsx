"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Mail } from "lucide-react";
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
  const nextParam = searchParams.get("next");
  const hintParam = searchParams.get("hint");
  const [sent, setSent] = useState<string | null>(null);
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "" },
  });

  useEffect(() => {
    if (hintParam) form.setValue("email", hintParam);
  }, [hintParam, form]);

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
    <Card variant="glass" className="glow-blue">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-gradient-eu text-3xl font-semibold tracking-tight">
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
              className="mx-auto flex size-14 items-center justify-center rounded-full text-[--accent-blue]"
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
                variant="glow"
                size="lg"
                className="w-full"
                disabled={form.formState.isSubmitting}
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
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
