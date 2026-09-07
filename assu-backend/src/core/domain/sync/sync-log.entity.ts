export enum SyncStatus {
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
}

export class SyncLog {
  constructor(
    public readonly id: string,
    public readonly accountId: string,
    public readonly startedAt: Date,
    public finishedAt: Date | null,
    public status: SyncStatus,
    public error: string | null,
    public movementsFound: number,
    public movementsNew: number,
  ) {}

  get durationMs(): number | null {
    if (!this.finishedAt) return null;
    return this.finishedAt.getTime() - this.startedAt.getTime();
  }

  finish(status: SyncStatus, error?: string): void {
    this.finishedAt = new Date();
    this.status = status;
    this.error = error ?? null;
  }
}
