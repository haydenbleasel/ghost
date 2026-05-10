import { describe, expect, test } from "bun:test";

import { getHetznerCatalog } from "@/lib/providers/hetzner/catalog";
import type { HetznerClient } from "@/lib/providers/hetzner/client";

const ok = <T>(data: T) => ({
  data,
  error: undefined,
  response: new Response(null, { status: 200 }),
});

const err = (status: number, code: string, message: string) => ({
  data: undefined,
  error: { error: { code, message } },
  response: new Response(null, { status, statusText: message }),
});

interface FakeData {
  serverTypes: unknown;
  datacenters: unknown;
  image: unknown;
  pricing: unknown;
}

const makeClient = (data: FakeData): HetznerClient => {
  const GET = (path: string, _opts?: unknown) => {
    if (path === "/server_types") {
      return Promise.resolve(ok({ server_types: data.serverTypes }));
    }
    if (path === "/datacenters") {
      return Promise.resolve(ok({ datacenters: data.datacenters }));
    }
    if (path === "/images/{id}") {
      return Promise.resolve(ok({ image: data.image }));
    }
    if (path === "/pricing") {
      return Promise.resolve(ok({ pricing: data.pricing }));
    }
    throw new Error(`unexpected path ${path}`);
  };
  // The catalog code only uses `client.GET`, so a partial mock suffices.
  return { GET } as unknown as HetznerClient;
};

const baseImage = { architecture: "x86", id: 1 };

const baseServerType = (overrides: Record<string, unknown> = {}) => ({
  architecture: "x86",
  cores: 2,
  cpu_type: "shared",
  deprecated: false,
  description: "CX22",
  disk: 40,
  id: 100,
  memory: 4,
  name: "cx22",
  prices: [
    { location: "fsn1", price_monthly: { gross: "5.00" } },
    { location: "nbg1", price_monthly: { gross: "6.00" } },
  ],
  ...overrides,
});

const fsnDc = {
  location: {
    city: "Falkenstein",
    country: "DE",
    latitude: 50.476_12,
    longitude: 12.370_071,
    name: "fsn1",
  },
  server_types: { available: [100], supported: [100, 200] },
};

const nbgDc = {
  location: {
    city: "Nuremberg",
    country: "DE",
    latitude: 49.452_102,
    longitude: 11.076_665,
    name: "nbg1",
  },
  server_types: { available: [], supported: [100] },
};

describe("getHetznerCatalog", () => {
  test("returns supported locations sorted available-first then by name", async () => {
    const client = makeClient({
      datacenters: [nbgDc, fsnDc],
      image: baseImage,
      pricing: { currency: "EUR" },
      serverTypes: [baseServerType()],
    });

    const catalog = await getHetznerCatalog(client, "1");

    expect(catalog.currency).toBe("EUR");
    expect(catalog.imageArchitecture).toBe("x86");
    expect(catalog.serverTypes).toHaveLength(1);

    const [type] = catalog.serverTypes;
    expect(type.name).toBe("cx22");
    expect(type.cpuType).toBe("shared");
    expect(type.architecture).toBe("x86");
    expect(type.locations.map((l) => l.name)).toEqual(["fsn1", "nbg1"]);
    expect(type.locations[0]).toMatchObject({ available: true, name: "fsn1" });
    expect(type.locations[1]).toMatchObject({ available: false, name: "nbg1" });
  });

  test("falls back to alphabetical name sort when locations share availability", async () => {
    // All datacenters here mark id=100 as both supported AND available, so the
    // available!==available branch never fires and the localeCompare tiebreaker
    // determines the order.
    const ashDc = {
      location: {
        city: "Ashburn",
        country: "US",
        latitude: 39.04,
        longitude: -77.49,
        name: "ash",
      },
      server_types: { available: [100], supported: [100] },
    };
    const hilDc = {
      location: {
        city: "Hillsboro",
        country: "US",
        latitude: 45.52,
        longitude: -122.99,
        name: "hil",
      },
      server_types: { available: [100], supported: [100] },
    };
    const client = makeClient({
      datacenters: [hilDc, ashDc, fsnDc],
      image: baseImage,
      pricing: { currency: "EUR" },
      serverTypes: [baseServerType()],
    });
    const catalog = await getHetznerCatalog(client, "1");
    expect(catalog.serverTypes[0].locations.map((l) => l.name)).toEqual([
      "ash",
      "fsn1",
      "hil",
    ]);
  });

  test("uses minimum monthly price across supported locations", async () => {
    const client = makeClient({
      datacenters: [fsnDc, nbgDc],
      image: baseImage,
      pricing: { currency: "EUR" },
      serverTypes: [baseServerType()],
    });
    const { serverTypes } = await getHetznerCatalog(client, "1");
    expect(serverTypes[0].pricePerMonth).toBe(5);
  });

  test("filters out deprecated and architecture-mismatched types", async () => {
    const client = makeClient({
      datacenters: [fsnDc],
      image: { architecture: "arm", id: 7 },
      pricing: { currency: "USD" },
      serverTypes: [
        baseServerType({ deprecated: true, id: 100, name: "deprecated" }),
        baseServerType({ architecture: "x86", id: 101, name: "x86-only" }),
        baseServerType({ architecture: "arm", id: 100, name: "arm-match" }),
      ],
    });
    const catalog = await getHetznerCatalog(client, "7");
    expect(catalog.imageArchitecture).toBe("arm");
    expect(catalog.serverTypes.map((t) => t.name)).toEqual(["arm-match"]);
    expect(catalog.currency).toBe("USD");
  });

  test("drops server types with zero supported locations", async () => {
    const orphanType = baseServerType({ id: 999, name: "orphan" });
    const client = makeClient({
      // fsn supports id=100 only; nothing supports id=999.
      datacenters: [fsnDc],
      image: baseImage,
      pricing: { currency: "EUR" },
      serverTypes: [orphanType],
    });
    const catalog = await getHetznerCatalog(client, "1");
    expect(catalog.serverTypes).toEqual([]);
  });

  test("sorts results by price, memory, then cores", async () => {
    const client = makeClient({
      datacenters: [fsnDc],
      image: baseImage,
      pricing: { currency: "EUR" },
      serverTypes: [
        baseServerType({
          cores: 4,
          id: 100,
          memory: 8,
          name: "expensive",
          prices: [{ location: "fsn1", price_monthly: { gross: "20.00" } }],
        }),
        baseServerType({
          cores: 2,
          id: 100,
          memory: 4,
          name: "cheap",
          prices: [{ location: "fsn1", price_monthly: { gross: "5.00" } }],
        }),
        baseServerType({
          cores: 2,
          id: 100,
          memory: 4,
          name: "mid",
          prices: [{ location: "fsn1", price_monthly: { gross: "10.00" } }],
        }),
      ],
    });
    const catalog = await getHetznerCatalog(client, "1");
    expect(catalog.serverTypes.map((t) => t.name)).toEqual([
      "cheap",
      "mid",
      "expensive",
    ]);
  });

  test("throws when the image is not found", async () => {
    const client = makeClient({
      datacenters: [fsnDc],
      image: undefined,
      pricing: { currency: "EUR" },
      serverTypes: [baseServerType()],
    });
    await expect(getHetznerCatalog(client, "1")).rejects.toThrow(
      /image not found/iu
    );
  });

  test("propagates provider API errors", async () => {
    const client = {
      GET: (path: string) => {
        if (path === "/server_types") {
          return Promise.resolve(err(500, "internal", "boom"));
        }
        if (path === "/datacenters") {
          return Promise.resolve(ok({ datacenters: [fsnDc] }));
        }
        if (path === "/images/{id}") {
          return Promise.resolve(ok({ image: baseImage }));
        }
        if (path === "/pricing") {
          return Promise.resolve(ok({ pricing: { currency: "EUR" } }));
        }
        throw new Error(`unexpected ${path}`);
      },
    } as unknown as HetznerClient;
    await expect(getHetznerCatalog(client, "1")).rejects.toThrow(
      /Provider API internal: boom/u
    );
  });

  test("defaults currency to EUR when pricing has none", async () => {
    const client = makeClient({
      datacenters: [fsnDc],
      image: baseImage,
      pricing: {},
      serverTypes: [baseServerType()],
    });
    const catalog = await getHetznerCatalog(client, "1");
    expect(catalog.currency).toBe("EUR");
  });
});
