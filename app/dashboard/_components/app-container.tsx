"use client";

import type { ReactNode } from "react";

import { SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface AppContainerProps {
  children: ReactNode;
}

export const AppContainer = ({ children }: AppContainerProps) => {
  const sidebar = useSidebar();

  return (
    <SidebarInset
      className={cn(
        "transition-all bg-background",
        sidebar.open && "rounded-l-3xl border-l"
      )}
    >
      {children}
    </SidebarInset>
  );
};
