"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Panel, PanelCard } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  configured: boolean;
  imageId: string | null;
}

export const HetznerPanel = ({ configured, imageId }: Props) => {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [imageIdValue, setImageIdValue] = useState(imageId ?? "");
  const [pending, setPending] = useState(false);
  const [clearing, setClearing] = useState(false);

  const canSubmit =
    token.trim().length >= 20 && /^\d+$/.test(imageIdValue.trim());

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/account/hetzner", {
        body: JSON.stringify({
          imageId: imageIdValue.trim(),
          token: token.trim(),
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        throw new Error(json.error ?? "Could not save credentials");
      }
      setToken("");
      toast.success("Hetzner credentials saved");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save credentials"
      );
    } finally {
      setPending(false);
    }
  };

  const handleClear = async () => {
    if (!configured) {
      return;
    }
    setClearing(true);
    try {
      const res = await fetch("/api/account/hetzner", { method: "DELETE" });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Could not clear credentials");
      }
      setImageIdValue("");
      toast.success("Hetzner credentials cleared");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not clear credentials"
      );
    } finally {
      setClearing(false);
    }
  };

  return (
    <Panel title="Hetzner">
      <PanelCard
        as="form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 p-5"
      >
        <p className="text-muted-foreground text-sm">
          Provide a Hetzner Cloud API token (Read & Write) and the ID of your
          golden snapshot. Your token is encrypted at rest and never leaves the
          server.{" "}
          <a
            className="underline"
            href="https://docs.hetzner.cloud/#getting-started"
            target="_blank"
            rel="noreferrer"
          >
            How to create a token
          </a>
          .
        </p>
        <div className="space-y-2">
          <Label htmlFor="hetzner-token">
            API token{configured ? " (set new to replace)" : ""}
          </Label>
          <Input
            id="hetzner-token"
            name="token"
            type="password"
            autoComplete="off"
            placeholder={configured ? "••••••••••••••••" : "hcloud_…"}
            value={token}
            onChange={(event) => setToken(event.target.value)}
            required={!configured}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hetzner-image-id">Golden snapshot ID</Label>
          <Input
            id="hetzner-image-id"
            name="imageId"
            inputMode="numeric"
            placeholder="123456789"
            value={imageIdValue}
            onChange={(event) => setImageIdValue(event.target.value)}
            required
          />
        </div>
        <div className="flex justify-end gap-2">
          {configured ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={clearing || pending}
              onClick={handleClear}
            >
              {clearing ? "Clearing…" : "Clear"}
            </Button>
          ) : null}
          <Button type="submit" size="sm" disabled={!canSubmit || pending}>
            {pending ? "Verifying…" : "Save"}
          </Button>
        </div>
      </PanelCard>
    </Panel>
  );
};
