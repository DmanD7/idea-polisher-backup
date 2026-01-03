
export interface PolishedIdea {
  title: string;
  outline: string;
  timestamp: number;
}

export enum AppStatus {
  IDLE = 'IDLE',
  POLISHING = 'POLISHING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}
