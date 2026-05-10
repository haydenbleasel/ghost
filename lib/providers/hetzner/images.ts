import "server-only";
import { ProviderApiError } from "../errors";
import type {
  ImageResourceId,
  ProviderImage,
  ProviderImageStatus,
  ProviderImageType,
  ServerResourceId,
} from "../types";
import { throwIfHetznerError } from "./client";
import type { HetznerClient } from "./client";

interface HetznerImage {
  id: number;
  status: string;
  type: string;
  description: string | null;
  created: string;
  disk_size: number | null;
  image_size: number | null;
  protection: { delete: boolean };
  bound_to: number | null;
  created_from: { id: number; name: string } | null;
}

const toImageStatus = (status: string): ProviderImageStatus => {
  if (status === "creating" || status === "available") {
    return status;
  }
  return "unavailable";
};

const toImageType = (type: string): ProviderImageType =>
  type === "backup" ? "backup" : "snapshot";

export const mapHetznerImage = (image: HetznerImage): ProviderImage => ({
  boundToServerId: image.bound_to === null ? null : String(image.bound_to),
  createdAt: image.created,
  createdFromServerId:
    image.created_from === null ? null : String(image.created_from.id),
  description: image.description,
  diskSizeGb: image.disk_size,
  id: String(image.id),
  imageSizeGb: image.image_size,
  protected: image.protection.delete,
  status: toImageStatus(image.status),
  type: toImageType(image.type),
});

const parseImageId = (imageId: ImageResourceId): number => {
  const parsed = Number(imageId);
  if (!Number.isFinite(parsed)) {
    throw new ProviderApiError(
      400,
      "invalid_image_id",
      `Invalid image id: ${imageId}`
    );
  }
  return parsed;
};

export const createImageOps = (client: HetznerClient) => ({
  createSnapshot: async (
    serverId: ServerResourceId,
    opts: { description?: string }
  ): Promise<ImageResourceId> => {
    const { data, error, response } = await client.POST(
      "/servers/{id}/actions/create_image",
      {
        body: {
          description: opts.description || undefined,
          type: "snapshot",
        },
        params: { path: { id: Number(serverId) } },
      }
    );
    if (!response.ok) {
      throwIfHetznerError(error, response);
    }
    const imageId = data?.image?.id;
    if (typeof imageId !== "number") {
      throw new TypeError("Provider create_image returned no image id");
    }
    return String(imageId);
  },

  deleteImage: async (id: ImageResourceId): Promise<{ deleted: boolean }> => {
    const numericId = parseImageId(id);
    const { error, response } = await client.DELETE("/images/{id}", {
      params: { path: { id: numericId } },
    });
    if (response.status === 404) {
      return { deleted: false };
    }
    if (!response.ok) {
      throwIfHetznerError(error, response);
    }
    return { deleted: true };
  },

  getImage: async (id: ImageResourceId): Promise<ProviderImage | null> => {
    const numericId = parseImageId(id);
    const { data, error, response } = await client.GET("/images/{id}", {
      params: { path: { id: numericId } },
    });
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throwIfHetznerError(error, response);
    }
    if (!data?.image) {
      return null;
    }
    return mapHetznerImage(data.image as HetznerImage);
  },

  listImagesForServer: async (
    serverId: ServerResourceId
  ): Promise<ProviderImage[]> => {
    const numericServerId = Number(serverId);
    const { data, error, response } = await client.GET("/images", {
      params: {
        query: {
          per_page: 50,
          sort: ["created:desc"],
          type: ["backup", "snapshot"],
        },
      },
    });
    if (!response.ok) {
      throwIfHetznerError(error, response);
    }
    return (data?.images ?? [])
      .filter(
        (img) =>
          img.bound_to === numericServerId ||
          (img.type === "snapshot" && img.created_from?.id === numericServerId)
      )
      .map((img) => mapHetznerImage(img as HetznerImage));
  },

  rebuildFromImage: async (
    serverId: ServerResourceId,
    imageId: ImageResourceId
  ): Promise<void> => {
    const numericImageId = parseImageId(imageId);
    const { error, response } = await client.POST(
      "/servers/{id}/actions/rebuild",
      {
        body: { image: String(numericImageId) },
        params: { path: { id: Number(serverId) } },
      }
    );
    if (!response.ok) {
      throwIfHetznerError(error, response);
    }
  },
});
