"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  isTerminalSnapshotStatus,
  SNAPSHOT_BUILD_PROGRESSION,
  SNAPSHOT_BUILD_STEP_LABELS,
} from "@/lib/snapshot-build/types";
import type {
  SnapshotBuildStatus,
  SnapshotBuildSummary,
} from "@/lib/snapshot-build/types";

interface Props {
  configured: boolean;
  imageId: string | null;
  tokenSaved: boolean;
  latestBuild: SnapshotBuildSummary | null;
}

const POLL_INTERVAL_MS = 2000;

const isActiveStatus = (status: SnapshotBuildStatus): boolean =>
  !isTerminalSnapshotStatus(status);

const dotClassFor = (done: boolean, active: boolean): string => {
  if (done) {
    return "bg-foreground";
  }
  if (active) {
    return "animate-pulse bg-foreground";
  }
  return "bg-muted";
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
  if (build.status === "failed") {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive text-sm">
        Build failed: {build.errorReason ?? "Unknown error"}
      </div>
    );
  }

  const currentIndex = SNAPSHOT_BUILD_PROGRESSION.indexOf(build.status);

  return (
    <ol className="grid gap-1 text-sm">
      {SNAPSHOT_BUILD_PROGRESSION.map((status, index) => {
        const done = currentIndex > index;
        const active = currentIndex === index;
        const labelClass =
          done || active ? "text-foreground" : "text-muted-foreground";
        return (
          <li className="flex items-center gap-2" key={status}>
            <span
              aria-hidden="true"
              className={`inline-block h-2 w-2 rounded-full ${dotClassFor(done, active)}`}
            />
            <span className={labelClass}>
              {SNAPSHOT_BUILD_STEP_LABELS[status]}
            </span>
          </li>
        );
      })}
    </ol>
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
          {build ? <BuildStatus build={build} /> : null}
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
