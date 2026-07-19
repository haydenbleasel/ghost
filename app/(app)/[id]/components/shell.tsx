"use client";
import {
  MoonIcon,
  MoreHorizontalIcon,
  PlayIcon,
  RotateCcwIcon,
  SquareIcon,
  SunIcon,
  Trash2Icon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSelectedLayoutSegment } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { games } from "@/games";
import type { CatalogServerType } from "@/lib/providers/types";
import { cn } from "@/lib/utils";

import { PageBody, PageHeader } from "../../components/page-header";
import { runServerCommand } from "../actions/commands";
import { deleteServer } from "../actions/delete";
import { hibernate } from "../actions/hibernate";
import { wake } from "../actions/wake";
import { ProvisioningStatus } from "./provisioning-status";
import { ServerProvider } from "./server-context";
import type { ServerView } from "./server-context";

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
  { label: "Files", value: "files" },
  { label: "Details", value: "details" },
  { label: "Settings", value: "settings" },
] as const;

interface Props {
  server: ServerView;
  eligibleTypes: CatalogServerType[];
  currency: string;
  children: ReactNode;
}

const stateBadgeClass = (state: string, deleting: boolean): string => {
  if (deleting || state === "failed" || state === "lost") {
    return "";
  }
  if (state === "running") {
    return "border-emerald-600 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400";
  }
  return "";
};

const stateBadgeVariant = (
  state: string,
  deleting: boolean
): "default" | "secondary" | "destructive" | "outline" => {
  if (deleting || state === "failed" || state === "lost") {
    return "destructive";
  }
  if (state === "unhealthy") {
    return "secondary";
  }
  return "outline";
};

export const ServerShell = ({
  server: initial,
  eligibleTypes,
  currency,
  children,
}: Props) => {
  const router = useRouter();
  const segment = useSelectedLayoutSegment();
  const activeTab =
    segment && TABS.some((tab) => tab.value === segment) ? segment : "connect";
  const [server, setServer] = useState(initial);
  const [pending, setPending] = useState<null | string>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [hibernateOpen, setHibernateOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(async () => {
      let res: Response;
      try {
        res = await fetch(`/api/servers/${initial.id}`);
      } catch {
        // Transient network failure; try again on the next tick.
        return;
      }
      if (res.status === 401) {
        // Session expired mid-visit — the API is unusable until re-auth.
        router.push("/sign-in");
        return;
      }
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
          hibernationImageId: fresh.hibernationImageId ?? null,
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
  }, [initial.id, router]);

  const sendCommand = async (type: "START" | "STOP" | "RESTART") => {
    setPending(type);
    const result = await runServerCommand({ serverId: server.id, type });
    setPending(null);
    if (result.ok) {
      toast.success(`${type} queued`);
    } else {
      toast.error(result.error);
    }
  };

  const runDelete = async () => {
    setPending("DELETE");
    const result = await deleteServer({ serverId: server.id });
    setPending(null);
    if (result.ok) {
      router.push("/");
    } else {
      toast.error(result.error);
    }
  };

  const runHibernate = async () => {
    setPending("HIBERNATE");
    try {
      const result = await hibernate({ serverId: server.id });
      if (result.ok) {
        toast.success("Hibernating server");
        setHibernateOpen(false);
      } else {
        toast.error(result.error);
      }
    } finally {
      setPending(null);
    }
  };

  const runWake = async () => {
    setPending("WAKE");
    try {
      const result = await wake({ serverId: server.id });
      if (result.ok) {
        toast.success("Waking server");
      } else {
        toast.error(result.error);
      }
    } finally {
      setPending(null);
    }
  };

  const updateServer = (patch: Partial<ServerView>) =>
    setServer((prev) => ({ ...prev, ...patch }));

  const isProvisioning = PROVISIONING_PHASES.has(server.phase);
  const game = games.find((g) => g.id === server.game);

  if (!game) {
    return null;
  }

  const deleting = server.desiredState === "deleted";
  // "failed" is wake-able (or hibernate-able) again so a timed-out attempt
  // isn't a dead end; which retry applies depends on which transition failed.
  const canWake =
    server.hibernationImageId !== null &&
    (server.observedState === "hibernated" ||
      (server.observedState === "failed" && server.desiredState === "running"));
  const canHibernate =
    server.observedState === "running" ||
    server.observedState === "stopped" ||
    (server.observedState === "failed" && server.desiredState === "hibernated");
  const statusLabel = deleting ? "deleting" : server.observedState;

  const meta = (
    <Badge
      className={cn(
        "capitalize",
        stateBadgeClass(server.observedState, deleting)
      )}
      variant={stateBadgeVariant(server.observedState, deleting)}
    >
      {statusLabel}
    </Badge>
  );

  const actions = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label="Server actions" size="icon" variant="ghost">
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          disabled={pending !== null || server.observedState !== "stopped"}
          onSelect={() => sendCommand("START")}
        >
          <PlayIcon />
          Start
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={pending !== null || server.observedState !== "running"}
          onSelect={() => sendCommand("STOP")}
        >
          <SquareIcon />
          Stop
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={pending !== null || server.observedState !== "running"}
          onSelect={() => sendCommand("RESTART")}
        >
          <RotateCcwIcon />
          Restart
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {canWake ? (
          <DropdownMenuItem disabled={pending !== null} onSelect={runWake}>
            <SunIcon />
            Wake
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            disabled={pending !== null || !canHibernate}
            onSelect={() => setHibernateOpen(true)}
          >
            <MoonIcon />
            Hibernate
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={pending !== null || deleting}
          onSelect={() => setDeleteOpen(true)}
          variant="destructive"
        >
          <Trash2Icon />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const deleteDialog = (
    <AlertDialog onOpenChange={setDeleteOpen} open={deleteOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this server?</AlertDialogTitle>
          <AlertDialogDescription>
            Your server and all its worlds, saves and settings will be
            permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={runDelete}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const hibernateDialog = (
    <AlertDialog onOpenChange={setHibernateOpen} open={hibernateOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hibernate this server?</AlertDialogTitle>
          <AlertDialogDescription>
            We&apos;ll snapshot the disk and release the VM to stop Hetzner
            charges. Restoring takes a few minutes, and the public IP will
            change on wake.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={runHibernate}>
            Hibernate
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const gameIcon = (
    <Image
      alt={game.name}
      className="size-10 rounded-lg object-cover"
      height={40}
      src={game.image}
      width={40}
    />
  );

  if (isProvisioning) {
    return (
      <>
        <PageHeader
          actions={actions}
          icon={gameIcon}
          meta={meta}
          title={server.name}
        />
        <PageBody>
          <ProvisioningStatus
            errored={
              server.phase === "errored" || server.observedState === "failed"
            }
            errorReason={server.errorReason}
            phase={server.phase}
          />
        </PageBody>
        {deleteDialog}
        {hibernateDialog}
      </>
    );
  }

  return (
    <ServerProvider value={{ currency, eligibleTypes, server, updateServer }}>
      <PageHeader
        actions={actions}
        flush
        icon={gameIcon}
        meta={meta}
        title={server.name}
      >
        <Tabs
          className="[&_[data-slot=tabs-trigger]]:flex-none"
          value={activeTab}
        >
          <TabsList variant="line">
            {TABS.map((tab) => (
              <TabsTrigger asChild key={tab.value} value={tab.value}>
                <Link
                  href={
                    tab.value === "connect"
                      ? `/${server.id}`
                      : `/${server.id}/${tab.value}`
                  }
                >
                  {tab.label}
                </Link>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </PageHeader>
      <PageBody flush={activeTab === "console"} wide={activeTab === "console"}>
        {children}
      </PageBody>
      {deleteDialog}
      {hibernateDialog}
    </ServerProvider>
  );
};
