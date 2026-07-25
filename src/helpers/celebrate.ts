import { c } from '../components/helpers';

// Fixed odds so completing a card is an occasional surprise rather than
// something that fires (and gets old) every single time.
const CELEBRATION_CHANCE = 0.25;
const CELEBRATION_DURATION_MS = 2800;

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
