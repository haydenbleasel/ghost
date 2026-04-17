'use client';
import { CheckIcon, CircleIcon, CircleXIcon } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

const STEPS = [
  { key: 'create', label: 'Create server', phases: ['queued', 'provisioning'] },
  { key: 'boot', label: 'Boot VM', phases: ['booting'] },
  { key: 'agent', label: 'Connect agent', phases: ['agent_connected'] },
  { key: 'install', label: 'Install game', phases: ['installing'] },
  { key: 'start', label: 'Start server', phases: ['starting'] },
  { key: 'health', label: 'Run health checks', phases: ['healthy'] },
] as const;

const PHASE_ORDER: string[] = STEPS.flatMap((s) => [...s.phases]);

type StepStatus = 'done' | 'active' | 'pending' | 'error';

export const ProvisioningStatus = ({
  phase,
  errored,
}: {
  phase: string;
  errored: boolean;
}) => {
  const currentIndex = PHASE_ORDER.indexOf(phase);
  const errorIndex = errored && currentIndex === -1 ? 0 : currentIndex;

  return (
    <section className="flex flex-col gap-2 rounded-2xl bg-sidebar p-2">
      <div className="px-4 pt-2 pb-1">
        <h2 className="text-sm font-medium text-muted-foreground">
          Provisioning your server
        </h2>
      </div>
      <div className="grid gap-2 rounded-2xl bg-background p-2 shadow-sm/5">
        {STEPS.map((step) => {
          const stepStart = PHASE_ORDER.indexOf(step.phases[0]);
          const stepEnd = stepStart + step.phases.length - 1;
          const status: StepStatus =
            errored && errorIndex >= stepStart && errorIndex <= stepEnd
              ? 'error'
              : currentIndex > stepEnd
                ? 'done'
                : currentIndex >= stepStart
                  ? 'active'
                  : 'pending';

          return (
            <div
              key={step.key}
              className="flex flex-row items-center gap-4 rounded-lg px-3 py-2"
            >
              <StepIcon status={status} />
              <span
                className={cn(
                  'text-sm',
                  status === 'pending' && 'text-muted-foreground',
                  status === 'error' && 'text-destructive'
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
};

const StepIcon = ({ status }: { status: StepStatus }) => {
  if (status === 'done')
    return <CheckIcon className="size-4 shrink-0 text-primary" />;
  if (status === 'active') return <Spinner className="size-4 shrink-0" />;
  if (status === 'error')
    return <CircleXIcon className="size-4 shrink-0 text-destructive" />;
  return <CircleIcon className="size-4 shrink-0 text-muted-foreground" />;
};
