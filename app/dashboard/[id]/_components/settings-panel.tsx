"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { CatalogServerType } from "@/lib/hetzner/catalog";
import { cn } from "@/lib/utils";

interface Props {
  serverId: string;
  backupsEnabled: boolean;
  observedState: string;
  currentServerType: string;
  eligibleTypes: CatalogServerType[];
  currency: string;
  onChange: (patch: { backupsEnabled?: boolean; serverType?: string }) => void;
}

const formatPrice = (amount: number, currency: string) =>
  new Intl.NumberFormat(undefined, {
    currency,
    maximumFractionDigits: 2,
    style: "currency",
  }).format(amount);

export const SettingsPanel = ({
  serverId,
  backupsEnabled,
  observedState,
  currentServerType,
  eligibleTypes,
  currency,
  onChange,
}: Props) => {
  const [backupPending, setBackupPending] = useState(false);
  const [rescaleOpen, setRescaleOpen] = useState(false);
  const [rescalePending, setRescalePending] = useState(false);
  const [selectedType, setSelectedType] = useState(currentServerType);

  const canRescale = observedState === "stopped";

  const toggleBackups = async (enabled: boolean) => {
    setBackupPending(true);
    try {
      const res = await fetch(`/api/servers/${serverId}/backups`, {
        body: JSON.stringify({ enabled }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Could not update backups");
      }
      onChange({ backupsEnabled: enabled });
      toast.success(enabled ? "Backups enabled" : "Backups disabled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update backups");
    } finally {
      setBackupPending(false);
    }
  };

  const submitRescale = async () => {
    if (selectedType === currentServerType) {
      setRescaleOpen(false);
      return;
    }
    setRescalePending(true);
    try {
      const res = await fetch(`/api/servers/${serverId}/rescale`, {
        body: JSON.stringify({ serverType: selectedType }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Rescale failed");
      }
      onChange({ serverType: selectedType });
      toast.success(`Rescaled to ${selectedType}`);
      setRescaleOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Rescale failed");
    } finally {
      setRescalePending(false);
    }
  };

  const openRescale = () => {
    setSelectedType(currentServerType);
    setRescaleOpen(true);
  };

  return (
    <section className="flex flex-col gap-2 rounded-2xl bg-sidebar p-2">
      <div className="flex flex-col gap-1 rounded-2xl bg-background p-2 shadow-sm/5">
        <div className="flex items-center justify-between gap-4 rounded-lg px-3 py-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Enable backups</span>
            <span className="text-xs text-muted-foreground">
              Daily snapshots of this server's disk, retained for 7 days.
            </span>
          </div>
          <Switch
            checked={backupsEnabled}
            disabled={backupPending}
            onCheckedChange={toggleBackups}
            aria-label="Enable backups"
          />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-lg px-3 py-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Rescale</span>
            <span className="text-xs text-muted-foreground">
              Move this server to a different size.
            </span>
          </div>
          {canRescale ? (
            <Button type="button" variant="outline" size="sm" onClick={openRescale}>
              Rescale
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-disabled
                  className="cursor-not-allowed opacity-50"
                  onClick={(event) => event.preventDefault()}
                >
                  Rescale
                </Button>
              </TooltipTrigger>
              <TooltipContent>Stop the server first to rescale.</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      <Dialog open={rescaleOpen} onOpenChange={setRescaleOpen}>
        <DialogContent className="max-h-[80vh] overflow-hidden sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Rescale server</DialogTitle>
            <DialogDescription>
              Pick a new size. Your disk stays at its current capacity.
            </DialogDescription>
          </DialogHeader>
          <RadioGroup
            value={selectedType}
            onValueChange={setSelectedType}
            className="max-h-[50vh] space-y-2 overflow-auto"
          >
            {eligibleTypes.map((type) => {
              const isCurrent = type.name === currentServerType;
              const isSelected = selectedType === type.name;
              return (
                <label
                  key={type.name}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-4 rounded-md border-2 p-3 transition",
                    isSelected ? "border-primary" : "border-border hover:border-muted-foreground",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value={type.name} id={`rescale-${type.name}`} />
                    <div>
                      <div className="font-medium text-sm uppercase">
                        {type.name}
                        {isCurrent && (
                          <span className="ml-2 font-normal text-muted-foreground text-xs normal-case">
                            current
                          </span>
                        )}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {type.cores} vCPU · {type.memory} GB RAM · {type.disk} GB SSD
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-sm tabular-nums">
                    {formatPrice(type.pricePerMonth, currency)}
                    <span className="text-muted-foreground">/mo</span>
                  </div>
                </label>
              );
            })}
          </RadioGroup>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRescaleOpen(false)}
              disabled={rescalePending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={submitRescale}
              disabled={rescalePending || selectedType === currentServerType}
            >
              {rescalePending ? "Rescaling…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};
