import { c } from '../components/helpers';
import { Lane } from '../components/types';

// Fixed odds so completing a card is an occasional surprise rather than
// something that fires (and gets old) every single time.
const CELEBRATION_CHANCE = 0.35;
const CELEBRATION_DURATION_MS = 2800;

const DONE_LANE_NAME_PATTERN = /\b(done|complete|completed|finished)\b/i;

// A lane counts as a "done" list either because the user explicitly marked
// it as one ("Mark cards in this list as complete"), or just by its name
// (e.g. a list titled "Done", "✅ Done", "Completed").
export function isDoneLane(lane: Lane | null | undefined): boolean {
  if (!lane) return false;
  if (lane.data.shouldMarkItemsComplete) return true;
  return DONE_LANE_NAME_PATTERN.test(lane.data.title || '');
}

export function maybeCelebrate(win: Window): void {
  if (Math.random() >= CELEBRATION_CHANCE) return;

  const doc = win.document;
  const unicorn = doc.createElement('div');

  unicorn.className = c('celebrate-unicorn');
  unicorn.textContent = '🦄';
  unicorn.style.setProperty('--kanban-celebrate-top', `${10 + Math.random() * 60}%`);

  const cleanup = () => unicorn.remove();
  unicorn.addEventListener('animationend', cleanup, { once: true });
  win.setTimeout(cleanup, CELEBRATION_DURATION_MS + 500);

  doc.body.appendChild(unicorn);
}
