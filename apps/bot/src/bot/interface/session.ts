export interface BotSession {
  currentAction?: string;
}

export const defaultSession: BotSession = {
  currentAction: undefined,
};
