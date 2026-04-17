import { loadBootstrap, loadState, saveState } from './config';
import { enroll } from './enroll';
import { EventBuffer } from './events';
import { pollCommands } from './commands';
import { runHeartbeat } from './heartbeat';

async function main() {
  const state = await loadState();

  if (state) {
    console.log(`[ghost-agent] loaded state for ${state.serverId}`);
  } else {
    const bootstrap = await loadBootstrap();
    if (!bootstrap) {
      console.error('[ghost-agent] no bootstrap config found');
      process.exit(1);
    }
    console.log(`[ghost-agent] enrolling server ${bootstrap.serverId}`);
    const enrolled = await enroll(bootstrap);
    console.log(`[ghost-agent] enrolled as ${enrolled.agentId}`);
    return run(enrolled);
  }

  await run(state);
}

async function run(state: Awaited<ReturnType<typeof loadState>>) {
  if (!state) throw new Error('no state');

  const buffer = new EventBuffer(state);
  buffer.enqueueActivity({ phase: 'agent_connected', message: 'Agent online' });
  await buffer.flush();
  await saveState(state);

  const controller = new AbortController();
  const shutdown = async (code: number) => {
    controller.abort();
    await buffer.flush();
    process.exit(code);
  };
  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));

  await Promise.all([
    pollCommands(state, buffer, controller.signal),
    runHeartbeat(state, controller.signal),
  ]);
}

await main().catch((error) => {
  console.error('[ghost-agent] fatal', error);
  process.exit(1);
});
