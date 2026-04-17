"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { games } from "@/games";
import type { CatalogServerType } from "@/lib/hetzner/catalog";
import { ActivityStream } from "./activity-stream";
import { ConnectPanel } from "./connect-panel";
import { DetailsPanel } from "./details-panel";
import { GraphsPanel } from "./graphs-panel";
import { LogsStream } from "./logs-stream";
import { ProvisioningStatus } from "./provisioning-status";
import { ReadyHeader } from "./ready-header";
import { SettingsPanel } from "./settings-panel";

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

interface Specs {
  typeName: string;
  cores: number;
  memory: number;
  disk: number;
  cpuType: "shared" | "dedicated";
  architecture: "x86" | "arm";
}

interface Location {
  name: string;
  city: string | null;
  country: string | null;
}

interface ServerView {
  id: string;
  name: string;
  game: string;
  ipv4: string | null;
  phase: string;
  observedState: string;
  desiredState: string;
  errorReason: string | null;
  lastHeartbeatAt: string | null;
  serverType: string;
  backupsEnabled: boolean;
  specs: Specs | null;
  location: Location | null;
}

interface Props {
  server: ServerView;
  eligibleTypes: CatalogServerType[];
  currency: string;
}

export const ServerDetail = ({ server: initial, eligibleTypes, currency }: Props) => {
  const router = useRouter();
  const [server, setServer] = useState(initial);
  const [pending, setPending] = useState<null | string>(null);

  // Refresh server meta every 5s
  const ref = useRef(server);
  ref.current = server;
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

  const [deleteOpen, setDeleteOpen] = useState(false);

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

  const onDelete = () => setDeleteOpen(true);

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
          <AlertDialogDescription>This tears down the VM.</AlertDialogDescription>
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
            src={game.image}
            alt={game.name}
            className="size-14 shrink-0 rounded-lg object-cover"
            placeholder="blur"
          />
          <div>
            <p className="font-medium tracking-tight text-2xl">{game.name}</p>
            <p className="text-sm text-muted-foreground">{game.description}</p>
          </div>
        </div>
        <ProvisioningStatus
          phase={server.phase}
          errored={server.phase === "errored" || server.observedState === "failed"}
          errorReason={server.errorReason}
        />
        <div className="flex justify-end">
          <Button variant="destructive" onClick={onDelete} disabled={Boolean(pending)}>
            Delete
          </Button>
        </div>
        {deleteDialog}
      </div>
    );
  }

  return (
    <div className="grid gap-8">
      <ReadyHeader
        name={server.name}
        game={server.game}
        ipv4={server.ipv4}
        observedState={server.observedState}
        pending={Boolean(pending)}
        onCommand={sendCommand}
        onDelete={onDelete}
      />
      <Tabs defaultValue="connect">
        <TabsList>
          <TabsTrigger value="connect">Connect</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="console">Console</TabsTrigger>
          <TabsTrigger value="graphs">Graphs</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="connect">
          <ConnectPanel game={server.game} ipv4={server.ipv4} />
        </TabsContent>
        <TabsContent value="activity">
          <ActivityStream serverId={server.id} />
        </TabsContent>
        <TabsContent value="console">
          <LogsStream serverId={server.id} />
        </TabsContent>
        <TabsContent value="graphs">
          <GraphsPanel serverId={server.id} observedState={server.observedState} />
        </TabsContent>
        <TabsContent value="details">
          <DetailsPanel specs={server.specs} location={server.location} />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsPanel
            serverId={server.id}
            backupsEnabled={server.backupsEnabled}
            observedState={server.observedState}
            currentServerType={server.serverType}
            eligibleTypes={eligibleTypes}
            currency={currency}
            onChange={(patch) => setServer((prev) => ({ ...prev, ...patch }))}
          />
        </TabsContent>
      </Tabs>
      {deleteDialog}
    </div>
  );
};
