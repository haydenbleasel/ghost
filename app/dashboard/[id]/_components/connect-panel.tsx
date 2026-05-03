"use client";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";

import { Panel, PanelCard } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { games } from "@/games";

interface Props {
  game: string;
  ipv4: string | null;
}

const formatPort = (port: { from: number; to: number; protocol: string }) => {
  const range =
    port.from === port.to ? `${port.from}` : `${port.from}–${port.to}`;
  return `${range}/${port.protocol.toUpperCase()}`;
};

const primaryPort = (
  ports: readonly { from: number; to: number; protocol: string }[]
) => {
  const tcp = ports.find((p) => p.protocol === "tcp");
  return tcp ?? ports[0];
};

export const ConnectPanel = ({ game: gameId, ipv4 }: Props) => {
  const game = games.find((g) => g.id === gameId);
  const [copied, setCopied] = useState(false);

  const primary = game ? primaryPort(game.ports) : null;
  const address = ipv4 && primary ? `${ipv4}:${primary.from}` : ipv4;

  const copy = async () => {
    if (!address) {
      return;
    }
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!ipv4) {
    return (
      <Panel>
        <PanelCard className="p-6 text-sm text-muted-foreground">
          No IP address assigned yet.
        </PanelCard>
      </Panel>
    );
  }

  return (
    <Panel>
      <PanelCard className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Server address
          </span>
          <div className="flex items-center gap-2">
            <code className="rounded-md bg-muted px-2 py-1 font-mono text-sm">
              {address}
            </code>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Copy address"
              onClick={copy}
              className="size-7 text-muted-foreground hover:text-foreground"
            >
              {copied ? (
                <CheckIcon className="size-3.5" />
              ) : (
                <CopyIcon className="size-3.5" />
              )}
            </Button>
          </div>
        </div>
        {game && (
          <>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                Ports
              </span>
              <div className="flex flex-wrap gap-2">
                {game.ports.map((port) => (
                  <code
                    key={`${port.protocol}-${port.from}`}
                    className="rounded-md bg-muted px-2 py-1 font-mono text-xs"
                  >
                    {formatPort(port)}
                  </code>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                How to connect
              </span>
              <p className="text-sm">
                Open {game.name}, go to the multiplayer menu, and connect to the
                address above.
              </p>
            </div>
          </>
        )}
      </PanelCard>
    </Panel>
  );
};
