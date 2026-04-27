"use client";

import { useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { ro } from "date-fns/locale";
import { Copy, Loader2, Mail, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import {
  createInvite,
  revokeInvite,
} from "@/app/(dashboard)/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const inviteSchema = z.object({
  email: z.email(),
  role: z.enum(["admin", "member", "viewer"]),
});

type Member = {
  user_id: string;
  role: string;
  joined_at: string;
  full_name: string | null;
};

type Invite = {
  id: string;
  email: string;
  role: "admin" | "member" | "viewer";
  token: string;
  expires_at: string;
};

type Props = {
  currentUserId: string;
  members: Member[];
  invites: Invite[];
  canInvite: boolean;
};

export function HouseholdMembersPanel({
  currentUserId,
  members,
  invites,
  canInvite,
}: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member" | "viewer">("member");
  const [pending, start] = useTransition();
  const [createdLink, setCreatedLink] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = inviteSchema.safeParse({ email, role });
    if (!parsed.success) {
      toast.error("Verifică email-ul");
      return;
    }
    start(async () => {
      const res = await createInvite(parsed.data);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const url =
        typeof window !== "undefined" && res.data.invite_url.startsWith("/")
          ? `${window.location.origin}${res.data.invite_url}`
          : res.data.invite_url;
      setCreatedLink(url);
      setEmail("");
      toast.success(`Invitație trimisă către ${res.data.invited_email}.`);
    });
  }

  function copyLink(url: string) {
    navigator.clipboard.writeText(url).then(
      () => toast.success("Link copiat"),
      () => toast.error("Nu am putut copia"),
    );
  }

  function revoke(id: string) {
    if (!window.confirm("Sigur revoci invitația?")) return;
    start(async () => {
      const res = await revokeInvite(id);
      if (!res.ok) toast.error(res.error);
      else toast.success("Invitație revocată");
    });
  }

  return (
    <div className="space-y-6">
      {/* Membri actuali */}
      <section className="glass-thin rounded-(--radius-card)">
        <h2 className="border-b px-4 py-3 text-sm font-semibold">
          Membri ({members.length})
        </h2>
        <ul className="divide-y">
          {members.map((m) => (
            <li
              key={m.user_id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium">
                  {m.full_name ?? "Utilizator"}
                  {m.user_id === currentUserId ? (
                    <span className="text-muted-foreground ml-2 text-xs">
                      (tu)
                    </span>
                  ) : null}
                </p>
                <p className="text-muted-foreground text-xs">
                  {format(parseISO(m.joined_at), "d MMM yyyy", { locale: ro })}
                </p>
              </div>
              <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs uppercase tracking-wider">
                {m.role}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Form invitație */}
      {canInvite ? (
        <section className="glass-thin rounded-(--radius-card)">
          <h2 className="border-b px-4 py-3 text-sm font-semibold">
            Invită un membru
          </h2>
          <form
            onSubmit={submit}
            className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <label className="text-muted-foreground mb-1 block text-xs uppercase tracking-wider">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="mama@exemplu.ro"
                required
                disabled={pending}
              />
            </div>
            <div className="sm:w-40">
              <label className="text-muted-foreground mb-1 block text-xs uppercase tracking-wider">
                Rol
              </label>
              <Select
                value={role}
                onValueChange={(v) =>
                  setRole(v as "admin" | "member" | "viewer")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Membru</SelectItem>
                  <SelectItem value="viewer">Vizualizare</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 size-4" />
              )}
              Invită
            </Button>
          </form>
          {createdLink ? (
            <div className="border-t px-4 py-3">
              <p className="text-muted-foreground mb-2 text-xs">
                Trimite acest link la persoana invitată:
              </p>
              <div className="flex items-center gap-2">
                <code className="bg-muted text-muted-foreground flex-1 truncate rounded px-2 py-1.5 text-[11px]">
                  {createdLink}
                </code>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => copyLink(createdLink)}
                >
                  <Copy className="mr-1.5 size-3.5" />
                  Copiază
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  asChild
                >
                  <a
                    href={`mailto:?subject=${encodeURIComponent(
                      "Invitație Banii",
                    )}&body=${encodeURIComponent(
                      `Salut! Te invit să te alături în Banii: ${createdLink}`,
                    )}`}
                  >
                    <Mail className="mr-1.5 size-3.5" /> Email
                  </a>
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Invitații pending */}
      {invites.length > 0 ? (
        <section className="glass-thin rounded-(--radius-card)">
          <h2 className="border-b px-4 py-3 text-sm font-semibold">
            Invitații în așteptare ({invites.length})
          </h2>
          <ul className="divide-y">
            {invites.map((i) => {
              const url =
                typeof window !== "undefined"
                  ? `${window.location.origin}/invite/${i.token}`
                  : `/invite/${i.token}`;
              return (
                <li
                  key={i.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{i.email}</p>
                    <p className="text-muted-foreground text-xs">
                      {i.role} · expiră{" "}
                      {format(parseISO(i.expires_at), "d MMM", {
                        locale: ro,
                      })}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => copyLink(url)}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                  {canInvite ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => revoke(i.id)}
                      disabled={pending}
                      aria-label="Revocă invitația"
                    >
                      <Trash2 className="text-muted-foreground size-3.5" />
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
