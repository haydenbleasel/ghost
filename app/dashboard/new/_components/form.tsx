"use client";
import type { Marker } from "cobe";
import { ChevronDown } from "lucide-react";
import Image, { type StaticImageData } from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { CatalogServerType } from "@/lib/hetzner/catalog";
import { cn } from "@/lib/utils";
import { Cobe } from "./cobe";

const VISIBLE_ALL_SIZES = 3;

type SizeCardProps = {
	type: CatalogServerType;
	selected: boolean;
};

const SizeCard = ({ type, selected }: SizeCardProps) => (
	<label
		className={cn(
			"flex cursor-pointer items-center justify-between gap-4 rounded-md border-2 p-3 transition",
			selected
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
					{type.cores} vCPU · {type.memory} GB RAM · {type.disk} GB SSD
				</div>
			</div>
		</div>
		<div className="text-right text-sm tabular-nums">
			€{type.pricePerMonth.toFixed(2)}
			<span className="text-muted-foreground">/mo</span>
		</div>
	</label>
);

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

const STEPS = [
	{ id: "game", title: "Game" },
	{ id: "size", title: "Size" },
	{ id: "location", title: "Location" },
	{ id: "name", title: "Name" },
] as const;

const typeFitsGame = (t: CatalogServerType, g: GameOption) =>
	t.memory >= g.requirements.memory &&
	t.cores >= g.requirements.cpu &&
	t.locations.some((l) => l.available);

const firstAvailableLocation = (t: CatalogServerType | undefined) =>
	t?.locations.find((l) => l.available)?.name ?? "";

export const NewServerForm = ({ games, serverTypes }: Props) => {
	const router = useRouter();
	const [pending, setPending] = useState(false);
	const [step, setStep] = useState(0);
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

	const trimmedName = name.trim();
	const nameValid = trimmedName.length >= 3 && trimmedName.length <= 40;

	const stepValid = [
		Boolean(gameId),
		Boolean(typeName) && eligibleTypes.length > 0,
		Boolean(locationName),
		nameValid,
	];

	const canSubmit =
		nameValid && Boolean(gameId) && Boolean(typeName) && Boolean(locationName);

	const submit = async () => {
		if (!canSubmit) return;
		setPending(true);
		const res = await fetch("/api/servers", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: trimmedName,
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

	const handleSubmit = (event: React.FormEvent) => {
		event.preventDefault();
		if (step < STEPS.length - 1) {
			if (stepValid[step]) setStep(step + 1);
			return;
		}
		submit();
	};

	const isLast = step === STEPS.length - 1;

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<ol className="flex items-center gap-2">
				{STEPS.map((s, i) => {
					const done = i < step;
					const active = i === step;
					return (
						<li key={s.id} className="flex flex-1 items-center gap-2">
							<div
								className={cn(
									"flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium tabular-nums",
									active && "border-primary bg-primary text-primary-foreground",
									done && "border-primary bg-primary/10 text-primary",
									!(active || done) && "border-border text-muted-foreground",
								)}
							>
								{i + 1}
							</div>
							<span
								className={cn(
									"text-sm",
									active ? "font-medium" : "text-muted-foreground",
								)}
							>
								{s.title}
							</span>
							{i < STEPS.length - 1 && (
								<span
									className={cn(
										"ml-2 h-px flex-1",
										done ? "bg-primary" : "bg-border",
									)}
								/>
							)}
						</li>
					);
				})}
			</ol>

			{step === 0 && (
				<section className="space-y-2">
					<Label>Choose a game</Label>
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
			)}

			{step === 1 && (
				<section className="space-y-2">
					<Label>Pick a server size</Label>
					{eligibleTypes.length === 0 ? (
						<p className="rounded-md border border-border bg-muted/50 p-3 text-muted-foreground text-sm">
							No machines available for this game right now.
						</p>
					) : (
						(() => {
							const recommended = eligibleTypes[0];
							const rest = eligibleTypes.slice(1);
							const visibleRest = rest.slice(0, VISIBLE_ALL_SIZES);
							const hiddenRest = rest.slice(VISIBLE_ALL_SIZES);
							return (
								<RadioGroup
									value={typeName}
									onValueChange={setTypeName}
									className="space-y-5"
								>
									<div className="space-y-2">
										<div className="flex items-center gap-2">
											<span className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
												Recommended for {selectedGame?.name}
											</span>
										</div>
										<SizeCard
											type={recommended}
											selected={typeName === recommended.name}
										/>
									</div>
									{rest.length > 0 && (
										<div className="space-y-2">
											<div className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
												All sizes
											</div>
											<div className="grid gap-2">
												{visibleRest.map((type) => (
													<SizeCard
														key={type.name}
														type={type}
														selected={typeName === type.name}
													/>
												))}
											</div>
											{hiddenRest.length > 0 && (
												<Collapsible>
													<CollapsibleContent className="grid gap-2 pt-2">
														{hiddenRest.map((type) => (
															<SizeCard
																key={type.name}
																type={type}
																selected={typeName === type.name}
															/>
														))}
													</CollapsibleContent>
													<CollapsibleTrigger asChild>
														<Button
															type="button"
															variant="ghost"
															size="sm"
															className="group w-full"
														>
															<span className="group-data-[state=open]:hidden">
																Show all sizes
															</span>
															<span className="hidden group-data-[state=open]:inline">
																Show fewer
															</span>
															<ChevronDown className="transition-transform group-data-[state=open]:rotate-180" />
														</Button>
													</CollapsibleTrigger>
												</Collapsible>
											)}
										</div>
									)}
								</RadioGroup>
							);
						})()
					)}
				</section>
			)}

			{step === 2 && (
				<section className="space-y-4">
					<Label>Pick a location</Label>
					{selectedType ? (
						<div className="grid gap-6 md:grid-cols-[1fr_2fr] md:items-center">
							<RadioGroup
								value={locationName}
								onValueChange={setLocationName}
								className="grid gap-1"
							>
								{selectedType.locations.map((loc) => (
									<label
										key={loc.name}
										className={cn(
											"flex items-center gap-3 rounded-md px-3 py-2 text-sm transition",
											loc.available
												? "cursor-pointer hover:bg-muted/60"
												: "cursor-not-allowed opacity-50",
											locationName === loc.name && "bg-muted",
										)}
									>
										<RadioGroupItem
											value={loc.name}
											id={`loc-${loc.name}`}
											disabled={!loc.available}
										/>
										<span className="flex-1 truncate font-medium">
											{loc.city}, {loc.country}
										</span>
									</label>
								))}
							</RadioGroup>
							<div className="w-full">
								<Cobe
									markers={selectedType.locations
										.filter((loc) => loc.available)
										.map<Marker>((loc) => ({
											location: [loc.latitude, loc.longitude],
											size: locationName === loc.name ? 0.1 : 0.05,
										}))}
									focus={
										selectedType.locations.find(
											(l) => l.name === locationName,
										) ?? null
									}
								/>
							</div>
						</div>
					) : (
						<p className="rounded-md border border-border bg-muted/50 p-3 text-muted-foreground text-sm">
							Pick a server size first.
						</p>
					)}
				</section>
			)}

			{step === 3 && (
				<section className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="name">Server name</Label>
						<Input
							id="name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
							minLength={3}
							maxLength={40}
							placeholder="My server"
							autoFocus
						/>
					</div>
					<dl className="grid gap-2 rounded-md border border-border bg-muted/30 p-3 text-sm">
						<div className="flex justify-between gap-4">
							<dt className="text-muted-foreground">Game</dt>
							<dd className="font-medium">{selectedGame?.name}</dd>
						</div>
						<div className="flex justify-between gap-4">
							<dt className="text-muted-foreground">Size</dt>
							<dd className="font-medium uppercase">{typeName}</dd>
						</div>
						<div className="flex justify-between gap-4">
							<dt className="text-muted-foreground">Location</dt>
							<dd className="font-medium">
								{selectedType?.locations.find((l) => l.name === locationName)
									?.city ?? locationName}
							</dd>
						</div>
						{selectedType && (
							<div className="flex justify-between gap-4">
								<dt className="text-muted-foreground">Price</dt>
								<dd className="font-medium tabular-nums">
									€{selectedType.pricePerMonth.toFixed(2)}/mo
								</dd>
							</div>
						)}
					</dl>
				</section>
			)}

			<div className="flex items-center justify-between gap-2">
				<Button
					type="button"
					variant="ghost"
					onClick={() => setStep((s) => Math.max(0, s - 1))}
					disabled={step === 0 || pending}
				>
					Back
				</Button>
				<Button type="submit" disabled={!stepValid[step] || pending}>
					{isLast ? (pending ? "Queuing…" : "Create server") : "Next"}
				</Button>
			</div>
		</form>
	);
};
