"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { CatalogServerType } from "@/lib/hetzner/catalog";

export interface Specs {
  typeName: string;
  cores: number;
  memory: number;
  disk: number;
  cpuType: "shared" | "dedicated";
  architecture: "x86" | "arm";
}

export interface ServerLocation {
  name: string;
  city: string | null;
  country: string | null;
}

export interface ServerView {
  id: string;
  name: string;
  game: string;
  ipv4: string | null;
  phase: string;
  observedState: string;
  desiredState: string;
  errorReason: string | null;
  lastHeartbeatAt: string | null;
  serverType: string;
  backupsEnabled: boolean;
  specs: Specs | null;
  location: ServerLocation | null;
}

interface Value {
  server: ServerView;
  eligibleTypes: CatalogServerType[];
  currency: string;
  updateServer: (patch: Partial<ServerView>) => void;
}

const ServerContext = createContext<Value | null>(null);

export const useServer = () => {
  const ctx = useContext(ServerContext);
  if (!ctx) {
    throw new Error("useServer must be used within ServerProvider");
  }
  return ctx;
};

export const ServerProvider = ({
  value,
  children,
}: {
  value: Value;
  children: ReactNode;
}) => <ServerContext.Provider value={value}>{children}</ServerContext.Provider>;
