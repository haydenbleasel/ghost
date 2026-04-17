export const hookTokens = {
  enrolled: (serverId: string) => `server:${serverId}:enrolled`,
  phase: (serverId: string) => `server:${serverId}:phase`,
  cancel: (serverId: string) => `server:${serverId}:cancel`,
  provisionDone: (serverId: string) => `server:${serverId}:provision-done`,
} as const;
