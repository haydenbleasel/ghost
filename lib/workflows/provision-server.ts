import {
  stepAgentConnected,
  stepCreateHetznerServer,
  stepGetHetznerStatus,
  stepMarkFailed,
  stepMarkHetznerRunning,
  stepMarkReady,
  stepReadDesiredState,
  stepSendInstallConfig,
  stepSignalProvisionDone,
} from './steps';
import { createHook, FatalError, sleep } from 'workflow';
import { hookTokens } from './hook-tokens';
import type { Phase } from '@/protocol';

const MAX_HETZNER_WAIT_SECONDS = 300;
const MAX_ENROLL_WAIT_SECONDS = 300;
const MAX_INSTALL_WAIT_SECONDS = 900;

export async function provisionServer(input: { serverId: string }) {
  'use workflow';

  const { serverId } = input;

  using cancelHook = createHook<void>({ token: hookTokens.cancel(serverId) });
  using enrollHook = createHook<void>({
    token: hookTokens.enrolled(serverId),
  });
  using phaseHook = createHook<Phase>({ token: hookTokens.phase(serverId) });

  // One shared cancel observer — resolves once when teardown fires.
  const cancelled = cancelHook.then(() => 'cancelled' as const);

  try {
    if ((await stepReadDesiredState(serverId)) === 'deleted') return;

    const createResult = await stepCreateHetznerServer(serverId);
    if (createResult.cancelled) return;
    const { hetznerServerId } = createResult;
    if (hetznerServerId === null) return;

    // Hetzner doesn't push status, so poll — but race against cancel each tick.
    const hetznerDeadline = Date.now() + MAX_HETZNER_WAIT_SECONDS * 1000;
    let ipv4: string | null = null;
    while (Date.now() < hetznerDeadline) {
      const status = await stepGetHetznerStatus(hetznerServerId);
      if (status.status === 'running') {
        ipv4 = status.ip;
        break;
      }
      if (status.status === 'unknown') {
        throw new FatalError('Hetzner server not found after create');
      }
      const tick = await Promise.race([
        sleep('6s').then(() => 'tick' as const),
        cancelled,
      ]);
      if (tick === 'cancelled') return;
    }
    if (!ipv4) {
      await stepMarkFailed({ serverId, reason: 'Hetzner boot timeout' });
      return;
    }

    await stepMarkHetznerRunning({ serverId, ipv4 });

    const enrollOutcome = await Promise.race([
      enrollHook.then(() => 'enrolled' as const),
      cancelled,
      sleep(`${MAX_ENROLL_WAIT_SECONDS}s`).then(() => 'timeout' as const),
    ]);
    if (enrollOutcome === 'cancelled') return;
    if (enrollOutcome === 'timeout') {
      await stepMarkFailed({ serverId, reason: 'Agent never enrolled' });
      return;
    }

    await stepAgentConnected(serverId);
    await stepSendInstallConfig(serverId);

    const installDeadline = Date.now() + MAX_INSTALL_WAIT_SECONDS * 1000;
    let healthy = false;
    while (Date.now() < installDeadline) {
      const remainingSeconds = Math.max(
        1,
        Math.ceil((installDeadline - Date.now()) / 1000)
      );
      const event = await Promise.race([
        phaseHook.then((phase) => ({ kind: 'phase' as const, phase })),
        cancelled.then(() => ({ kind: 'cancelled' as const })),
        sleep(`${remainingSeconds}s`).then(() => ({
          kind: 'timeout' as const,
        })),
      ]);
      if (event.kind === 'cancelled') return;
      if (event.kind === 'timeout') break;
      if (event.phase === 'healthy' || event.phase === 'ready') {
        healthy = true;
        break;
      }
      if (event.phase === 'errored') {
        await stepMarkFailed({ serverId, reason: 'Agent reported error' });
        return;
      }
    }

    if (!healthy) {
      await stepMarkFailed({ serverId, reason: 'Install timeout' });
      return;
    }

    await stepMarkReady(serverId);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown error';
    await stepMarkFailed({ serverId, reason });
    // FatalError is an intentional bail-out: swallow so the workflow run
    // reports as completed rather than failed. Anything else (including
    // step retries giving up) re-throws so the run itself is marked failed.
    if (error instanceof FatalError) return;
    throw error;
  } finally {
    await stepSignalProvisionDone(serverId);
  }
}
