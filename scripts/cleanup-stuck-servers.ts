import { prisma } from "@/lib/db";

const main = async () => {
  const stuck = await prisma.server.findMany({
    select: {
      desiredState: true,
      id: true,
      name: true,
      observedState: true,
      phase: true,
    },
    where: { deletedAt: null, hetznerServerId: null, phase: "queued" },
  });

  console.log(`Found ${stuck.length} stuck servers:`);
  for (const s of stuck) {
    console.log(
      `  ${s.id}  name="${s.name}"  phase=${s.phase}  desired=${s.desiredState}  observed=${s.observedState}`,
    );
  }

  if (stuck.length === 0) {
    console.log("Nothing to clean up.");
    return;
  }

  const { count } = await prisma.server.deleteMany({
    where: { id: { in: stuck.map((s) => s.id) } },
  });

  console.log(`Deleted ${count} servers (children cascaded).`);
};

try {
  await main();
} catch (error) {
  console.error(error);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
