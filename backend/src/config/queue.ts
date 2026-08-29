import { randomUUID } from 'crypto';

const uuidv4 = randomUUID;

export type JobType = 
  | 'TIMETABLE_GENERATION'
  | 'SEAT_ALLOCATION'
  | 'INVIGILATOR_ASSIGNMENT'
  | 'CONFLICT_DETECTION'
  | 'REPORT_GENERATION';

export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface Job<T = any, R = any> {
  id: string;
  type: JobType;
  status: JobStatus;
  payload: T;
  result?: R;
  progress: number;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

type JobHandler<T = any, R = any> = (payload: T, updateProgress: (progress: number) => void) => Promise<R>;

class InMemoryJobQueue {
  private jobs: Map<string, Job> = new Map();
  private handlers: Map<JobType, JobHandler> = new Map();
  private processing: Set<string> = new Set();

  registerHandler<T, R>(type: JobType, handler: JobHandler<T, R>): void {
    this.handlers.set(type, handler as JobHandler);
  }

  enqueue<T>(type: JobType, payload: T): string {
    const id = uuidv4();
    const job: Job<T> = {
      id,
      type,
      status: 'PENDING',
      payload,
      progress: 0,
      createdAt: new Date(),
    };
    this.jobs.set(id, job);
    this.processNext();
    return id;
  }

  getStatus(id: string): JobStatus | null {
    const job = this.jobs.get(id);
    return job?.status ?? null;
  }

  getJob(id: string): Job | null {
    return this.jobs.get(id) ?? null;
  }

  getResult(id: string): any {
    const job = this.jobs.get(id);
    return job?.result ?? null;
  }

  private async processNext(): Promise<void> {
    for (const [id, job] of this.jobs.entries()) {
      if (job.status === 'PENDING' && !this.processing.has(id)) {
        this.processing.add(id);
        this.processJob(id).finally(() => {
          this.processing.delete(id);
          this.processNext();
        });
        break;
      }
    }
  }

  private async processJob(id: string): Promise<void> {
    const job = this.jobs.get(id);
    if (!job) return;

    const handler = this.handlers.get(job.type);
    if (!handler) {
      job.status = 'FAILED';
      job.error = `No handler registered for job type: ${job.type}`;
      job.completedAt = new Date();
      return;
    }

    job.status = 'PROCESSING';
    job.startedAt = new Date();

    try {
      const updateProgress = (progress: number) => {
        job.progress = Math.min(100, Math.max(0, progress));
      };

      const result = await handler(job.payload, updateProgress);
      job.result = result;
      job.status = 'COMPLETED';
      job.progress = 100;
    } catch (error) {
      job.status = 'FAILED';
      job.error = error instanceof Error ? error.message : 'Unknown error';
    } finally {
      job.completedAt = new Date();
    }
  }

  cancel(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job || job.status !== 'PENDING') return false;
    job.status = 'CANCELLED';
    job.completedAt = new Date();
    return true;
  }

  getJobsByStatus(status: JobStatus): Job[] {
    return Array.from(this.jobs.values()).filter(j => j.status === status);
  }

  clearCompleted(): number {
    let count = 0;
    for (const [id, job] of this.jobs.entries()) {
      if (job.status === 'COMPLETED' || job.status === 'FAILED' || job.status === 'CANCELLED') {
        this.jobs.delete(id);
        count++;
      }
    }
    return count;
  }
}

export const jobQueue = new InMemoryJobQueue();