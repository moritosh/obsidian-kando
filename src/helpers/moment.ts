import { moment as obsidianMoment } from 'obsidian';

// obsidian.d.ts declares `moment` via `typeof Moment` from a namespace import of
// the `moment` package, which TypeScript's strict mode + "bundler" module
// resolution no longer resolves as callable. Re-typed here (not re-implemented)
// against moment's own type declarations; the runtime value is still exactly
// Obsidian's shared, locale-configured moment instance.
export const moment = obsidianMoment as unknown as typeof import('moment');
