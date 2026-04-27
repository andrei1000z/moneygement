import Link from "next/link";
import { redirect } from "next/navigation";

import { acceptInviteAction } from "@/app/(dashboard)/settings/actions";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Params = Promise<{ token: string }>;

export default async function InvitePage({ params }: { params: Params }) {
  const { token } = await params;
  if (!token || !/^[a-f0-9]{32,}$/i.test(token)) {
    return <InvalidInvite />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Pre-load invitation pentru a afișa email-ul + householdul.
  const { data: invite } = await supabase
    .from("household_invites")
    .select(
      "id, household_id, invited_email, role, expires_at, accepted_at",
    )
    .eq("token", token)
    .maybeSingle();

  if (!invite) return <InvalidInvite />;
  if (invite.accepted_at) return <AlreadyUsed />;
  if (new Date(invite.expires_at) < new Date()) return <Expired />;

  const { data: household } = await supabase
    .from("households")
    .select("name")
    .eq("id", invite.household_id)
    .maybeSingle();

  // Dacă userul nu e logat — redirect la /login cu redirect post-auth.
  if (!user) {
    const next = `/invite/${encodeURIComponent(token)}`;
    redirect(`/login?next=${encodeURIComponent(next)}&hint=${encodeURIComponent(
      invite.invited_email,
    )}`);
  }

  // E logat: acceptăm și ducem la dashboard.
  const result = await acceptInviteAction(token);
  if (!result.ok) {
    return (
      <Shell title="Nu am putut accepta invitația">
        <p className="text-muted-foreground text-sm">{result.error}</p>
        <Button asChild className="mt-4">
          <Link href="/">Mergi la dashboard</Link>
        </Button>
      </Shell>
    );
  }

  return (
    <Shell title="Te-ai alăturat!">
      <p className="text-muted-foreground text-sm">
        Acum ai acces la <strong>{household?.name ?? "gospodărie"}</strong>{" "}
        ca {result.data.role}.
      </p>
      <Button asChild className="mt-4">
        <Link href="/">Deschide aplicația</Link>
      </Button>
    </Shell>
  );
}

function Shell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <div className="glass-strong w-full max-w-md rounded-[--radius-card] p-6 text-center">
        <h1 className="text-xl font-semibold">{title}</h1>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

function InvalidInvite() {
  return (
    <Shell title="Link invalid">
      <p className="text-muted-foreground text-sm">
        Acest link de invitație nu e valid sau a fost șters.
      </p>
      <Button asChild className="mt-4" variant="outline">
        <Link href="/login">Înapoi la login</Link>
      </Button>
    </Shell>
  );
}

function AlreadyUsed() {
  return (
    <Shell title="Invitația a fost deja folosită">
      <p className="text-muted-foreground text-sm">
        Dacă ești tu cel care a acceptat-o, autentifică-te normal.
      </p>
      <Button asChild className="mt-4">
        <Link href="/login">Login</Link>
      </Button>
    </Shell>
  );
}

function Expired() {
  return (
    <Shell title="Invitația a expirat">
      <p className="text-muted-foreground text-sm">
        Roagă-l pe cel care a invitat să trimită o invitație nouă.
      </p>
      <Button asChild className="mt-4" variant="outline">
        <Link href="/login">Înapoi</Link>
      </Button>
    </Shell>
  );
}
