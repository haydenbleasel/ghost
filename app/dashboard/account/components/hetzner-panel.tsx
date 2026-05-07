"use client";
import { CheckIcon, CircleXIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  isTerminalSnapshotStatus,
  SNAPSHOT_BUILD_PROGRESSION,
} from "@/lib/snapshot-build/types";
import type {
  SnapshotBuildStatus,
  SnapshotBuildSummary,
} from "@/lib/snapshot-build/types";
import { cn } from "@/lib/utils";

interface Props {
  configured: boolean;
  imageId: string | null;
  tokenSaved: boolean;
  latestBuild: SnapshotBuildSummary | null;
}

const POLL_INTERVAL_MS = 2000;

const isActiveStatus = (status: SnapshotBuildStatus): boolean =>
  !isTerminalSnapshotStatus(status);

const STEPS: { key: SnapshotBuildStatus; label: string }[] = [
  { key: "pending", label: "Queued" },
  { key: "compiling_agent", label: "Compiling agent" },
  { key: "creating_vm", label: "Creating VM" },
  { key: "installing", label: "Installing" },
  { key: "snapshotting", label: "Snapshotting" },
  { key: "ready", label: "Ready" },
];

type StepStatus = "done" | "active" | "pending" | "error";

const StepIcon = ({ status }: { status: StepStatus }) => {
  if (status === "done") {
    return <CheckIcon className="size-4 shrink-0 text-emerald-500" />;
  }
  if (status === "active") {
    return <Spinner className="size-4 shrink-0 text-muted-foreground" />;
  }
  if (status === "error") {
    return <CircleXIcon className="size-4 shrink-0 text-destructive" />;
  }
  return <div className="size-4 shrink-0" />;
};

const buildButtonLabel = (input: {
  buildActive: boolean;
  building: boolean;
  configured: boolean;
}): string => {
  if (input.buildActive) {
    return "Building…";
  }
  if (input.building) {
    return "Starting…";
  }
  return input.configured ? "Rebuild snapshot" : "Build snapshot";
};

const BuildStatus = ({ build }: { build: SnapshotBuildSummary }) => {
  const errored = build.status === "failed";
  const currentIndex = SNAPSHOT_BUILD_PROGRESSION.indexOf(build.status);
  // When the build fails, status flips to "failed" and we lose the in-flight
  // phase, so currentIndex is -1 — pin the error to the first step.
  const errorIndex = errored && currentIndex === -1 ? 0 : currentIndex;

  return (
    <div className="grid gap-3">
      {STEPS.map((step, index) => {
        const isErrorStep = errored && errorIndex === index;
        let status: StepStatus;
        if (isErrorStep) {
          status = "error";
        } else if (currentIndex > index) {
          status = "done";
        } else if (currentIndex === index) {
          status = "active";
        } else {
          status = "pending";
        }

        return (
          <div className="flex flex-col gap-1" key={step.key}>
            <div className="flex flex-row items-center gap-4">
              <StepIcon status={status} />
              <span
                className={cn(
                  "text-sm",
                  status === "pending" && "text-muted-foreground",
                  status === "error" && "text-destructive"
                )}
              >
                {step.label}
              </span>
            </div>
            {isErrorStep && build.errorReason ? (
              <p className="pl-8 text-destructive text-xs">
                {build.errorReason}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

export const HetznerPanel = ({
  configured,
  imageId,
  tokenSaved,
  latestBuild,
}: Props) => {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [pending, setPending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [build, setBuild] = useState<SnapshotBuildSummary | null>(latestBuild);
  const [building, setBuilding] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const buildActive = build ? isActiveStatus(build.status) : false;
  const showBuildButton = tokenSaved;

  useEffect(() => {
    setBuild(latestBuild);
  }, [latestBuild]);

  useEffect(() => {
    if (!buildActive) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    if (pollRef.current) {
      return;
    }
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/account/snapshot", { cache: "no-store" });
        if (!res.ok) {
          return;
        }
        const json = (await res.json()) as {
          build: SnapshotBuildSummary | null;
        };
        setBuild(json.build);
        if (json.build && isTerminalSnapshotStatus(json.build.status)) {
          if (json.build.status === "ready") {
            toast.success("Snapshot ready");
            router.refresh();
          } else if (json.build.status === "failed") {
            toast.error(json.build.errorReason ?? "Snapshot build failed");
          }
        }
      } catch {
        // network blips are fine; the next tick retries
      }
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [buildActive, router]);

  const canSubmit = token.trim().length >= 20;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/account/hetzner", {
        body: JSON.stringify({ token: token.trim() }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        throw new Error(json.error ?? "Could not save token");
      }
      setToken("");
      toast.success("Hetzner token saved");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save token"
      );
    } finally {
      setPending(false);
    }
  };

  const handleClear = async () => {
    if (!tokenSaved) {
      return;
    }
    setClearing(true);
    try {
      const res = await fetch("/api/account/hetzner", { method: "DELETE" });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Could not clear token");
      }
      toast.success("Hetzner token cleared");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not clear token"
      );
    } finally {
      setClearing(false);
    }
  };

  const handleBuild = async () => {
    setBuilding(true);
    try {
      const res = await fetch("/api/account/snapshot", { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as {
        buildId?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(json.error ?? "Could not start snapshot build");
      }
      setBuild({
        createdAt: new Date().toISOString(),
        errorReason: null,
        finishedAt: null,
        id: json.buildId ?? "pending",
        previousSnapshotId: null,
        snapshotId: null,
        status: "pending",
      });
      toast.success("Snapshot build started");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not start snapshot build"
      );
    } finally {
      setBuilding(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <p className="text-muted-foreground text-sm">
          Provide a Hetzner Cloud API token (Read &amp; Write). Your token is
          encrypted at rest and never leaves the server.{" "}
          <a
            className="underline"
            href="https://docs.hetzner.cloud/#getting-started"
            rel="noreferrer"
            target="_blank"
          >
            How to create a token
          </a>
          . Once saved, click <strong>Build snapshot</strong> below to create
          your golden image automatically.
        </p>
        <div className="space-y-2">
          <Label htmlFor="hetzner-token">
            API token{tokenSaved ? " (set new to replace)" : ""}
          </Label>
          <Input
            autoComplete="off"
            id="hetzner-token"
            name="token"
            onChange={(event) => setToken(event.target.value)}
            placeholder={tokenSaved ? "••••••••••••••••" : "hcloud_…"}
            required={!tokenSaved}
            type="password"
            value={token}
          />
        </div>
        <div className="flex justify-start gap-2">
          <Button disabled={!canSubmit || pending} size="sm" type="submit">
            {pending ? "Verifying…" : "Save"}
          </Button>
          {tokenSaved ? (
            <Button
              disabled={clearing || pending}
              onClick={handleClear}
              size="sm"
              type="button"
              variant="ghost"
            >
              {clearing ? "Clearing…" : "Clear"}
            </Button>
          ) : null}
        </div>
      </form>
      {showBuildButton ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="font-medium text-sm">Golden snapshot</h3>
            <p className="text-muted-foreground text-sm">
              {configured && imageId
                ? `Current image ID: ${imageId}`
                : "No snapshot yet. Build one to start provisioning servers."}
            </p>
          </div>
          {build && (buildActive || build.status === "failed") ? (
            <BuildStatus build={build} />
          ) : null}
          <div className="flex justify-start">
            <Button
              disabled={building || buildActive}
              onClick={handleBuild}
              size="sm"
              type="button"
            >
              {buildButtonLabel({ buildActive, building, configured })}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
