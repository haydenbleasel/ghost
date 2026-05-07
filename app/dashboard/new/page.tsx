import { redirect } from "next/navigation";

import { games } from "@/games";
import { SNAPSHOT_ENVIRONMENT } from "@/lib/env";
import { MissingHetznerCredentialsError } from "@/lib/hetzner";
import { getHetznerCatalog } from "@/lib/hetzner/catalog";
import { getUserHetznerImageContext } from "@/lib/hetzner/credentials";
import { requireUser } from "@/lib/session";

import { NewServerForm } from "./components/form";
import type { GameOption } from "./components/form";

const NewServerPage = async () => {
  const user = await requireUser();
  let catalog: Awaited<ReturnType<typeof getHetznerCatalog>>;
  try {
    const { client, imageId } = await getUserHetznerImageContext(
      user.id,
      SNAPSHOT_ENVIRONMENT
    );
    catalog = await getHetznerCatalog(client, imageId);
  } catch (error) {
    if (error instanceof MissingHetznerCredentialsError) {
      redirect("/dashboard/account/backend");
    }
    throw error;
  }

  const gameOptions: GameOption[] = games
    .filter((g) => g.enabled)
    .map((g) => ({
      description: g.description,
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
