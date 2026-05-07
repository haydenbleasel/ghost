import {
  CodeIcon,
  PlusIcon,
  ScrollTextIcon,
  SparklesIcon,
  TerminalIcon,
  WrenchIcon,
  ZapIcon,
} from "lucide-react";
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
    icon: CodeIcon,
    title: "Open source, end to end",
  },
  {
    description:
      "A dedicated server in under a minute. Docker, SSH, and firewalls — handled for you.",
    icon: ZapIcon,
    title: "Up in seconds",
  },
  {
    description:
      "A dashboard you'll actually want to look at. Sensible defaults instead of a hundred toggles.",
    icon: SparklesIcon,
    title: "Beautiful by default",
  },
  {
    description:
      "Stream stdout straight from the container and run commands without leaving the page.",
    icon: TerminalIcon,
    title: "Live console",
  },
  {
    description:
      "Every start, stop, restart, and config change in a clean, filterable timeline.",
    icon: ScrollTextIcon,
    title: "Honest activity log",
  },
  {
    description:
      "Bring your own Hetzner key. Your infrastructure, your billing, your data — we just wire it up.",
    icon: WrenchIcon,
    title: "Your infra, your rules",
  },
] as const;

const HeroCtas = ({ isAuthenticated }: { isAuthenticated: boolean }) =>
  isAuthenticated ? (
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
  );

const FinalCtas = ({ isAuthenticated }: { isAuthenticated: boolean }) =>
  isAuthenticated ? (
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
    { label: "Vendor lock-in", value: "None" },
  ];

  return (
    <div data-uidotsh-pick="Home page style" className="contents">
      {/* Option 1: Marketing layout (current) */}
      <div data-uidotsh-option="Marketing (current)" className="contents">
        <section className="border-b border-foreground/10">
          <div className="mx-auto grid w-full max-w-6xl gap-16 px-6 py-24 sm:py-32 lg:grid-cols-[3fr_2fr] lg:items-end lg:gap-24">
            <div className="flex flex-col gap-8">
              <span className="font-mono text-muted-foreground text-xs uppercase tracking-wide">
                Open source · Free forever
              </span>
              <h1 className="max-w-[20ch] text-balance font-display font-medium text-5xl tracking-tight sm:text-7xl">
                Simple, beautiful game servers.
              </h1>
              <p className="max-w-[48ch] text-balance text-lg text-muted-foreground">
                Ghost is a dedicated game server platform you can read, fork,
                and self-host. Spin one up in seconds — Docker, SSH, and
                firewall rules handled for you.
              </p>
              <div className="flex flex-row items-center gap-3">
                <HeroCtas isAuthenticated={isAuthenticated} />
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-10 border-t border-foreground/10 pt-10 lg:border-t-0 lg:pt-0">
              {stats.map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-2">
                  <dt className="font-mono text-muted-foreground text-xs uppercase tracking-wide">
                    {label}
                  </dt>
                  <dd className="font-medium text-3xl tabular-nums tracking-tight">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="border-b border-foreground/10">
          <div className="mx-auto w-full max-w-6xl px-6 py-24">
            <div className="flex flex-col gap-4 pb-12">
              <span className="font-mono text-muted-foreground text-xs uppercase tracking-wide">
                Supported games
              </span>
              <h2 className="max-w-[24ch] text-balance font-display font-medium text-4xl tracking-tight sm:text-5xl">
                Pick a game. Pick a region. Press play.
              </h2>
            </div>
            <ul
              role="list"
              className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4"
            >
              {supportedGames.map((game) => (
                <li key={game.id} className="flex flex-col gap-4">
                  <div className="relative aspect-[460/215] w-full overflow-hidden rounded-md">
                    <Image
                      src={game.image}
                      alt={`${game.name} dedicated game server`}
                      fill
                      sizes="(min-width: 1024px) 240px, (min-width: 640px) 33vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium tracking-tight">
                      {game.name}
                    </span>
                    <p className="line-clamp-2 text-muted-foreground text-sm">
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
                  <p className="line-clamp-2 text-muted-foreground text-sm">
                    Open an issue on GitHub and we&apos;ll add it to the
                    roadmap.
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </section>

        <section className="border-b border-foreground/10">
          <div className="mx-auto w-full max-w-6xl px-6 py-24">
            <div className="flex flex-col gap-4 pb-12">
              <span className="font-mono text-muted-foreground text-xs uppercase tracking-wide">
                What you get
              </span>
              <h2 className="max-w-[28ch] text-balance font-display font-medium text-4xl tracking-tight sm:text-5xl">
                Everything you need, nothing you don&apos;t.
              </h2>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ description, icon: Icon, title }) => (
                <div
                  key={title}
                  className="flex flex-col gap-3 border-t border-foreground/10 py-8 pr-6"
                >
                  <Icon className="size-5 text-foreground" />
                  <dt className="font-medium tracking-tight">{title}</dt>
                  <dd className="text-muted-foreground text-sm">
                    {description}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section>
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-32 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="max-w-[24ch] text-balance font-display font-medium text-4xl tracking-tight sm:text-5xl">
              Ready to play?
            </h2>
            <div className="flex flex-row items-center gap-3">
              <FinalCtas isAuthenticated={isAuthenticated} />
            </div>
          </div>
        </section>
      </div>

      {/* Option 2: Editorial mirror */}
      <div data-uidotsh-option="Editorial" className="contents" hidden>
        <article>
          <header className="border-b border-foreground/10">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-24 sm:py-32">
              <Logo className="size-32" />
              <span className="mt-12 font-mono text-muted-foreground text-xs uppercase tracking-wide">
                Open source · Free forever
              </span>
              <h1 className="text-balance font-display font-medium text-5xl tracking-tight sm:text-6xl">
                Simple, beautiful game servers.
              </h1>
              <p className="max-w-[60ch] text-balance text-lg text-muted-foreground">
                Ghost is a dedicated game server platform you can read, fork,
                and self-host. Spin one up in seconds — Docker, SSH, and
                firewall rules handled for you.
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
                <p className="max-w-[60ch] text-muted-foreground">
                  Every supported game lives behind the same one-click flow.
                  Your VM, your token, your billing.
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
                      <p className="text-muted-foreground text-sm leading-relaxed">
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
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Open an issue on GitHub and we&apos;ll add it to the
                      roadmap.
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
                <p className="max-w-[60ch] text-muted-foreground">
                  A small list of opinionated defaults that take you from
                  sign-up to a healthy game server in under a minute.
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
                      <p className="text-muted-foreground text-sm leading-relaxed">
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
      </div>

      {/* Option 3: Editorial wide visuals */}
      <div data-uidotsh-option="Editorial wide" className="contents" hidden>
        <article>
          <header className="border-b border-foreground/10">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-24 sm:py-32">
              <Logo className="size-32" />
              <span className="mt-12 font-mono text-muted-foreground text-xs uppercase tracking-wide">
                Open source · Free forever
              </span>
              <h1 className="text-balance font-display font-medium text-5xl tracking-tight sm:text-6xl">
                Simple, beautiful game servers.
              </h1>
              <p className="max-w-[60ch] text-balance text-lg text-muted-foreground">
                Ghost is a dedicated game server platform you can read, fork,
                and self-host. Spin one up in seconds — Docker, SSH, and
                firewall rules handled for you.
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
            <div className="mx-auto w-full max-w-3xl px-6 pt-20">
              <div className="flex flex-col gap-4 pb-12">
                <span className="font-mono text-muted-foreground text-xs uppercase tracking-wide">
                  Supported games
                </span>
                <h2 className="max-w-[28ch] text-balance font-display font-medium text-3xl tracking-tight sm:text-4xl">
                  Pick a game. Pick a region. Press play.
                </h2>
                <p className="max-w-[60ch] text-muted-foreground">
                  Every supported game lives behind the same one-click flow.
                  Your VM, your token, your billing.
                </p>
              </div>
            </div>
            <div className="mx-auto w-full max-w-6xl px-6 pb-20">
              <ul
                role="list"
                className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4"
              >
                {supportedGames.map((game) => (
                  <li key={game.id} className="flex flex-col gap-4">
                    <div className="relative aspect-[460/215] w-full overflow-hidden rounded-md">
                      <Image
                        src={game.image}
                        alt={`${game.name} dedicated game server`}
                        fill
                        sizes="(min-width: 1024px) 240px, (min-width: 640px) 33vw, 50vw"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium tracking-tight">
                        {game.name}
                      </span>
                      <p className="line-clamp-2 text-muted-foreground text-sm">
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
                    <p className="line-clamp-2 text-muted-foreground text-sm">
                      Open an issue on GitHub and we&apos;ll add it to the
                      roadmap.
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
                <p className="max-w-[60ch] text-muted-foreground">
                  Six things we cared enough to get right.
                </p>
              </div>
              <dl className="flex flex-col">
                {features.map(({ description, icon: Icon, title }) => (
                  <div
                    key={title}
                    className="flex flex-col gap-2 border-t border-foreground/10 py-6 first:border-t-0 first:pt-0"
                  >
                    <dt className="flex items-center gap-2 font-medium text-sm tracking-tight">
                      <Icon className="size-4 text-foreground" />
                      {title}
                    </dt>
                    <dd className="text-muted-foreground text-sm leading-relaxed">
                      {description}
                    </dd>
                  </div>
                ))}
              </dl>
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
      </div>

      {/* Option 4: Editorial magazine */}
      <div data-uidotsh-option="Editorial magazine" className="contents" hidden>
        <article>
          <header className="border-b border-foreground/10">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-32 sm:py-40">
              <Logo className="size-40" />
              <span className="mt-12 font-mono text-muted-foreground text-xs uppercase tracking-wider">
                Ghost · No. 01 · Open source &amp; free forever
              </span>
              <h1 className="text-balance font-display font-medium text-6xl tracking-tight sm:text-7xl">
                Simple, beautiful game servers.
              </h1>
              <p className="max-w-[60ch] text-pretty text-lg text-muted-foreground first-letter:float-left first-letter:mr-3 first-letter:font-display first-letter:font-medium first-letter:text-6xl first-letter:text-foreground">
                Ghost is a dedicated game server platform you can read, fork,
                and self-host. Spin one up in seconds — Docker, SSH, and
                firewall rules handled for you.
              </p>
              <p className="font-mono text-muted-foreground text-xs uppercase tracking-wider">
                ~60s provisioning · {supportedGames.length} games supported ·
                Runs on Hetzner · Zero lock-in
              </p>
              <div className="flex flex-row items-center gap-3">
                <HeroCtas isAuthenticated={isAuthenticated} />
              </div>
            </div>
          </header>

          <section className="border-b border-foreground/10">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-6 py-24">
              <div className="flex items-baseline gap-6 border-foreground/10 border-b pb-8">
                <span className="font-display font-medium text-5xl tabular-nums tracking-tight">
                  01
                </span>
                <h2 className="font-display font-medium text-3xl tracking-tight sm:text-4xl">
                  Supported games
                </h2>
              </div>
              <p className="max-w-[60ch] text-lg text-muted-foreground">
                Pick a game. Pick a region. Press play. Every supported game
                lives behind the same one-click flow.
              </p>
              <ul
                role="list"
                className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2"
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
                      <span className="font-display font-medium text-lg tracking-tight">
                        {game.name}
                      </span>
                      <p className="text-muted-foreground text-sm leading-relaxed">
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
                    <span className="font-display font-medium text-lg tracking-tight">
                      Don&apos;t see yours?
                    </span>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Open an issue on GitHub and we&apos;ll add it to the
                      roadmap.
                    </p>
                  </div>
                </li>
              </ul>
            </div>
          </section>

          <section className="border-b border-foreground/10">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-6 py-24">
              <div className="flex items-baseline gap-6 border-foreground/10 border-b pb-8">
                <span className="font-display font-medium text-5xl tabular-nums tracking-tight">
                  02
                </span>
                <h2 className="font-display font-medium text-3xl tracking-tight sm:text-4xl">
                  What you get
                </h2>
              </div>
              <p className="max-w-[60ch] text-lg text-muted-foreground">
                A small list of opinionated defaults that take you from sign-up
                to a healthy game server in under a minute.
              </p>
              <ol className="flex flex-col">
                {features.map(({ description, title }, index) => (
                  <li
                    key={title}
                    className="flex gap-6 border-t border-foreground/10 py-8 first:border-t-0 first:pt-0"
                  >
                    <span className="font-display font-medium text-3xl text-muted-foreground/60 tabular-nums tracking-tight">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="flex flex-col gap-2">
                      <h3 className="font-display font-medium text-xl tracking-tight">
                        {title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section>
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-6 py-32">
              <div className="flex items-baseline gap-6 border-foreground/10 border-b pb-8">
                <span className="font-display font-medium text-5xl tabular-nums tracking-tight">
                  03
                </span>
                <h2 className="font-display font-medium text-3xl tracking-tight sm:text-4xl">
                  Ready to play?
                </h2>
              </div>
              <div className="flex flex-row items-center gap-3">
                <FinalCtas isAuthenticated={isAuthenticated} />
              </div>
            </div>
          </section>
        </article>
      </div>
    </div>
  );
};

export default Home;
