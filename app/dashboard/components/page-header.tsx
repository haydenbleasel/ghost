import type { ReactNode } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  icon?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  flush?: boolean;
  children?: ReactNode;
}

export const PageHeader = ({
  title,
  icon,
  meta,
  actions,
  flush,
  children,
}: PageHeaderProps) => (
  <header
    className={cn(
      "flex shrink-0 flex-col gap-4 border-b px-4 pt-4 pb-4 sm:gap-6 md:px-8 md:pt-8 md:pb-8",
      flush && "pb-0 md:pb-0"
    )}
  >
    <div className="flex items-center gap-3">
      {icon ? <div className="shrink-0">{icon}</div> : null}
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
    {children}
  </header>
);

export const PageBody = ({
  children,
  className,
  wide,
  flush,
}: {
  children: ReactNode;
  className?: string;
  wide?: boolean;
  flush?: boolean;
}) => (
  <div
    className={cn(
      "min-h-0 flex-1 px-4 md:px-8",
      flush ? "flex flex-col" : "overflow-y-auto py-6 md:py-8",
      className
    )}
  >
    {wide ? children : <div className="w-full max-w-3xl">{children}</div>}
  </div>
);
