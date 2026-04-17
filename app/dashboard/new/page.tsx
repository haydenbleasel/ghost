import { games } from '@/games';
import { getHetznerCatalog } from '@/lib/hetzner/catalog';
import { requireUser } from '@/lib/session';
import { NewServerForm, type GameOption } from './_components/form';

const NewServerPage = async () => {
  await requireUser();
  const catalog = await getHetznerCatalog();

  const gameOptions: GameOption[] = games
    .filter((g) => g.enabled)
    .map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      image: g.image,
      requirements: { cpu: g.requirements.cpu, memory: g.requirements.memory },
    }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1">
        <h1 className="font-semibold text-2xl">New server</h1>
        <p className="text-muted-foreground text-sm">
          Pick a game, a machine, and a region. Provisioning starts immediately.
        </p>
      </header>
      <NewServerForm games={gameOptions} serverTypes={catalog.serverTypes} />
    </div>
  );
};

export default NewServerPage;
