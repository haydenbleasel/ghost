import { PlusIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { games } from "@/games";
import { getSession } from "@/lib/session";

const features = [
  {
    description:
      "The whole stack lives on GitHub. Read it, fork it, self-host it — there's no black box.",
    title: "Open source, end to end",
  },
  {
    description:
      "A dedicated server in under a minute. Docker, SSH, and firewalls — handled for you.",
    title: "Up in seconds",
  },
  {
    description:
      "A dashboard you'll actually want to look at. Sensible defaults instead of a hundred toggles.",
    title: "Beautiful by default",
  },
  {
    description:
      "Stream stdout straight from the container and run commands without leaving the page.",
    title: "Live console",
  },
  {
    description:
      "Every start, stop, restart, and config change in a clean, filterable timeline.",
    title: "Honest activity log",
  },
  {
    description:
      "Bring your own Hetzner key. Your infrastructure, your billing, your data — we just wire it up.",
    title: "Your infra, your rules",
  },
] as const;

const HeroCtas = ({ isAuthenticated }: { isAuthenticated: boolean }) => (
  <>
    <Button asChild size="lg">
      <Link href={isAuthenticated ? "/dashboard/new" : "/sign-up"}>
        Start a game server
      </Link>
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
);

const FinalCtas = ({ isAuthenticated }: { isAuthenticated: boolean }) =>
  isAuthenticated ? (
    <Button asChild size="lg">
      <Link href="/dashboard/new">Start a game server</Link>
    </Button>
  ) : (
    <>
      <Button asChild size="lg">
        <Link href="/sign-up">Get started</Link>
      </Button>
      <Button asChild size="lg" variant="ghost">
        <Link href="/sign-in">Sign in</Link>
      </Button>
    </>
  );

const Home = async () => {
  const session = await getSession();
  const isAuthenticated = Boolean(session?.user);

  const supportedGames = games.filter((g) => g.enabled);

  const stats = [
    { label: "Provision time", value: "~60s" },
    { label: "Games supported", value: String(supportedGames.length) },
    { label: "Powered by", value: "Hetzner" },
    { label: "Regions", value: "6" },
  ];

  return (
    <article>
      <header className="border-b border-foreground/10">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-24 sm:py-32">
          <Logo className="size-32" />
          <h1 className="mt-12 text-balance font-display font-medium text-5xl tracking-tight sm:text-6xl">
            Simple, beautiful game servers in under a minute.
          </h1>
          <p className="max-w-[60ch] text-balance text-lg text-muted-foreground">
            Ghost is a dedicated game server platform you can read, fork, and
            self-host. Spin one up in seconds — Docker, SSH, and firewall rules
            handled for you.
          </p>
          <div className="flex flex-row items-center gap-3">
            <HeroCtas isAuthenticated={isAuthenticated} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-8 border-t border-foreground/10 pt-10 sm:grid-cols-4">
            {stats.map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-2">
                <dt className="font-mono text-muted-foreground text-xs uppercase tracking-wide">
                  {label}
                </dt>
                <dd className="font-medium text-2xl tabular-nums tracking-tight">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <section className="border-b border-foreground/10">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-20">
          <div className="flex flex-col gap-4">
            <span className="font-mono text-muted-foreground text-xs uppercase tracking-wide">
              Supported games
            </span>
            <h2 className="max-w-[28ch] text-balance font-display font-medium text-3xl tracking-tight sm:text-4xl">
              Pick a game. Pick a region. Press play.
            </h2>
            <p className="max-w-[60ch] text-balance text-muted-foreground">
              Every supported game lives behind the same one-click flow. Your
              VM, your token, your billing.
            </p>
          </div>
          <ul
            role="list"
            className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2"
          >
            {supportedGames.map((game) => (
              <li key={game.id} className="flex flex-col gap-4">
                <div className="relative aspect-[460/215] w-full overflow-hidden rounded-md">
                  <Image
                    src={game.image}
                    alt={`${game.name} dedicated game server`}
                    fill
                    sizes="(min-width: 768px) 380px, 90vw"
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-medium tracking-tight">
                    {game.name}
                  </span>
                  <p className="text-balance text-muted-foreground text-sm leading-relaxed">
                    {game.description}
                  </p>
                </div>
              </li>
            ))}
            <li className="flex flex-col gap-4">
              <Link
                href="https://github.com/haydenbleasel/ghost/issues/new"
                target="_blank"
                rel="noreferrer"
                className="group flex aspect-[460/215] w-full items-center justify-center gap-2 rounded-md border border-foreground/15 border-dashed text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
              >
                <PlusIcon className="size-4" />
                <span className="font-medium text-sm">Request a game</span>
              </Link>
              <div className="flex flex-col gap-1">
                <span className="font-medium tracking-tight">
                  Don&apos;t see yours?
                </span>
                <p className="text-balance text-muted-foreground text-sm leading-relaxed">
                  Open an issue on GitHub and we&apos;ll add it to the roadmap.
                </p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <section className="border-b border-foreground/10">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-20">
          <div className="flex flex-col gap-4">
            <span className="font-mono text-muted-foreground text-xs uppercase tracking-wide">
              What you get
            </span>
            <h2 className="max-w-[32ch] text-balance font-display font-medium text-3xl tracking-tight sm:text-4xl">
              Everything you need, nothing you don&apos;t.
            </h2>
            <p className="max-w-[60ch] text-balance text-muted-foreground">
              A small list of opinionated defaults that take you from sign-up to
              a healthy game server in under a minute.
            </p>
          </div>
          <ol className="flex flex-col gap-6">
            {features.map(({ description, title }, index) => (
              <li key={title} className="flex gap-5">
                <span className="font-mono text-muted-foreground text-sm tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="flex flex-col gap-2">
                  <h3 className="font-display font-medium tracking-tight">
                    {title}
                  </h3>
                  <p className="text-balance text-muted-foreground text-sm leading-relaxed">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-32 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="max-w-[24ch] text-balance font-display font-medium text-3xl tracking-tight sm:text-4xl">
            Ready to play?
          </h2>
          <div className="flex flex-row items-center gap-3">
            <FinalCtas isAuthenticated={isAuthenticated} />
          </div>
        </div>
      </section>
    </article>
  );
};

export default Home;
