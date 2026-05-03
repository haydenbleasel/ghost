"use client";
import {
  CheckIcon,
  CopyIcon,
  MoreHorizontalIcon,
  PlayIcon,
  RotateCcwIcon,
  SquareIcon,
  Trash2Icon,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { games } from "@/games";
import { cn } from "@/lib/utils";

interface Props {
  name: string;
  game: string;
  ipv4: string | null;
  observedState: string;
  desiredState: string;
  pending: boolean;
  onCommand: (type: "START" | "STOP" | "RESTART") => void;
  onDelete: () => void;
}

const badgeVariant = (
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

const stateClassName = (state: string, deleting: boolean): string => {
  if (deleting) {
    return "";
  }
  if (state === "running") {
    return "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-600";
  }
  return "";
};

export const ReadyHeader = ({
  name,
  game: gameId,
  ipv4,
  observedState,
  desiredState,
  pending,
  onCommand,
  onDelete,
}: Props) => {
  const deleting = desiredState === "deleted";
  const label = deleting ? "deleting" : observedState;
  const game = games.find((g) => g.id === gameId);
  const [copied, setCopied] = useState(false);

  const copyIp = async () => {
    if (!ipv4) {
      return;
    }
    await navigator.clipboard.writeText(ipv4);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        {game && (
          <Image
            src={game.image}
            alt={game.name}
            className="size-14 shrink-0 rounded-lg object-cover"
            placeholder="blur"
          />
        )}
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium tracking-tight text-2xl">{name}</p>
            <Badge
              variant={badgeVariant(observedState, deleting)}
              className={cn(
                "capitalize",
                stateClassName(observedState, deleting)
              )}
            >
              {label}
            </Badge>
          </div>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>{game?.name ?? gameId}</span>
            {ipv4 && (
              <>
                <span>·</span>
                <span>{ipv4}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Copy IP address"
                  onClick={copyIp}
                  className="size-5 text-muted-foreground hover:text-foreground"
                >
                  {copied ? (
                    <CheckIcon className="size-3" />
                  ) : (
                    <CopyIcon className="size-3" />
                  )}
                </Button>
              </>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Server actions">
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() => onCommand("START")}
              disabled={pending || observedState !== "stopped"}
            >
              <PlayIcon />
              Start
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onCommand("STOP")}
              disabled={pending || observedState !== "running"}
            >
              <SquareIcon />
              Stop
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onCommand("RESTART")}
              disabled={pending || observedState !== "running"}
            >
              <RotateCcwIcon />
              Restart
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={onDelete}
              disabled={pending}
            >
              <Trash2Icon />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
