import { redirect } from "next/navigation";

import { games } from "@/games";
import { SNAPSHOT_ENVIRONMENT } from "@/lib/env";
import { getProviderWithImage } from "@/lib/providers";
import { MissingProviderCredentialsError } from "@/lib/providers/errors";
import type { Catalog } from "@/lib/providers/types";
import { requireUser } from "@/lib/session";

import { NewServerForm } from "./components/form";
import type { GameOption } from "./components/form";

const NewServerPage = async () => {
  await requireUser();
  let catalog: Catalog;
  try {
    const { provider, imageId } =
      await getProviderWithImage(SNAPSHOT_ENVIRONMENT);
    catalog = await provider.getCatalog(imageId);
  } catch (error) {
    if (error instanceof MissingProviderCredentialsError) {
      redirect("/account");
    }
    throw error;
  }

  const gameOptions: GameOption[] = games
    .filter((g) => g.enabled)
    .map((g) => ({
      description: g.description,
      dockerImage: g.dockerImage,
      id: g.id,
      image: g.image,
      name: g.name,
      requirements: {
        cpu: g.requirements.cpu,
        disk: g.requirements.disk,
        memory: g.requirements.memory,
      },
      settings: g.settings,
    }));

  return (
    <NewServerForm
      games={gameOptions}
      serverTypes={catalog.serverTypes}
      currency={catalog.currency}
    />
  );
};

export default NewServerPage;
