import type { FormHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PanelProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}

export const Panel = ({ title, action, className, children, ...props }: PanelProps) => (
  <section
    className={cn("flex flex-col gap-2 rounded-2xl bg-sidebar p-2", className)}
    {...props}
  >
    {(title || action) && (
      <div className="flex items-center justify-between gap-2 px-4 pt-2 pb-1">
        {title ? (
          <h2 className="font-medium text-sm text-muted-foreground">{title}</h2>
        ) : (
          <span />
        )}
        {action}
      </div>
    )}
    {children}
  </section>
);

type PanelCardProps =
  | ({ as?: "div" } & HTMLAttributes<HTMLDivElement>)
  | ({ as: "form" } & FormHTMLAttributes<HTMLFormElement>);

export const PanelCard = ({ className, ...props }: PanelCardProps) => {
  const baseClass = cn("rounded-2xl bg-background p-2 shadow-sm/5", className);

  if (props.as === "form") {
    const { as: _as, ...formProps } = props;
    return <form className={baseClass} {...formProps} />;
  }

  const { as: _as, ...divProps } = props as { as?: "div" } & HTMLAttributes<HTMLDivElement>;
  return <div className={baseClass} {...divProps} />;
};
