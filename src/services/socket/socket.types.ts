export type SocketConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export type ServerToClientEvents = {
  'notification:new': (payload: any) => void;
  'bible:highlight:updated': (payload: any) => void;
  'reading-plan:updated': (payload: any) => void;
  // Optional: server can push the daily verse payload at the scheduled time
  'bible:daily-verse': (payload: any) => void;
  'server:ping': (payload?: any) => void;
};

export type ClientToServerEvents = {
  'client:hello': (payload: { platform: string; version?: string }) => void;
  'client:auth': (payload: { token: string }) => void;
  'client:subscribe': (payload: { topics: string[] }) => void;
  'client:unsubscribe': (payload: { topics: string[] }) => void;
  'client:pong': (payload?: any) => void;
  // Optional: client can request today's verse over socket
  'bible:get-daily-verse': (payload?: { date?: string }) => void;
};
