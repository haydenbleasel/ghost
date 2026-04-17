"use client";
import { CheckIcon, CircleXIcon } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "create", label: "Create server", phases: ["queued", "provisioning"] },
  { key: "boot", label: "Boot VM", phases: ["booting"] },
  { key: "agent", label: "Connect agent", phases: ["agent_connected"] },
  { key: "install", label: "Install game", phases: ["installing"] },
  { key: "start", label: "Start server", phases: ["starting"] },
  { key: "health", label: "Run health checks", phases: ["healthy"] },
] as const;

const PHASE_ORDER: string[] = STEPS.flatMap((s) => [...s.phases]);

type StepStatus = "done" | "active" | "pending" | "error";

const stepStatus = (
  currentIndex: number,
  stepStart: number,
  stepEnd: number,
  isErrorStep: boolean,
): StepStatus => {
  if (isErrorStep) {
    return "error";
  }
  if (currentIndex > stepEnd) {
    return "done";
  }
  if (currentIndex >= stepStart) {
    return "active";
  }
  return "pending";
};

const StepIcon = ({ status }: { status: StepStatus }) => {
  if (status === "done") {
    return <CheckIcon className="size-4 shrink-0 text-emerald-500" />;
  }
  if (status === "active") {
    return <Spinner className="size-4 shrink-0 text-muted-foreground" />;
  }
  if (status === "error") {
    return <CircleXIcon className="size-4 shrink-0 text-destructive" />;
  }
  return <div className="size-4 shrink-0" />;
};

export const ProvisioningStatus = ({
  phase,
  errored,
  errorReason,
}: {
  phase: string;
  errored: boolean;
  errorReason: string | null;
}) => {
  const currentIndex = PHASE_ORDER.indexOf(phase);
  // Legacy fallback: older records stored phase='errored' (now we preserve
  // the in-flight phase), which returns -1 — pin the error to the first step.
  const errorIndex = errored && currentIndex === -1 ? 0 : currentIndex;

  return (
    <section className="flex flex-col gap-2 rounded-2xl bg-sidebar p-2">
      <div className="px-4 pt-2 pb-1">
        <h2 className="text-sm font-medium text-muted-foreground">Provisioning your server</h2>
      </div>
      <div className="grid gap-2 rounded-2xl bg-background p-2 shadow-sm/5">
        {STEPS.map((step) => {
          const stepStart = PHASE_ORDER.indexOf(step.phases[0]);
          const stepEnd = stepStart + step.phases.length - 1;
          const isErrorStep = errored && errorIndex >= stepStart && errorIndex <= stepEnd;
          const status = stepStatus(currentIndex, stepStart, stepEnd, isErrorStep);

          return (
            <div key={step.key} className="flex flex-col gap-1 rounded-lg px-3 py-2">
              <div className="flex flex-row items-center gap-4">
                <StepIcon status={status} />
                <span
                  className={cn(
                    "text-sm",
                    status === "pending" && "text-muted-foreground",
                    status === "error" && "text-destructive",
                  )}
                >
                  {step.label}
                </span>
              </div>
              {isErrorStep && errorReason && (
                <p className="pl-8 text-xs text-destructive">{errorReason}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
