"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = [
  { href: "/dashboard/account", label: "Profile", value: "profile" },
  { href: "/dashboard/account/password", label: "Password", value: "password" },
  { href: "/dashboard/account/passkeys", label: "Passkeys", value: "passkeys" },
  { href: "/dashboard/account/backend", label: "Backend", value: "backend" },
] as const;

export const AccountTabs = () => {
  const segment = useSelectedLayoutSegment();
  const activeTab =
    segment && TABS.some((tab) => tab.value === segment) ? segment : "profile";

  return (
    <Tabs className="[&_[data-slot=tabs-trigger]]:flex-none" value={activeTab}>
      <TabsList variant="line">
        {TABS.map((tab) => (
          <TabsTrigger asChild key={tab.value} value={tab.value}>
            <Link href={tab.href}>{tab.label}</Link>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};
