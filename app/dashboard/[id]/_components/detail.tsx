"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { games } from "@/games";
import { ActivityStream } from "./activity-stream";
import { LogsStream } from "./logs-stream";
import { ProvisioningHeader } from "./provisioning-header";
import { ProvisioningStatus } from "./provisioning-status";
import { ReadyHeader } from "./ready-header";

const PROVISIONING_PHASES = new Set([
	"queued",
	"provisioning",
	"booting",
	"agent_connected",
	"installing",
	"starting",
	"healthy",
	"errored",
]);

type ServerView = {
	id: string;
	name: string;
	game: string;
	ipv4: string | null;
	phase: string;
	observedState: string;
	desiredState: string;
	lastHeartbeatAt: string | null;
};

export const ServerDetail = ({ server: initial }: { server: ServerView }) => {
	const router = useRouter();
	const [server, setServer] = useState(initial);
	const [pending, setPending] = useState<null | string>(null);

	// Refresh server meta every 5s
	const ref = useRef(server);
	ref.current = server;
	useEffect(() => {
		const t = setInterval(async () => {
			const res = await fetch(`/api/servers/${initial.id}`);
			if (!res.ok) return;
			const { server: fresh } = await res.json();
			if (fresh) {
				setServer({
					id: fresh.id,
					name: fresh.name,
					game: fresh.game,
					ipv4: fresh.ipv4,
					phase: fresh.phase,
					observedState: fresh.observedState,
					desiredState: fresh.desiredState,
					lastHeartbeatAt: fresh.agent?.lastHeartbeatAt ?? null,
				});
			}
		}, 5000);
		return () => clearInterval(t);
	}, [initial.id]);

	const sendCommand = async (type: "START" | "STOP" | "RESTART") => {
		setPending(type);
		const res = await fetch(`/api/servers/${server.id}/commands`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ type }),
		});
		setPending(null);
		if (!res.ok) toast.error(`${type} failed`);
		else toast.success(`${type} queued`);
	};

	const onDelete = async () => {
		if (!confirm("Delete this server? This tears down the VM.")) return;
		setPending("DELETE");
		const res = await fetch(`/api/servers/${server.id}`, { method: "DELETE" });
		setPending(null);
		if (!res.ok) {
			toast.error("Delete failed");
			return;
		}
		router.push("/dashboard");
		router.refresh();
	};

	const isProvisioning = PROVISIONING_PHASES.has(server.phase);
	const game = games.find((g) => g.id === server.game);

	if (!game) {
		return null;
	}

	if (isProvisioning) {
		return (
			<div className="grid gap-8">
				<div className="flex items-center gap-4">
					<Image
						src={game.image}
						alt={game.name}
						className="size-14 shrink-0 rounded-lg object-cover"
						placeholder="blur"
					/>
					<div>
						<p className="font-medium tracking-tight text-2xl">{game.name}</p>
						<p className="text-sm text-muted-foreground">
							{`${game.description} · ${server.ipv4}`}
						</p>
					</div>
				</div>
				<ProvisioningStatus
					phase={server.phase}
					errored={
						server.phase === "errored" || server.observedState === "failed"
					}
				/>
				<div className="flex justify-end">
					<Button
						variant="destructive"
						onClick={onDelete}
						disabled={Boolean(pending)}
					>
						Delete
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="grid gap-8">
			<ReadyHeader
				name={server.name}
				game={server.game}
				ipv4={server.ipv4}
				phase={server.phase}
				observedState={server.observedState}
				pending={Boolean(pending)}
				onCommand={sendCommand}
				onDelete={onDelete}
			/>
			<div className="grid gap-6 md:grid-cols-2">
				<ActivityStream serverId={server.id} />
				<LogsStream serverId={server.id} />
			</div>
		</div>
	);
};
