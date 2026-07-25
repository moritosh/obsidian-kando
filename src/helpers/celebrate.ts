import { c } from '../components/helpers';
import { Lane } from '../components/types';

// Fixed odds so completing a card is an occasional surprise rather than
// something that fires (and gets old) every single time.
const CELEBRATION_CHANCE = 0.35;
const CELEBRATION_DURATION_MS = 2800;

// A random cast of creatures, each flying up and to the right with a
// rainbow trail behind it.
const CREATURES = ['🦄', '🐉', '🦦', '🐳', '🦩'];

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
  const creature = doc.createElement('div');

  creature.className = c('celebrate-creature');
  creature.textContent = CREATURES[Math.floor(Math.random() * CREATURES.length)];
  // Nudges the whole bottom-left-to-top-right flight path up or down a bit
  // so repeated celebrations don't all trace the exact same line.
  creature.style.setProperty('--kanban-celebrate-drift', `${(Math.random() - 0.5) * 16}%`);

  const cleanup = () => creature.remove();
  creature.addEventListener('animationend', cleanup, { once: true });
  win.setTimeout(cleanup, CELEBRATION_DURATION_MS + 500);

  doc.body.appendChild(creature);
}
