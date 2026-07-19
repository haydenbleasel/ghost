"use client";
import { CheckIcon, CopyIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { Fragment, useState } from "react";
import type { ReactNode } from "react";

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

const renderStep = (
  step: string,
  vars: { address: string; host: string; port: string }
): ReactNode[] => {
  const substituted = step
    .replaceAll("{address-host}", vars.host)
    .replaceAll("{address-port}", vars.port)
    .replaceAll("{address}", vars.address);
  return substituted.split(/`(?<code>[^`]+)`/gu).map((part, i) =>
    i % 2 === 0 ? (
      <Fragment key={i}>{part}</Fragment>
    ) : (
      <code
        key={i}
        className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs"
      >
        {part}
      </code>
    )
  );
};

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
  const stepVars = {
    address: address ?? "",
    host: ipv4 ?? "",
    port: primary ? String(primary.from) : "",
  };
  const howToConnect =
    game && "howToConnect" in game
      ? (game.howToConnect as readonly string[])
      : null;

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
              {howToConnect ? (
                <ol className="ml-4 list-decimal space-y-1.5 text-sm">
                  {howToConnect.map((step, i) => (
                    <li key={i}>{renderStep(step, stepVars)}</li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm">
                  Open {game.name}, go to the multiplayer menu, and connect to
                  the address above.
                  {game.usesJoinPassword &&
                    joinPassword &&
                    " Share the password above with anyone you want to let in."}
                </p>
              )}
            </div>
          </>
        )}
      </PanelCard>
    </Panel>
  );
};
