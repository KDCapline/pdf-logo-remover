// Concurrent task queue used by the processing service to bound parallelism.
// Strict typing, no `any`. Cancellation rejects pending runners.

export type TaskRunner<T> = () => Promise<T>;

interface PendingTask {
  runner: TaskRunner<unknown>;
  reject: (reason: unknown) => void;
  canceled: boolean;
}

export interface QueueHandle {
  add: (runner: TaskRunner<unknown>) => void;
  cancel: () => void;
  onProgress?: (done: number, total: number, active: number) => void;
  wait: () => Promise<void>;
}

export function createConcurrentQueue(concurrency: number): QueueHandle {
  const maxConcurrent = Math.max(1, Math.floor(concurrency) || 1);
  const pending: PendingTask[] = [];
  let active = 0;
  let total = 0;
  let done = 0;
  let canceled = false;

  const idleResolvers: Array<() => void> = [];

  const notifyIdle = (): void => {
    if (active === 0 && pending.length === 0) {
      for (const resolve of idleResolvers) resolve();
      idleResolvers.length = 0;
    }
  };

  const notifyProgress = (handle: QueueHandle): void => {
    handle.onProgress?.(done, total, active);
  };

  const runNext = (handle: QueueHandle): void => {
    if (canceled) return;
    while (active < maxConcurrent && pending.length > 0) {
      const task = pending.shift();
      if (!task) break;
      if (task.canceled) {
        done++;
        continue;
      }
      active++;
      notifyProgress(handle);
      task
        .runner()
        .catch((error: unknown) => {
          // Surface rejection to the task's own reject callback so callers
          // can observe it via their runner wrapper.
          task.reject(error);
        })
        .finally(() => {
          active--;
          done++;
          notifyProgress(handle);
          runNext(handle);
          notifyIdle();
        });
    }
    notifyIdle();
  };

  const handle: QueueHandle = {
    add(runner: TaskRunner<unknown>): void {
      if (canceled) return;
      total++;
      pending.push({
        runner,
        reject: () => {
          /* placeholder: callers wrap runners with their own error handling. */
        },
        canceled: false,
      });
      queueMicrotask(() => runNext(handle));
    },
    cancel(): void {
      canceled = true;
      for (const task of pending) {
        task.canceled = true;
        task.reject(new Error("Queue canceled"));
      }
      pending.length = 0;
      notifyProgress(handle);
      notifyIdle();
    },
    wait(): Promise<void> {
      if (active === 0 && pending.length === 0 && !canceled) return Promise.resolve();
      return new Promise<void>((resolve) => {
        idleResolvers.push(resolve);
      });
    },
  };

  return handle;
}