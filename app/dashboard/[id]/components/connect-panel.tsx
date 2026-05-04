"use client";
import { CheckIcon, CopyIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";

import { Panel, PanelCard } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { games } from "@/games";

interface Props {
  game: string;
  ipv4: string | null;
  joinPassword: string | null;
}

const formatPort = (port: { from: number; to: number; protocol: string }) => {
  const range =
    port.from === port.to ? `${port.from}` : `${port.from}–${port.to}`;
  return `${range}/${port.protocol.toUpperCase()}`;
};

const primaryPort = (
  ports: readonly { from: number; to: number; protocol: string }[]
) => ports[0];

interface CopyableProps {
  label: string;
  value: string;
  reveal?: boolean;
}

const Copyable = ({ label, value, reveal }: CopyableProps) => {
  const [copied, setCopied] = useState(false);
  const [shown, setShown] = useState(!reveal);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <code className="rounded-md bg-muted px-2 py-1 font-mono text-sm">
          {shown ? value : "•".repeat(value.length)}
        </code>
        {reveal && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={shown ? "Hide" : "Show"}
            onClick={() => setShown((v) => !v)}
            className="size-7 text-muted-foreground hover:text-foreground"
          >
            {shown ? (
              <EyeOffIcon className="size-3.5" />
            ) : (
              <EyeIcon className="size-3.5" />
            )}
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Copy ${label.toLowerCase()}`}
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
  );
};

export const ConnectPanel = ({ game: gameId, ipv4, joinPassword }: Props) => {
  const game = games.find((g) => g.id === gameId);

  const primary = game ? primaryPort(game.ports) : null;
  const address = ipv4 && primary ? `${ipv4}:${primary.from}` : ipv4;

  if (!ipv4) {
    return (
      <Panel>
        <PanelCard className="text-sm text-muted-foreground">
          No IP address assigned yet.
        </PanelCard>
      </Panel>
    );
  }

  return (
    <Panel>
      <PanelCard className="flex flex-col gap-4">
        {address && <Copyable label="Server address" value={address} />}
        {game?.usesJoinPassword && joinPassword && (
          <Copyable label="Server password" value={joinPassword} reveal />
        )}
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
                {game.usesJoinPassword &&
                  joinPassword &&
                  " Share the password above with anyone you want to let in."}
              </p>
            </div>
          </>
        )}
      </PanelCard>
    </Panel>
  );
};
