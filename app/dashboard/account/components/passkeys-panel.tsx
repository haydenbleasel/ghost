"use client";
import { FingerprintIcon, PlusIcon, Trash2Icon } from "lucide-react";
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
      return <div className="text-destructive text-sm">{loadError}</div>;
    }
    if (passkeys === null) {
      return <div className="text-muted-foreground text-sm">Loading…</div>;
    }
    if (passkeys.length === 0) {
      return (
        <div className="text-muted-foreground text-sm">
          No passkeys yet. Add one to sign in without a password.
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-1">
        {passkeys.map((passkey) => (
          <div
            className="flex items-center justify-between gap-4"
            key={passkey.id}
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
              aria-label="Remove passkey"
              onClick={() => setDeleteTarget(passkey)}
              size="icon"
              variant="ghost"
            >
              <Trash2Icon />
            </Button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col items-start gap-4">
        {renderList()}
        <Button
          onClick={() => setAddOpen(true)}
          size="sm"
          type="button"
          variant="outline"
        >
          <PlusIcon />
          Add passkey
        </Button>
      </div>

      <Dialog onOpenChange={setAddOpen} open={addOpen}>
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
              disabled={addPending}
              id="passkey-name"
              maxLength={100}
              onChange={(e) => setAddName(e.target.value)}
              placeholder="e.g. MacBook Pro"
              value={addName}
            />
          </div>
          <DialogFooter>
            <Button
              disabled={addPending}
              onClick={() => setAddOpen(false)}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button disabled={addPending} onClick={submitAdd} type="button">
              {addPending ? "Waiting…" : "Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        open={deleteTarget !== null}
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
            <AlertDialogAction disabled={deletePending} onClick={runDelete}>
              {deletePending ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
