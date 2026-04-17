"use client";

import createGlobe, { type Marker } from "cobe";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type CobeProps = {
	markers: Marker[];
	focus?: { latitude: number; longitude: number } | null;
	className?: string;
};

const locationToAngles = (lat: number, long: number): [number, number] => [
	Math.PI - (long * Math.PI) / 180 - Math.PI / 2,
	(lat * Math.PI) / 180,
];

const shortestPhi = (current: number, target: number) => {
	const diff = target - current;
	const wrapped =
		((((diff + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) -
		Math.PI;
	return current + wrapped;
};

export const Cobe = ({ markers, focus, className }: CobeProps) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const phiRef = useRef(0);
	const thetaRef = useRef(0.2);
	const targetPhiRef = useRef(0);
	const targetThetaRef = useRef(0.2);
	const autoRotateRef = useRef(true);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const globe = createGlobe(canvas, {
			devicePixelRatio: 2,
			width: 600 * 2,
			height: 600 * 2,
			phi: 0,
			theta: 0.2,
			dark: 0,
			diffuse: 1.2,
			mapSamples: 16_000,
			mapBrightness: 6,
			baseColor: [0.9, 0.9, 0.9],
			markerColor: [251 / 255, 100 / 255, 21 / 255],
			glowColor: [1, 1, 1],
			markers,
		});

		let raf = 0;
		const animate = () => {
			const lerp = 0.08;
			if (autoRotateRef.current) {
				targetPhiRef.current += 0.005;
			}
			phiRef.current += (targetPhiRef.current - phiRef.current) * lerp;
			thetaRef.current += (targetThetaRef.current - thetaRef.current) * lerp;
			globe.update({ phi: phiRef.current, theta: thetaRef.current });
			raf = requestAnimationFrame(animate);
		};
		raf = requestAnimationFrame(animate);

		return () => {
			cancelAnimationFrame(raf);
			globe.destroy();
		};
	}, [markers]);

	useEffect(() => {
		if (!focus) {
			autoRotateRef.current = true;
			return;
		}
		autoRotateRef.current = false;
		const [phi, theta] = locationToAngles(focus.latitude, focus.longitude);
		targetPhiRef.current = shortestPhi(phiRef.current, phi);
		targetThetaRef.current = theta;
	}, [focus]);

	return (
		<canvas ref={canvasRef} className={cn("aspect-square w-full", className)} />
	);
};
