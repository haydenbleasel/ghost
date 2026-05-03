import { redirect } from "next/navigation";

import { games } from "@/games";
import { MissingHetznerCredentialsError } from "@/lib/hetzner";
import { getHetznerCatalog } from "@/lib/hetzner/catalog";
import { getUserHetznerContext } from "@/lib/hetzner/credentials";
import { requireUser } from "@/lib/session";

import { NewServerForm } from "./_components/form";
import type { GameOption } from "./_components/form";

const NewServerPage = async () => {
  const user = await requireUser();
  let catalog: Awaited<ReturnType<typeof getHetznerCatalog>>;
  try {
    const { client, imageId } = await getUserHetznerContext(user.id);
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
      requirements: { cpu: g.requirements.cpu, memory: g.requirements.memory },
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
