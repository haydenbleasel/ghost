import Link from "next/link";
import type { ReactNode } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface PageHeaderTab {
  label: string;
  value: string;
  href: string;
}

interface PageHeaderProps {
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
  tabs?: readonly PageHeaderTab[];
  activeTab?: string;
}

export const PageHeader = ({
  title,
  meta,
  actions,
  tabs,
  activeTab,
}: PageHeaderProps) => (
  <header
    className={cn(
      "flex shrink-0 flex-col gap-4 border-b px-4 pt-4 pb-4 sm:gap-6 md:px-8 md:pt-8 md:pb-8",
      tabs && "pb-0 md:pb-0"
    )}
  >
    <div className="flex items-center gap-2">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="font-medium text-2xl text-foreground tracking-tight md:text-4xl">
              {title}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      {meta ? <div className="flex items-center gap-2">{meta}</div> : null}
      {actions ? (
        <div className="ml-auto flex items-center gap-2">{actions}</div>
      ) : null}
    </div>
    {tabs ? (
      <Tabs value={activeTab}>
        <TabsList variant="line">
          {tabs.map((tab) => (
            <TabsTrigger asChild key={tab.value} value={tab.value}>
              <Link href={tab.href}>{tab.label}</Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    ) : null}
  </header>
);

export const PageBody = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div className={cn("flex-1 px-4 py-6 md:px-8 md:py-8", className)}>
    <div className="mx-auto w-full max-w-5xl">{children}</div>
  </div>
);
