import "server-only";
import { env } from "@/lib/env";

import { hetzner, throwIfHetznerError } from "./index";

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

export const getHetznerCatalog = async (): Promise<Catalog> => {
  const [serverTypesRes, datacentersRes, imageRes, pricingRes] =
    await Promise.all([
      hetzner.GET("/server_types", {
        next: { revalidate: 60 },
        params: { query: { per_page: 50 } },
      }),
      hetzner.GET("/datacenters", { next: { revalidate: 60 } }),
      hetzner.GET("/images/{id}", {
        next: { revalidate: 3600 },
        params: { path: { id: Number(env.HETZNER_IMAGE_ID) } },
      }),
      hetzner.GET("/pricing", { next: { revalidate: 86_400 } }),
    ]);

  throwIfHetznerError(serverTypesRes.error, serverTypesRes.response);
  throwIfHetznerError(datacentersRes.error, datacentersRes.response);
  throwIfHetznerError(imageRes.error, imageRes.response);
  throwIfHetznerError(pricingRes.error, pricingRes.response);

  const serverTypes = serverTypesRes.data?.server_types ?? [];
  const datacenters = datacentersRes.data?.datacenters ?? [];
  const image = imageRes.data?.image;
  const currency = pricingRes.data?.pricing.currency ?? "EUR";

  if (!image) {
    throw new Error("Hetzner image not found");
  }

  const perLocation = new Map<
    string,
    {
      city: string;
      country: string;
      latitude: number;
      longitude: number;
      supported: Set<number>;
      available: Set<number>;
    }
  >();

  for (const dc of datacenters) {
    const { name } = dc.location;
    const existing = perLocation.get(name) ?? {
      available: new Set<number>(),
      city: dc.location.city,
      country: dc.location.country,
      latitude: dc.location.latitude,
      longitude: dc.location.longitude,
      supported: new Set<number>(),
    };
    for (const id of dc.server_types.supported) {
      existing.supported.add(id);
    }
    for (const id of dc.server_types.available) {
      existing.available.add(id);
    }
    perLocation.set(name, existing);
  }

  const types = serverTypes
    .filter((t) => !t.deprecated)
    .filter((t) => t.architecture === image.architecture)
    .map<CatalogServerType>((t) => {
      const priceByLocation = new Map(
        t.prices.map((p) => [p.location, Number(p.price_monthly.gross)])
      );

      const locations: CatalogLocation[] = [];
      for (const [name, info] of perLocation) {
        if (!info.supported.has(t.id)) {
          continue;
        }
        locations.push({
          available: info.available.has(t.id),
          city: info.city,
          country: info.country,
          latitude: info.latitude,
          longitude: info.longitude,
          name,
          supported: true,
        });
      }
      locations.sort((a, b) => {
        if (a.available !== b.available) {
          return a.available ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      const prices = locations
        .map((l) => priceByLocation.get(l.name))
        .filter((p): p is number => typeof p === "number" && !Number.isNaN(p));
      const minPrice = prices.length ? Math.min(...prices) : 0;

      return {
        architecture: t.architecture,
        cores: t.cores,
        cpuType: t.cpu_type,
        description: t.description,
        disk: t.disk,
        locations,
        memory: t.memory,
        name: t.name,
        pricePerMonth: minPrice,
      };
    })
    .filter((t) => t.locations.length > 0)
    .toSorted(
      (a, b) =>
        a.pricePerMonth - b.pricePerMonth ||
        a.memory - b.memory ||
        a.cores - b.cores
    );

  return {
    currency,
    imageArchitecture: image.architecture,
    serverTypes: types,
  };
};
