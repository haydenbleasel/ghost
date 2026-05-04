import { describe, expect, test } from "bun:test";

import { createMetadata } from "@/lib/seo/metadata";

describe("createMetadata", () => {
  test("appends ' | Ghost' to titles by default", () => {
    const meta = createMetadata({ description: "d", title: "Page" });
    expect(meta.title).toBe("Page | Ghost");
    expect(meta.openGraph?.title).toBe("Page | Ghost");
    expect(meta.appleWebApp).toMatchObject({ title: "Page | Ghost" });
  });

  test("bareTitle skips the suffix", () => {
    const meta = createMetadata({
      bareTitle: true,
      description: "d",
      title: "Ghost",
    });
    expect(meta.title).toBe("Ghost");
    expect(meta.openGraph?.title).toBe("Ghost");
  });

  test("propagates description to og description", () => {
    const meta = createMetadata({ description: "Hello", title: "T" });
    expect(meta.description).toBe("Hello");
    expect(meta.openGraph?.description).toBe("Hello");
  });

  test("when image is provided, attaches a single 1200x630 og image", () => {
    const meta = createMetadata({
      description: "d",
      image: "https://example.com/og.png",
      title: "Page",
    });
    expect(meta.openGraph?.images).toEqual([
      {
        alt: "Page",
        height: 630,
        url: "https://example.com/og.png",
        width: 1200,
      },
    ]);
  });

  test("omits og images when no image is provided", () => {
    const meta = createMetadata({ description: "d", title: "Page" });
    expect(meta.openGraph?.images).toBeUndefined();
  });

  test("metadataBase is built from NEXT_PUBLIC_APP_URL", () => {
    const meta = createMetadata({ description: "d", title: "Page" });
    expect(meta.metadataBase).toBeInstanceOf(URL);
    expect((meta.metadataBase as URL).origin).toBe("http://localhost:3000");
  });

  test("merges caller-provided metadata over defaults", () => {
    const meta = createMetadata({
      alternates: { canonical: "/canonical" },
      description: "d",
      title: "Page",
    });
    expect(meta.alternates?.canonical).toBe("/canonical");
    // Defaults still present.
    expect(meta.applicationName).toBe("Ghost");
  });
});
