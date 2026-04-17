"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSelectedLayoutSegment } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { games } from "@/games";
import type { CatalogServerType } from "@/lib/hetzner/catalog";
import { ProvisioningStatus } from "./provisioning-status";
import { ReadyHeader } from "./ready-header";
import { ServerProvider, type ServerView } from "./server-context";

const PROVISIONING_PHASES = new Set([
  "queued",
  "provisioning",
  "booting",
  "agent_connected",
  "installing",
  "starting",
  "healthy",
  "errored",
]);

const TABS = [
  { label: "Connect", value: "connect" },
  { label: "Activity", value: "activity" },
  { label: "Console", value: "console" },
  { label: "Graphs", value: "graphs" },
  { label: "Backups", value: "backups" },
  { label: "Details", value: "details" },
  { label: "Settings", value: "settings" },
] as const;

interface Props {
  server: ServerView;
  eligibleTypes: CatalogServerType[];
  currency: string;
  children: ReactNode;
}

export const ServerShell = ({ server: initial, eligibleTypes, currency, children }: Props) => {
  const router = useRouter();
  const segment = useSelectedLayoutSegment();
  const activeTab =
    segment && TABS.some((tab) => tab.value === segment) ? segment : "connect";
  const [server, setServer] = useState(initial);
  const [pending, setPending] = useState<null | string>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(async () => {
      const res = await fetch(`/api/servers/${initial.id}`);
      if (!res.ok) {
        return;
      }
      const { server: fresh } = await res.json();
      if (fresh) {
        setServer((prev) => ({
          ...prev,
          backupsEnabled: fresh.backupsEnabled ?? prev.backupsEnabled,
          desiredState: fresh.desiredState,
          errorReason: fresh.errorReason ?? null,
          game: fresh.game,
          id: fresh.id,
          ipv4: fresh.ipv4,
          lastHeartbeatAt: fresh.agent?.lastHeartbeatAt ?? null,
          name: fresh.name,
          observedState: fresh.observedState,
          phase: fresh.phase,
          serverType: fresh.serverType ?? prev.serverType,
        }));
      }
    }, 5000);
    return () => clearInterval(t);
  }, [initial.id]);

  const sendCommand = async (type: "START" | "STOP" | "RESTART") => {
    setPending(type);
    const res = await fetch(`/api/servers/${server.id}/commands`, {
      body: JSON.stringify({ type }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    setPending(null);
    if (res.ok) {
      toast.success(`${type} queued`);
    } else {
      toast.error(`${type} failed`);
    }
  };

  const runDelete = async () => {
    setPending("DELETE");
    const res = await fetch(`/api/servers/${server.id}`, { method: "DELETE" });
    setPending(null);
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      toast.error("Delete failed");
    }
  };

  const updateServer = (patch: Partial<ServerView>) =>
    setServer((prev) => ({ ...prev, ...patch }));

  const isProvisioning = PROVISIONING_PHASES.has(server.phase);
  const game = games.find((g) => g.id === server.game);

  if (!game) {
    return null;
  }

  const deleteDialog = (
    <AlertDialog onOpenChange={setDeleteOpen} open={deleteOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this server?</AlertDialogTitle>
          <AlertDialogDescription>
            Your server and all its worlds, saves and settings will be permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={runDelete}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (isProvisioning) {
    return (
      <div className="grid gap-8">
        <div className="flex items-center gap-4">
          <Image
            alt={game.name}
            className="size-14 shrink-0 rounded-lg object-cover"
            placeholder="blur"
            src={game.image}
          />
          <div>
            <p className="font-medium text-2xl tracking-tight">{game.name}</p>
            <p className="text-muted-foreground text-sm">{game.description}</p>
          </div>
        </div>
        <ProvisioningStatus
          errored={server.phase === "errored" || server.observedState === "failed"}
          errorReason={server.errorReason}
          phase={server.phase}
        />
        <div className="flex justify-end">
          <Button
            disabled={Boolean(pending)}
            onClick={() => setDeleteOpen(true)}
            variant="destructive"
          >
            Delete
          </Button>
        </div>
        {deleteDialog}
      </div>
    );
  }

  return (
    <ServerProvider value={{ currency, eligibleTypes, server, updateServer }}>
      <div className="grid gap-8">
        <ReadyHeader
          game={server.game}
          ipv4={server.ipv4}
          name={server.name}
          observedState={server.observedState}
          onCommand={sendCommand}
          onDelete={() => setDeleteOpen(true)}
          pending={Boolean(pending)}
        />
        <Tabs value={activeTab}>
          <TabsList>
            {TABS.map((tab) => (
              <TabsTrigger asChild key={tab.value} value={tab.value}>
                <Link
                  href={
                    tab.value === "connect"
                      ? `/dashboard/${server.id}`
                      : `/dashboard/${server.id}/${tab.value}`
                  }
                >
                  {tab.label}
                </Link>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {children}
      </div>
      {deleteDialog}
    </ServerProvider>
  );
};
