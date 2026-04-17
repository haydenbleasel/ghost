import {
  stepAgentConnected,
  stepCreateHetznerServer,
  stepGetHetznerStatus,
  stepMarkFailed,
  stepMarkHetznerRunning,
  stepMarkReady,
  stepReadAgent,
  stepReadDesiredState,
  stepReadPhase,
  stepSendInstallConfig,
} from './steps';
import { FatalError, sleep } from 'workflow';

const MAX_HETZNER_WAIT_SECONDS = 300;
const MAX_ENROLL_WAIT_SECONDS = 300;
const MAX_INSTALL_WAIT_SECONDS = 900;

export async function provisionServer(input: { serverId: string }) {
  'use workflow';

  const { serverId } = input;

  try {
    const { hetznerServerId } = await stepCreateHetznerServer(serverId);

    // Wait for Hetzner VM to report running
    const hetznerDeadline = Date.now() + MAX_HETZNER_WAIT_SECONDS * 1000;
    let ipv4: string | null = null;
    while (Date.now() < hetznerDeadline) {
      if ((await stepReadDesiredState(serverId)) === 'deleted') return;

      const status = await stepGetHetznerStatus(hetznerServerId);
      if (status.status === 'running') {
        ipv4 = status.ip;
        break;
      }
      if (status.status === 'unknown') {
        throw new FatalError('Hetzner server not found after create');
      }
      await sleep('6s');
    }
    if (!ipv4) {
      await stepMarkFailed({ serverId, reason: 'Hetzner boot timeout' });
      return;
    }

    await stepMarkHetznerRunning({ serverId, ipv4 });

    // Wait for agent enrollment
    const enrollDeadline = Date.now() + MAX_ENROLL_WAIT_SECONDS * 1000;
    let enrolled = false;
    while (Date.now() < enrollDeadline) {
      if ((await stepReadDesiredState(serverId)) === 'deleted') return;
      const agent = await stepReadAgent(serverId);
      if (agent) {
        enrolled = true;
        break;
      }
      await sleep('5s');
    }
    if (!enrolled) {
      await stepMarkFailed({ serverId, reason: 'Agent never enrolled' });
      return;
    }

    await stepAgentConnected(serverId);
    await stepSendInstallConfig(serverId);

    // Wait for agent to reach "healthy" phase
    const installDeadline = Date.now() + MAX_INSTALL_WAIT_SECONDS * 1000;
    while (Date.now() < installDeadline) {
      if ((await stepReadDesiredState(serverId)) === 'deleted') return;

      const phase = await stepReadPhase(serverId);
      if (phase.phase === 'healthy' || phase.phase === 'ready') break;
      if (phase.phase === 'errored') {
        await stepMarkFailed({ serverId, reason: 'Agent reported error' });
        return;
      }
      await sleep('5s');
    }

    await stepMarkReady(serverId);
  } catch (error) {
    if (error instanceof FatalError) {
      await stepMarkFailed({ serverId, reason: error.message });
      return;
    }
    throw error;
  }
}
