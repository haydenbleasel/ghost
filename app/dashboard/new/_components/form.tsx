"use client";
import Image, { type StaticImageData } from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { CatalogServerType } from "@/lib/hetzner/catalog";
import { cn } from "@/lib/utils";

export type GameOption = {
	id: string;
	name: string;
	description: string;
	image: StaticImageData;
	requirements: { cpu: number; memory: number };
};

type Props = {
	games: GameOption[];
	serverTypes: CatalogServerType[];
};

const typeFitsGame = (t: CatalogServerType, g: GameOption) =>
	t.memory >= g.requirements.memory &&
	t.cores >= g.requirements.cpu &&
	t.locations.some((l) => l.available);

const firstAvailableLocation = (t: CatalogServerType | undefined) =>
	t?.locations.find((l) => l.available)?.name ?? "";

export const NewServerForm = ({ games, serverTypes }: Props) => {
	const router = useRouter();
	const [pending, setPending] = useState(false);
	const [name, setName] = useState("");
	const [gameId, setGameId] = useState(games[0]?.id ?? "");

	const selectedGame = games.find((g) => g.id === gameId);

	const eligibleTypes = useMemo(
		() =>
			selectedGame
				? serverTypes.filter((t) => typeFitsGame(t, selectedGame))
				: [],
		[serverTypes, selectedGame],
	);

	const [typeName, setTypeName] = useState(() => eligibleTypes[0]?.name ?? "");
	const [locationName, setLocationName] = useState(() =>
		firstAvailableLocation(eligibleTypes[0]),
	);

	const selectedType = eligibleTypes.find((t) => t.name === typeName);

	useEffect(() => {
		if (!eligibleTypes.find((t) => t.name === typeName)) {
			setTypeName(eligibleTypes[0]?.name ?? "");
		}
	}, [eligibleTypes, typeName]);

	useEffect(() => {
		if (!selectedType) {
			if (locationName !== "") setLocationName("");
			return;
		}
		const current = selectedType.locations.find(
			(l) => l.name === locationName && l.available,
		);
		if (!current) {
			setLocationName(firstAvailableLocation(selectedType));
		}
	}, [selectedType, locationName]);

	const canSubmit =
		name.trim().length >= 3 &&
		name.trim().length <= 40 &&
		Boolean(gameId) &&
		Boolean(typeName) &&
		Boolean(locationName);

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!canSubmit) return;
		setPending(true);
		const res = await fetch("/api/servers", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: name.trim(),
				game: gameId,
				serverType: typeName,
				location: locationName,
			}),
		});
		setPending(false);
		if (!res.ok) {
			const error = await res.json().catch(() => ({}));
			toast.error(error.error ?? "Could not create server");
			return;
		}
		const { server } = await res.json();
		router.push(`/dashboard/${server.id}`);
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<section className="space-y-2">
				<Label htmlFor="name">Server name</Label>
				<Input
					id="name"
					value={name}
					onChange={(e) => setName(e.target.value)}
					required
					minLength={3}
					maxLength={40}
					placeholder="My server"
				/>
			</section>

			<section className="space-y-2">
				<Label>Game</Label>
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
					{games.map((game) => (
						<label
							key={game.id}
							className={cn(
								"relative cursor-pointer overflow-hidden rounded-lg border-2 transition",
								gameId === game.id
									? "border-primary"
									: "border-border hover:border-muted-foreground",
							)}
						>
							<input
								type="radio"
								name="game"
								value={game.id}
								checked={gameId === game.id}
								onChange={(e) => setGameId(e.target.value)}
								className="sr-only"
							/>
							<Image
								src={game.image}
								alt={game.name}
								className="aspect-square w-full object-cover"
								placeholder="blur"
							/>
							<div className="p-2">
								<div className="font-medium text-sm">{game.name}</div>
								<div className="text-muted-foreground text-xs">
									{game.requirements.memory} GB · {game.requirements.cpu} vCPU
								</div>
							</div>
						</label>
					))}
				</div>
			</section>

			<section className="space-y-2">
				<Label>Machine</Label>
				{eligibleTypes.length === 0 ? (
					<p className="rounded-md border border-border bg-muted/50 p-3 text-muted-foreground text-sm">
						No machines available for this game right now.
					</p>
				) : (
					<RadioGroup
						value={typeName}
						onValueChange={setTypeName}
						className="grid gap-2"
					>
						{eligibleTypes.map((type) => (
							<label
								key={type.name}
								className={cn(
									"flex cursor-pointer items-center justify-between gap-4 rounded-md border-2 p-3 transition",
									typeName === type.name
										? "border-primary"
										: "border-border hover:border-muted-foreground",
								)}
							>
								<div className="flex items-center gap-3">
									<RadioGroupItem value={type.name} id={`type-${type.name}`} />
									<div>
										<div className="font-medium text-sm uppercase">
											{type.name}
											<span className="ml-2 font-normal text-muted-foreground text-xs lowercase">
												{type.cpuType} {type.architecture}
											</span>
										</div>
										<div className="text-muted-foreground text-xs">
											{type.cores} vCPU · {type.memory} GB RAM · {type.disk} GB
											SSD
										</div>
									</div>
								</div>
								<div className="text-right text-sm tabular-nums">
									€{type.pricePerMonth.toFixed(2)}
									<span className="text-muted-foreground">/mo</span>
								</div>
							</label>
						))}
					</RadioGroup>
				)}
			</section>

			{selectedType && (
				<section className="space-y-2">
					<Label>Region</Label>
					<RadioGroup
						value={locationName}
						onValueChange={setLocationName}
						className="grid gap-2"
					>
						{selectedType.locations.map((loc) => (
							<label
								key={loc.name}
								className={cn(
									"flex items-center justify-between gap-4 rounded-md border-2 p-3 transition",
									loc.available
										? "cursor-pointer"
										: "cursor-not-allowed opacity-60",
									locationName === loc.name
										? "border-primary"
										: "border-border",
									loc.available && "hover:border-muted-foreground",
								)}
							>
								<div className="flex items-center gap-3">
									<RadioGroupItem
										value={loc.name}
										id={`loc-${loc.name}`}
										disabled={!loc.available}
									/>
									<div>
										<div className="font-medium text-sm">
											{loc.city}, {loc.country}
											<span className="ml-2 font-normal text-muted-foreground text-xs uppercase">
												{loc.name}
											</span>
										</div>
										{!loc.available && (
											<div className="text-destructive text-xs">
												Temporarily unavailable
											</div>
										)}
									</div>
								</div>
							</label>
						))}
					</RadioGroup>
				</section>
			)}

			<Button type="submit" className="w-full" disabled={!canSubmit || pending}>
				{pending ? "Queuing…" : "Create server"}
			</Button>
		</form>
	);
};
