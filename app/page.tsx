import {
  ArrowRightIcon,
  ArrowUpRightIcon,
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
import { redirect } from "next/navigation";

import { HomeHeader } from "@/app/_components/home-header";
import { Button } from "@/components/ui/button";
import { games } from "@/games";
import { getSession } from "@/lib/session";

const GhostLogo = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 14 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden
  >
    <title>Ghost</title>
    <path
      d="M12.5 7C12.5 3.96243 10.0376 1.5 7 1.5C3.96243 1.5 1.5 3.96243 1.5 7V14.2754L1.91992 13.8848C2.79553 13.0691 4.09852 12.9133 5.1416 13.5L6.87695 14.4766C6.95321 14.5194 7.04679 14.5194 7.12305 14.4766L8.8584 13.5C9.9015 12.9133 11.2045 13.0691 12.0801 13.8848L12.5 14.2754V7ZM14 14.667C14 15.8294 12.6139 16.4319 11.7637 15.6396L11.0576 14.9824C10.6598 14.6118 10.0677 14.541 9.59375 14.8076L7.8584 15.7842C7.32581 16.0835 6.67516 16.0835 6.14258 15.7842L4.40625 14.8076C3.93237 14.5411 3.34025 14.6118 2.94238 14.9824L2.23633 15.6396C1.38606 16.4319 0 15.8294 0 14.667V7C0 3.13401 3.13401 0 7 0C10.866 0 14 3.13401 14 7V14.667Z"
      fill="currentColor"
    />
    <path
      d="M4 6C4 5.44772 4.44772 5 5 5C5.55222 5 6 5.44769 6 6C6 6.55224 5.55224 7 5 7C4.44769 7 4 6.55222 4 6Z"
      fill="currentColor"
    />
    <path
      d="M8 6C8 5.44769 8.44778 5 9 5C9.55222 5 10 5.44769 10 6C10 6.55224 9.55224 7 9 7C8.44776 7 8 6.55224 8 6Z"
      fill="currentColor"
    />
  </svg>
);

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

const stats = [
  { label: "Provision time", value: "~45s" },
  { label: "Games supported", value: "6" },
  { label: "Powered by", value: "Hetzner" },
  { label: "Vendor lock-in", value: "None" },
] as const;

const Home = async () => {
  const session = await getSession();
  if (session?.user) {
    redirect("/dashboard");
  }

  const supportedGames = games.filter((g) => g.enabled);

  return (
    <div className="flex min-h-dvh flex-col">
      <HomeHeader>
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link
            href="/"
            aria-label="Homepage"
            className="inline-flex items-center gap-2 font-medium tracking-tight"
          >
            <GhostLogo className="size-4" />
            <span>Ghost</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/sign-in"
              className="text-muted-foreground text-sm transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Button asChild size="sm">
              <Link href="/sign-up">
                Get started
                <ArrowRightIcon />
              </Link>
            </Button>
          </nav>
        </div>
      </HomeHeader>

      <main className="flex-1">
        <section className="border-b border-foreground/10">
          <div className="mx-auto grid w-full max-w-6xl gap-16 px-6 py-24 sm:py-32 lg:grid-cols-[3fr_2fr] lg:items-end lg:gap-24">
            <div className="flex flex-col gap-8">
              <span className="font-mono text-muted-foreground text-xs uppercase tracking-wide">
                Open source · Free forever
              </span>
              <h1 className="max-w-[20ch] text-balance font-medium text-5xl tracking-tight sm:text-7xl">
                Simple, beautiful game servers.
              </h1>
              <p className="max-w-[48ch] text-pretty text-lg text-muted-foreground">
                Ghost is a dedicated game server platform you can read, fork,
                and self-host. Spin one up in seconds — Docker, SSH, and
                firewall rules handled for you.
              </p>
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <Button asChild size="lg">
                  <Link href="/sign-up">
                    Get started
                    <ArrowRightIcon />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="ghost">
                  <Link
                    href="https://github.com/haydenbleasel/ghost"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Read the source
                    <ArrowUpRightIcon />
                  </Link>
                </Button>
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
              <h2 className="max-w-[24ch] text-balance font-medium text-4xl tracking-tight sm:text-5xl">
                Pick a game. Pick a region. Press play.
              </h2>
            </div>
            <ul
              role="list"
              className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4"
            >
              {supportedGames.map((game) => (
                <li key={game.id} className="flex flex-col gap-4">
                  <div className="relative aspect-square w-full overflow-hidden rounded-md">
                    <Image
                      src={game.image}
                      alt={game.name}
                      fill
                      sizes="(min-width: 1024px) 240px, (min-width: 640px) 33vw, 50vw"
                      className="object-cover"
                      placeholder="blur"
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
                  className="group flex aspect-square w-full items-center justify-center gap-2 rounded-md border border-foreground/15 border-dashed text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
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
              <h2 className="max-w-[28ch] text-balance font-medium text-4xl tracking-tight sm:text-5xl">
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
            <h2 className="max-w-[24ch] text-balance font-medium text-4xl tracking-tight sm:text-5xl">
              Ready to play?
            </h2>
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg">
                <Link href="/sign-up">
                  Get started
                  <ArrowRightIcon />
                </Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-foreground/10">
        <p className="mx-auto w-full max-w-6xl px-6 py-10 text-center text-muted-foreground text-sm">
          Copyright Hayden Bleasel {new Date().getFullYear()}. All rights
          reserved.
        </p>
      </footer>
    </div>
  );
};

export default Home;
