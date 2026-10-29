const clamp = n => Math.max(0, Math.min(1, n));
import {arrivalDuration} from './cake-arrival.js?v=2';

// Randomization only replaces parts. Opening/closing belongs to the user's mode.
// No timers: hiding or pausing the scene freezes the current transaction safely.
export class RemixTimeline {
  constructor() { this.job = null; }
  begin(design, keepOpen, expansion = 0) {
    this.job = { design, keepOpen, from: expansion, elapsed: 0, swapped: false };
  }
  step(dt) {
    const job = this.job;
    if (!job) return null;
    job.elapsed += Math.max(0, dt);
    const t = job.elapsed;
    let swap = false;
    const swapAt=.26,duration=arrivalDuration(job.design.layers||1);
    if (t >= swapAt && !job.swapped) { job.swapped = true; swap = true; }
    const expansion = job.keepOpen ? 1 : 0;
    const entering=t>=swapAt;
    const entrance = entering?clamp((t-swapAt)/duration):1-clamp(t/swapAt);
    const done = t >= swapAt+duration+.08;
    const phase = !entering ? "shuffling" : t < swapAt+duration*.93 ? "replacing" : "settling";
    const output = { design: job.design, expansion, entrance, entering, swap, done, phase };
    if (done) { output.entrance = 1; output.expansion = job.keepOpen ? 1 : 0; this.job = null; }
    return output;
  }
  get busy() { return Boolean(this.job); }
}
