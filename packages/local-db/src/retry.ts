/** Retry policy shared by automatic triggers; a manual retry may bypass the waiting time. */
export class RetryBackoff {
  private failures = 0;
  private nextAttempt = 0;
  ready(now = Date.now()) {
    return now >= this.nextAttempt;
  }
  success() {
    this.failures = 0;
    this.nextAttempt = 0;
  }
  fail(now = Date.now(), random = Math.random()) {
    this.failures = Math.min(this.failures + 1, 8);
    // Jitter spreads reconnect traffic; the cap prevents an indefinitely growing wait.
    const base = Math.min(300_000, 5_000 * 2 ** (this.failures - 1));
    const delay = Math.min(300_000, Math.round(base * (0.75 + random * 0.5)));
    this.nextAttempt = now + delay;
    return delay;
  }
}
