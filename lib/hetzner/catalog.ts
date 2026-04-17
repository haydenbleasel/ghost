import 'server-only';
import { env } from '@/lib/env';
import {
  getImage,
  listDatacenters,
  listServerTypes,
} from './client';

export type CatalogLocation = {
  name: string;
  city: string;
  country: string;
  available: boolean;
  supported: boolean;
};

export type CatalogServerType = {
  name: string;
  description: string;
  cores: number;
  memory: number;
  disk: number;
  cpuType: 'shared' | 'dedicated';
  architecture: 'x86' | 'arm';
  pricePerMonth: number;
  locations: CatalogLocation[];
};

export type Catalog = {
  serverTypes: CatalogServerType[];
  imageArchitecture: 'x86' | 'arm';
};

export async function getHetznerCatalog(): Promise<Catalog> {
  const [serverTypes, datacenters, image] = await Promise.all([
    listServerTypes(),
    listDatacenters(),
    getImage(env.HETZNER_IMAGE_ID),
  ]);

  const perLocation = new Map<
    string,
    {
      city: string;
      country: string;
      supported: Set<number>;
      available: Set<number>;
    }
  >();

  for (const dc of datacenters) {
    const name = dc.location.name;
    const existing = perLocation.get(name) ?? {
      city: dc.location.city,
      country: dc.location.country,
      supported: new Set<number>(),
      available: new Set<number>(),
    };
    for (const id of dc.server_types.supported) existing.supported.add(id);
    for (const id of dc.server_types.available) existing.available.add(id);
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
        if (!info.supported.has(t.id)) continue;
        locations.push({
          name,
          city: info.city,
          country: info.country,
          supported: true,
          available: info.available.has(t.id),
        });
      }
      locations.sort((a, b) => {
        if (a.available !== b.available) return a.available ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      const prices = locations
        .map((l) => priceByLocation.get(l.name))
        .filter((p): p is number => typeof p === 'number' && !Number.isNaN(p));
      const minPrice = prices.length ? Math.min(...prices) : 0;

      return {
        name: t.name,
        description: t.description,
        cores: t.cores,
        memory: t.memory,
        disk: t.disk,
        cpuType: t.cpu_type,
        architecture: t.architecture,
        pricePerMonth: minPrice,
        locations,
      };
    })
    .filter((t) => t.locations.length > 0)
    .sort(
      (a, b) =>
        a.memory - b.memory ||
        a.cores - b.cores ||
        a.pricePerMonth - b.pricePerMonth
    );

  return { serverTypes: types, imageArchitecture: image.architecture };
}
