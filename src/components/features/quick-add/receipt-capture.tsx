"use client";

import { useRef, useState } from "react";
import { Camera, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

import type { ReceiptDraft } from "@/stores/quick-add-store";

type Props = {
  householdId: string | null;
  onResult: (draft: ReceiptDraft) => void;
};

export function ReceiptCapture({ householdId, onResult }: Props) {
  const [busy, setBusy] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | null | undefined) {
    if (!file) return;
    if (!householdId) {
      toast.error("Niciun household activ");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Doar imagini sunt acceptate");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const path = `${householdId}/${filename}`;
      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(path, file, { contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: signed, error: signError } = await supabase.storage
        .from("receipts")
        .createSignedUrl(path, 60 * 60);
      if (signError || !signed?.signedUrl) {
        throw signError ?? new Error("Nu am putut genera URL semnat");
      }

      const res = await fetch("/api/ai/parse-receipt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image_url: signed.signedUrl, storage_path: path }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as ReceiptDraft;
      onResult({ ...data, storage_path: path });
      toast.success("Bon scanat");
    } catch (err) {
      toast.error("Scanare eșuată", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex justify-center gap-2">
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => cameraRef.current?.click()}
        disabled={busy}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Camera className="size-4" aria-hidden />
        )}
        Scanează bon
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => galleryRef.current?.click()}
        disabled={busy}
      >
        <ImageIcon className="size-4" aria-hidden /> Din galerie
      </Button>
    </div>
  );
}
