"use client";
import { FingerprintIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Panel, PanelCard } from "@/components/panel";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

interface Passkey {
  id: string;
  name?: string;
  createdAt: string | Date;
  deviceType: string;
}

const formatDate = (value: string | Date): string =>
  new Date(value).toLocaleString([], {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });

export const PasskeysPanel = () => {
  const [passkeys, setPasskeys] = useState<Passkey[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addPending, setAddPending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Passkey | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await authClient.passkey.listUserPasskeys();
    if (error) {
      setLoadError(error.message ?? "Could not load passkeys");
      return;
    }
    setPasskeys(data as Passkey[]);
    setLoadError(null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submitAdd = async () => {
    setAddPending(true);
    const { error } = await authClient.passkey.addPasskey({
      name: addName.trim() || undefined,
    });
    setAddPending(false);
    if (error) {
      toast.error(error.message ?? "Could not add passkey");
      return;
    }
    toast.success("Passkey added");
    setAddOpen(false);
    setAddName("");
    load();
  };

  const runDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    setDeletePending(true);
    const { error } = await authClient.passkey.deletePasskey({
      id: deleteTarget.id,
    });
    setDeletePending(false);
    if (error) {
      toast.error(error.message ?? "Could not delete passkey");
      return;
    }
    toast.success("Passkey removed");
    setPasskeys(
      (prev) => prev?.filter((p) => p.id !== deleteTarget.id) ?? null
    );
    setDeleteTarget(null);
  };

  const renderList = () => {
    if (loadError) {
      return (
        <div className="px-3 py-4 text-destructive text-sm">{loadError}</div>
      );
    }
    if (passkeys === null) {
      return (
        <div className="px-3 py-4 text-muted-foreground text-sm">Loading…</div>
      );
    }
    if (passkeys.length === 0) {
      return (
        <div className="px-3 py-4 text-muted-foreground text-sm">
          No passkeys yet. Add one to sign in without a password.
        </div>
      );
    }
    return passkeys.map((passkey) => (
      <div
        key={passkey.id}
        className="flex items-center justify-between gap-4 rounded-lg px-3 py-2"
      >
        <div className="flex min-w-0 items-center gap-3">
          <FingerprintIcon className="size-4 shrink-0 text-muted-foreground" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate font-medium text-sm">
              {passkey.name || "Passkey"}
            </span>
            <span className="text-muted-foreground text-xs">
              Added {formatDate(passkey.createdAt)}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Remove passkey"
          onClick={() => setDeleteTarget(passkey)}
        >
          <Trash2Icon />
        </Button>
      </div>
    ));
  };

  return (
    <>
      <Panel
        title="Passkeys"
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAddOpen(true)}
          >
            <PlusIcon />
            Add passkey
          </Button>
        }
      >
        <PanelCard className="flex flex-col gap-1">{renderList()}</PanelCard>
      </Panel>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a passkey</DialogTitle>
            <DialogDescription>
              Your browser will prompt you to use Touch ID, Face ID, a security
              key, or your device&apos;s screen lock.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="passkey-name">Name (optional)</Label>
            <Input
              id="passkey-name"
              placeholder="e.g. MacBook Pro"
              maxLength={100}
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              disabled={addPending}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAddOpen(false)}
              disabled={addPending}
            >
              Cancel
            </Button>
            <Button type="button" onClick={submitAdd} disabled={addPending}>
              {addPending ? "Waiting…" : "Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this passkey?</AlertDialogTitle>
            <AlertDialogDescription>
              You won&apos;t be able to sign in with this passkey anymore. You
              can add it again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={runDelete} disabled={deletePending}>
              {deletePending ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
