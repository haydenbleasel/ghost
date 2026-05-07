import Link from "next/link";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { createMetadata } from "@/lib/seo/metadata";
import { getSession } from "@/lib/session";

export const metadata = createMetadata({
  description:
    "How Ghost provisions a dedicated game server in under a minute — golden images on Hetzner, a signed long-poll agent, and a Vercel Workflow that ties it all together.",
  title: "How it works",
});

const stack = [
  {
    description:
      "The dashboard, API routes, server actions, and Better Auth all run on Vercel. The control plane holds coordination state only; game state lives on the VMs.",
    label: "Browser → Next.js on Vercel",
  },
  {
    description:
      "Provisioning and teardown run as durable workflows via the Vercel Workflow SDK. Each step emits a structured activity event that the UI streams over SSE.",
    label: "Workflow SDK (durable steps)",
  },
  {
    description:
      "Server records, agent registrations, command queue, activity log, and ring-buffered console logs live in Neon Postgres via Prisma.",
    label: "Neon Postgres (Prisma)",
  },
  {
    description:
      "Upstash Redis keeps a monotonic event sequence per server and a short-TTL nonce cache for replay protection on signed agent requests.",
    label: "Upstash Redis (event seq + nonce dedupe)",
  },
  {
    description:
      "Each game server is a Hetzner Cloud VM booted from your prebaked snapshot. Docker, the agent, and every game image are already on disk, so first boot does not need to install or download anything.",
    label: "Hetzner Cloud VMs",
  },
  {
    description:
      "The agent is a single Bun-compiled Linux binary that supervises one Docker Compose project per VM. It long-polls the API for commands and never accepts inbound connections.",
    label: "ghost-agent (on each VM)",
  },
] as const;

const provisionSteps = [
  {
    body: "The createServer action kicks off the provisionServer workflow and writes a row with desiredState=ready.",
    title: "Server action",
  },
  {
    body: "A short-lived bootstrap JWT is minted, scoped to a single server. Cloud-init writes it to /etc/ghost/bootstrap.json on first boot.",
    title: "Bootstrap token",
  },
  {
    body: "Hetzner is asked to create a VM from your golden snapshot. The workflow waits for the VM to reach the running state.",
    title: "Hetzner create",
  },
  {
    body: "On boot, ghost-agent exchanges the bootstrap JWT for a persistent Ed25519 key registration via POST /api/agent/enroll.",
    title: "Agent enroll",
  },
  {
    body: "An UPDATE_CONFIG command is enqueued with the rendered docker-compose.yml. The agent picks it up within ~1s, writes it to disk, and runs docker compose up.",
    title: "Push compose",
  },
  {
    body: "The workflow waits for the container to report healthy, then sets the row to ready. The dashboard streams activity events throughout the run, so the state change is reflected in the UI immediately.",
    title: "Healthy → ready",
  },
] as const;

const buildSteps = [
  {
    body: "stepCompileAgent boots a Vercel Sandbox at the current commit SHA, runs bun install + bun run agent:build, and uploads dist/ghost-agent to Vercel Blob (private). It mints a short-lived JWT for GET /api/snapshot/agent-binary.",
    title: "Compile the agent",
  },
  {
    body: "stepCreateBuilderVm POSTs to Hetzner with cloud-init userData that curls the binary, installs Docker and a UFW baseline, pre-pulls every game's image, and runs shutdown -h now.",
    title: "Spin up a builder VM",
  },
  {
    body: "Once the VM is off, the workflow calls create_image, polls until the image is available, writes the new ID onto a UserSnapshot row scoped to the current deployment environment, then deletes both the builder VM and the previous snapshot.",
    title: "Snapshot and swap",
  },
] as const;

const HowItWorks = async () => {
  const session = await getSession();
  const isAuthenticated = Boolean(session?.user);

  return (
    <article>
      <header className="border-b border-foreground/10">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-24 sm:py-32">
          <Logo className="size-32" />
          <h1 className="mt-12 text-balance font-display font-medium text-5xl tracking-tight sm:text-6xl">
            Dedicated game servers in under a minute.
          </h1>
          <p className="text-balance text-lg text-muted-foreground">
            Ghost is a control plane on Vercel that orchestrates Docker game
            servers on your own Hetzner Cloud account. This page describes the
            architecture, how a new server is provisioned, how the agent on each
            VM communicates with the control plane, and how the golden image is
            built.
          </p>
        </div>
      </header>

      <section className="border-b border-foreground/10">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-20">
          <div className="flex flex-col gap-4">
            <span className="font-mono text-muted-foreground text-xs uppercase tracking-wide">
              Architecture
            </span>
            <h2 className="text-balance font-display font-medium text-3xl tracking-tight sm:text-4xl">
              A control plane on Vercel, runtimes on Hetzner
            </h2>
            <p className="text-muted-foreground">
              The system has two halves. The control plane runs on Vercel and
              holds all coordination state. The runtime — the game container
              itself — runs on a Hetzner VM you own. The two communicate over a
              signed long-poll channel that the agent always initiates outbound,
              so VMs do not need to expose a management port.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-3 rounded-md border border-foreground/10 bg-muted/40 p-5">
                <span className="font-mono text-muted-foreground text-xs uppercase tracking-wide">
                  Control plane · Vercel
                </span>
                <p className="font-medium tracking-tight">Next.js</p>
                <ul className="flex flex-col gap-1 text-muted-foreground text-sm">
                  <li>Prisma → Neon Postgres</li>
                  <li>Upstash Redis (event seq)</li>
                  <li>Workflow SDK (durable steps)</li>
                </ul>
              </div>
              <div className="flex flex-col gap-3 rounded-md border border-foreground/10 bg-muted/40 p-5">
                <span className="font-mono text-muted-foreground text-xs uppercase tracking-wide">
                  Runtime · Hetzner VM
                </span>
                <p className="font-medium tracking-tight">ghost-agent</p>
                <ul className="flex flex-col gap-1 text-muted-foreground text-sm">
                  <li>Docker → game container</li>
                </ul>
              </div>
            </div>
            <p className="text-center font-mono text-muted-foreground text-xs">
              Browser ←SSE→ Vercel ←long-poll→ Hetzner VM
            </p>
          </div>

          <dl className="flex flex-col">
            {stack.map(({ description, label }) => (
              <div
                key={label}
                className="flex flex-col gap-2 border-t border-foreground/10 py-6 first:border-t-0 first:pt-0"
              >
                <dt className="font-medium text-sm tracking-tight">{label}</dt>
                <dd className="text-muted-foreground text-sm leading-relaxed">
                  {description}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-b border-foreground/10">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-20">
          <div className="flex flex-col gap-4">
            <span className="font-mono text-muted-foreground text-xs uppercase tracking-wide">
              Golden image
            </span>
            <h2 className="text-balance font-display font-medium text-3xl tracking-tight sm:text-4xl">
              A per-user Hetzner snapshot, baked from the dashboard
            </h2>
            <p className="text-muted-foreground">
              New servers are ready in roughly 60 seconds because almost nothing
              happens on first boot. Docker, the ghost-agent binary, the UFW
              baseline, and every supported game's container image are already
              on disk. A new VM only needs to read its bootstrap token and start
              a container.
            </p>
            <p className="text-muted-foreground">
              That pre-baked disk is the golden image — a Hetzner snapshot
              scoped to your account. Snapshots are per-project, so each user
              builds their own. The build is triggered from the dashboard rather
              than the CLI.
            </p>
          </div>

          <ol className="flex flex-col gap-6">
            {buildSteps.map(({ body, title }, index) => (
              <li key={title} className="flex gap-5">
                <span className="font-mono text-muted-foreground text-sm tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="flex flex-col gap-2">
                  <h3 className="font-display font-medium tracking-tight">
                    {title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {body}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <p className="text-muted-foreground text-sm">
            The whole run takes ~10–15 minutes. You can watch it live in the
            panel itself, or with <code>bun workflow:ui</code> locally.
            Concurrent builds for the same user are blocked at the database
            level by a unique constraint on{" "}
            <code>User.activeSnapshotBuildId</code>. Adding a new game is a
            one-line change to the cloud-init in{" "}
            <code>lib/workflows/build-snapshot-cloud-init.ts</code> plus a
            rebuild.
          </p>

          <aside className="rounded-md border border-foreground/10 bg-muted/40 p-5 text-sm">
            <p className="font-medium tracking-tight">
              Why the builder VM is throwaway
            </p>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              Hetzner can only snapshot a real VM. The builder exists solely to
              pull everything onto disk and shut itself down so the snapshot
              captures it. Once the image is recorded on your row, the workflow
              deletes both the builder and the previous snapshot, so only one
              snapshot is billed at a time.
            </p>
          </aside>
        </div>
      </section>

      <section className="border-b border-foreground/10">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-20">
          <div className="flex flex-col gap-4">
            <span className="font-mono text-muted-foreground text-xs uppercase tracking-wide">
              Provisioning
            </span>
            <h2 className="text-balance font-display font-medium text-3xl tracking-tight sm:text-4xl">
              From server action to healthy container, in six steps
            </h2>
            <p className="text-muted-foreground">
              Provisioning is a durable workflow, not a single request. Each
              step is idempotent and resumable. Hetzner can take 20–40 seconds
              to boot a VM, and a dropped connection should not be able to
              abandon a half-provisioned server.
            </p>
          </div>

          <ol className="flex flex-col gap-6">
            {provisionSteps.map(({ body, title }, index) => (
              <li key={title} className="flex gap-5">
                <span className="font-mono text-muted-foreground text-sm tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="flex flex-col gap-2">
                  <h3 className="font-display font-medium tracking-tight">
                    {title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {body}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <p className="text-muted-foreground text-sm">
            Start, stop, and restart follow the same pattern: a row is added to
            the command queue, the agent picks it up on its next long-poll,
            executes the corresponding Docker command, and acks. Delete flips{" "}
            <code>desiredState=deleted</code> and starts the{" "}
            <code>teardownServer</code> workflow, which sends a final DELETE to
            the agent, destroys the Hetzner VM, and marks the row deleted.
          </p>
        </div>
      </section>

      <section className="border-b border-foreground/10">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-20">
          <div className="flex flex-col gap-4">
            <span className="font-mono text-muted-foreground text-xs uppercase tracking-wide">
              Agent protocol
            </span>
            <h2 className="text-balance font-display font-medium text-3xl tracking-tight sm:text-4xl">
              Signed, outbound-only requests over long-poll
            </h2>
            <p className="text-muted-foreground">
              The ghost-agent is the only process on a game VM that communicates
              with Ghost. It only opens connections outward, so the VM's public
              ports are limited to the game's own.
            </p>
          </div>

          <dl className="flex flex-col">
            <div className="flex flex-col gap-2 border-foreground/10 py-6 first:pt-0">
              <dt className="font-medium text-sm tracking-tight">Enrollment</dt>
              <dd className="text-muted-foreground text-sm leading-relaxed">
                <code>POST /api/agent/enroll</code> exchanges the one-shot
                bootstrap JWT for a persistent Ed25519 public key registration.
                After that, the JWT is dead.
              </dd>
            </div>
            <div className="flex flex-col gap-2 border-t border-foreground/10 py-6">
              <dt className="font-medium text-sm tracking-tight">Signing</dt>
              <dd className="text-muted-foreground text-sm leading-relaxed">
                Every subsequent request carries <code>X-Ghost-Agent</code>,{" "}
                <code>X-Ghost-Ts</code>, <code>X-Ghost-Nonce</code>, and{" "}
                <code>X-Ghost-Sig</code>. The signature is{" "}
                <code>ed25519(method || path || ts || nonce || body)</code>{" "}
                against a canonicalized body shared with the server via the{" "}
                <code>protocol/</code> package.
              </dd>
            </div>
            <div className="flex flex-col gap-2 border-t border-foreground/10 py-6">
              <dt className="font-medium text-sm tracking-tight">
                Replay protection
              </dt>
              <dd className="text-muted-foreground text-sm leading-relaxed">
                Timestamp skew tolerance is 60 seconds. Nonces are stored in
                Redis with a 5 minute TTL — long enough to cover the skew
                window, short enough to keep the set small.
              </dd>
            </div>
            <div className="flex flex-col gap-2 border-t border-foreground/10 py-6">
              <dt className="font-medium text-sm tracking-tight">
                Long-poll for commands
              </dt>
              <dd className="text-muted-foreground text-sm leading-relaxed">
                <code>GET /api/agent/commands?wait=25</code> hangs for up to 25
                seconds, polling Postgres every ~750ms, and returns either the
                next batch of commands or a 204. This is the path that turns a
                UI action into a Docker command on the VM.
              </dd>
            </div>
            <div className="flex flex-col gap-2 border-t border-foreground/10 py-6">
              <dt className="font-medium text-sm tracking-tight">
                Events, logs, heartbeat
              </dt>
              <dd className="text-muted-foreground text-sm leading-relaxed">
                The agent batches activity events and console output, POSTs them
                to the API, and acks completed commands. Heartbeats are sent
                every ~30 seconds. The dashboard fans these back out to the
                browser over SSE, with a cursor on the monotonic sequence so
                reconnecting clients resume from where they left off.
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="border-b border-foreground/10">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-20">
          <div className="flex flex-col gap-4">
            <span className="font-mono text-muted-foreground text-xs uppercase tracking-wide">
              Infrastructure
            </span>
            <h2 className="text-balance font-display font-medium text-3xl tracking-tight sm:text-4xl">
              Your Hetzner account, your token, your billing
            </h2>
            <p className="text-muted-foreground">
              Ghost does not hold the VMs. After signing in, you paste a Hetzner
              Cloud API token on <code>/dashboard/account/backend</code>, which
              is encrypted at rest in Postgres. Every Hetzner call — snapshot
              build, server create, server delete — runs against your project
              with your token, and is billed to you.
            </p>
            <p className="text-muted-foreground">
              This means your snapshots and your servers continue to exist in
              your Hetzner account independently of Ghost. If you stop using
              Ghost, the resources remain under your control.
            </p>
          </div>

          <aside className="rounded-md border border-foreground/10 bg-muted/40 p-5 text-sm">
            <p className="font-medium tracking-tight">Hetzner account limits</p>
            <p className="mt-2 text-muted-foreground leading-relaxed">
              New Hetzner Cloud accounts are capped at 5 servers per project
              until verified. Once the limit is reached, provisioning fails with{" "}
              <code>resource_limit_exceeded</code>. A limit increase can be
              requested from Hetzner support.
            </p>
          </aside>
        </div>
      </section>

      <section>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-32 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="max-w-[24ch] text-balance font-display font-medium text-3xl tracking-tight sm:text-4xl">
            Try it out
          </h2>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            {isAuthenticated ? (
              <>
                <Button asChild size="lg">
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
                <Button asChild size="lg" variant="ghost">
                  <Link href="/dashboard/new">Create a game</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild size="lg">
                  <Link href="/sign-up">Get started</Link>
                </Button>
                <Button asChild size="lg" variant="ghost">
                  <Link
                    href="https://github.com/haydenbleasel/ghost"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Read the source
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>
    </article>
  );
};

export default HowItWorks;
