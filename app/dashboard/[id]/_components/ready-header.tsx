"use client";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { games } from "@/games";

type Props = {
	name: string;
	game: string;
	ipv4: string | null;
	phase: string;
	observedState: string;
	pending: boolean;
	onCommand: (type: "START" | "STOP" | "RESTART") => void;
	onDelete: () => void;
};

export const ReadyHeader = ({
	name,
	game: gameId,
	ipv4,
	phase,
	observedState,
	pending,
	onCommand,
	onDelete,
}: Props) => {
	const game = games.find((g) => g.id === gameId);

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between gap-4">
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
						<CardTitle className="text-2xl">{name}</CardTitle>
						<p className="text-sm text-muted-foreground">
							{game?.name ?? gameId}
							{ipv4 ? ` · ${ipv4}` : ""}
						</p>
					</div>
				</div>
				<div className="flex gap-2">
					<Badge variant={badgeVariant(observedState)}>{observedState}</Badge>
					<Badge variant="outline">{phase}</Badge>
				</div>
			</CardHeader>
			<CardContent className="flex flex-wrap gap-2">
				<Button
					onClick={() => onCommand("START")}
					disabled={pending || observedState !== "stopped"}
				>
					Start
				</Button>
				<Button
					variant="outline"
					onClick={() => onCommand("STOP")}
					disabled={pending || observedState !== "running"}
				>
					Stop
				</Button>
				<Button
					variant="outline"
					onClick={() => onCommand("RESTART")}
					disabled={pending || observedState !== "running"}
				>
					Restart
				</Button>
				<Button variant="destructive" onClick={onDelete} disabled={pending}>
					Delete
				</Button>
			</CardContent>
		</Card>
	);
};

function badgeVariant(
	state: string,
): "default" | "secondary" | "destructive" | "outline" {
	if (state === "running") return "default";
	if (state === "failed" || state === "lost") return "destructive";
	if (state === "unhealthy") return "secondary";
	return "outline";
}
