import { prisma } from '@/lib/db';

async function main() {
  const stuck = await prisma.server.findMany({
    where: { hetznerServerId: null, deletedAt: null, phase: 'queued' },
    select: {
      id: true,
      name: true,
      phase: true,
      observedState: true,
      desiredState: true,
    },
  });

  console.log(`Found ${stuck.length} stuck servers:`);
  for (const s of stuck) {
    console.log(
      `  ${s.id}  name="${s.name}"  phase=${s.phase}  desired=${s.desiredState}  observed=${s.observedState}`
    );
  }

  if (stuck.length === 0) {
    console.log('Nothing to clean up.');
    return;
  }

  const { count } = await prisma.server.deleteMany({
    where: { id: { in: stuck.map((s) => s.id) } },
  });

  console.log(`Deleted ${count} servers (children cascaded).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
