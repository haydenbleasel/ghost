"use client";
import { CameraIcon, MoreHorizontalIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Panel, PanelCard } from "@/components/panel";

interface Image {
  id: number;
  type: "snapshot" | "backup" | "system" | "app";
  status: "available" | "creating" | "unavailable";
  description: string;
  created: string;
  imageSize: number | null;
  diskSize: number;
  protection: boolean;
}

interface Props {
  serverId: string;
  backupsEnabled: boolean;
  onBackupsChange: (enabled: boolean) => void;
}

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleString([], {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatSize = (gb: number | null): string => {
  if (gb === null) {
    return "—";
  }
  if (gb < 1) {
    return `${(gb * 1024).toFixed(0)} MB`;
  }
  return `${gb.toFixed(1)} GB`;
};

interface RowProps {
  image: Image;
  onRestore: () => void;
  onDelete: () => void;
}

const BackupRow = ({ image, onRestore, onDelete }: RowProps) => {
  const isManual = image.type === "snapshot";
  const isReady = image.status === "available";

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg px-3 py-2">
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="capitalize">
            {isManual ? "Manual" : "Automatic"}
          </Badge>
          <span className="truncate text-sm font-medium">{image.description || "Backup"}</span>
          {!isReady && (
            <Badge variant="secondary" className="capitalize">
              {image.status}
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {formatDate(image.created)} · {formatSize(image.imageSize)}
        </span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Backup actions">
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onRestore} disabled={!isReady}>
            <RotateCcwIcon />
            Restore
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={onDelete} disabled={image.protection}>
            <Trash2Icon />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

interface ListProps {
  images: Image[] | null;
  loadError: string | null;
  onRestore: (image: Image) => void;
  onDelete: (image: Image) => void;
}

const renderImageList = ({ images, loadError, onRestore, onDelete }: ListProps) => {
  if (loadError) {
    return <div className="px-3 py-4 text-destructive text-sm">{loadError}</div>;
  }
  if (images === null) {
    return <div className="px-3 py-4 text-muted-foreground text-sm">Loading…</div>;
  }
  if (images.length === 0) {
    return (
      <div className="px-3 py-4 text-muted-foreground text-sm">
        No backups yet. Enable automatic backups or create one manually.
      </div>
    );
  }
  return images.map((image) => (
    <BackupRow
      key={image.id}
      image={image}
      onDelete={() => onDelete(image)}
      onRestore={() => onRestore(image)}
    />
  ));
};

export const BackupsPanel = ({ serverId, backupsEnabled, onBackupsChange }: Props) => {
  const [images, setImages] = useState<Image[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDescription, setCreateDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<Image | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Image | null>(null);
  const [actionPending, setActionPending] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/servers/${serverId}/backups`);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setLoadError(body.error ?? "Could not load backups");
      return;
    }
    const body = (await res.json()) as { images: Image[] };
    setImages(body.images);
    setLoadError(null);
  }, [serverId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const hasCreating = images?.some((i) => i.status === "creating");
    if (!hasCreating) {
      return;
    }
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [images, load]);

  const toggleBackups = async (enabled: boolean) => {
    setToggling(true);
    try {
      const res = await fetch(`/api/servers/${serverId}/backups`, {
        body: JSON.stringify({ enabled }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Could not update backups");
      }
      onBackupsChange(enabled);
      toast.success(enabled ? "Automatic backups enabled" : "Automatic backups disabled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update backups");
    } finally {
      setToggling(false);
    }
  };

  const submitCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch(`/api/servers/${serverId}/backups`, {
        body: JSON.stringify({ description: createDescription.trim() || undefined }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Could not create backup");
      }
      toast.success("Backup started");
      setCreateOpen(false);
      setCreateDescription("");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create backup");
    } finally {
      setCreating(false);
    }
  };

  const runRestore = async () => {
    if (!restoreTarget) {
      return;
    }
    setActionPending(true);
    try {
      const res = await fetch(`/api/servers/${serverId}/backups/${restoreTarget.id}/restore`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Restore failed");
      }
      toast.success("Restore started — the server will reboot");
      setRestoreTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Restore failed");
    } finally {
      setActionPending(false);
    }
  };

  const runDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    setActionPending(true);
    try {
      const res = await fetch(`/api/servers/${serverId}/backups/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Delete failed");
      }
      toast.success("Backup deleted");
      setDeleteTarget(null);
      setImages((prev) => prev?.filter((i) => i.id !== deleteTarget.id) ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setActionPending(false);
    }
  };

  return (
    <>
      <Panel
        title="Automatic backups"
        action={
          <Switch
            checked={backupsEnabled}
            disabled={toggling}
            onCheckedChange={toggleBackups}
            aria-label="Enable automatic backups"
          />
        }
      >
        <PanelCard className="px-4 py-3 text-sm text-muted-foreground">
          Daily snapshots taken by Hetzner, retained for 7 days.
        </PanelCard>
      </Panel>

      <Panel
        title="Backups"
        action={
          <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
            <CameraIcon />
            Create backup
          </Button>
        }
      >
        <PanelCard className="flex flex-col gap-1">
          {renderImageList({
            images,
            loadError,
            onDelete: setDeleteTarget,
            onRestore: setRestoreTarget,
          })}
        </PanelCard>
      </Panel>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create backup</DialogTitle>
            <DialogDescription>
              Saves the current disk state. For the cleanest backup, stop the server first.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="snapshot-description">Description (optional)</Label>
            <Input
              id="snapshot-description"
              placeholder="e.g. Before 1.21 update"
              maxLength={100}
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              disabled={creating}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button type="button" onClick={submitCreate} disabled={creating}>
              {creating ? "Starting…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={restoreTarget !== null}
        onOpenChange={(open) => !open && setRestoreTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore from this backup?</AlertDialogTitle>
            <AlertDialogDescription>
              This wipes the current disk and reboots the server from the selected backup. Any
              changes since it was taken will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runRestore} disabled={actionPending}>
              {actionPending ? "Restoring…" : "Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this backup?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the backup. You can't undo this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={runDelete} disabled={actionPending}>
              {actionPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
