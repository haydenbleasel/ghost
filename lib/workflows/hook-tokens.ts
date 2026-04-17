export const hookTokens = {
  cancel: (serverId: string) => `server:${serverId}:cancel`,
  enrolled: (serverId: string) => `server:${serverId}:enrolled`,
  phase: (serverId: string) => `server:${serverId}:phase`,
  provisionDone: (serverId: string) => `server:${serverId}:provision-done`,
} as const;
