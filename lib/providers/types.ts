import "server-only";

export type ProviderId = "hetzner";

export type ServerResourceId = string;
export type ImageResourceId = string;

export type ServerStatus =
  | "initializing"
  | "starting"
  | "running"
  | "stopping"
  | "off"
  | "deleting"
  | "rebuilding"
  | "migrating"
  | "unknown";

export interface ProviderServer {
  id: ServerResourceId;
  status: ServerStatus;
  ipv4: string | null;
  /** Machine memory in GB, when the provider reports it. */
  memoryGb: number | null;
}

export type ProviderImageStatus = "creating" | "available" | "unavailable";
export type ProviderImageType = "snapshot" | "backup";

export interface ProviderImage {
  id: ImageResourceId;
  status: ProviderImageStatus;
  type: ProviderImageType;
  description: string | null;
  createdAt: string;
  diskSizeGb: number | null;
  imageSizeGb: number | null;
  protected: boolean;
  boundToServerId: ServerResourceId | null;
  createdFromServerId: ServerResourceId | null;
}

export interface CreateServerInput {
  name: string;
  serverType: string;
  location: string;
  imageId: ImageResourceId;
  userData: string;
}

export type MetricKind = "cpu" | "disk" | "network";

export interface MetricsQuery {
  kind: MetricKind;
  start: string;
  end: string;
}

export interface CatalogLocation {
  name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  available: boolean;
  supported: boolean;
}

export interface CatalogServerType {
  name: string;
  description: string;
  cores: number;
  memory: number;
  disk: number;
  cpuType: "shared" | "dedicated";
  architecture: "x86" | "arm";
  pricePerMonth: number;
  locations: CatalogLocation[];
}

export interface Catalog {
  serverTypes: CatalogServerType[];
  imageArchitecture: "x86" | "arm";
  currency: string;
}

export type CredentialValidationResult =
  | { ok: true }
  | { ok: false; reason: "unauthorized" | "unreachable" };

export interface BuilderProfile {
  serverType: string;
  location: string;
  baseImage: string;
}

export interface Provider {
  readonly id: ProviderId;

  createServer: (input: CreateServerInput) => Promise<ProviderServer>;
  getServer: (id: ServerResourceId) => Promise<ProviderServer | null>;
  /** Exact-name lookup, used to adopt a VM whose create response was lost. */
  getServerByName: (name: string) => Promise<ProviderServer | null>;
  deleteServer: (id: ServerResourceId) => Promise<{ deleted: boolean }>;
  shutdownServer: (id: ServerResourceId) => Promise<void>;
  poweroffServer: (id: ServerResourceId) => Promise<void>;
  poweronServer: (id: ServerResourceId) => Promise<void>;
  rescaleServer: (id: ServerResourceId, serverType: string) => Promise<void>;
  getMetrics: (
    id: ServerResourceId,
    query: MetricsQuery
  ) => Promise<{ metrics: unknown }>;

  setBackupsEnabled: (id: ServerResourceId, enabled: boolean) => Promise<void>;

  createSnapshot: (
    serverId: ServerResourceId,
    opts: { description?: string }
  ) => Promise<ImageResourceId>;
  getImage: (id: ImageResourceId) => Promise<ProviderImage | null>;
  deleteImage: (id: ImageResourceId) => Promise<{ deleted: boolean }>;
  listImagesForServer: (serverId: ServerResourceId) => Promise<ProviderImage[]>;
  rebuildFromImage: (
    serverId: ServerResourceId,
    imageId: ImageResourceId
  ) => Promise<void>;

  getCatalog: (referenceImageId: ImageResourceId) => Promise<Catalog>;
  validateCredentials: () => Promise<CredentialValidationResult>;
}
