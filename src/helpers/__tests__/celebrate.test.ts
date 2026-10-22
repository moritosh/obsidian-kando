import { describe, expect, it } from 'vitest';

import type { Lane } from '../../components/types';
import { celebrate, createFlightPath, isDoneLane } from '../celebrate';

function lane(title: string, shouldMarkItemsComplete?: boolean): Lane {
  return {
    id: 'lane',
    type: 'lane',
    accepts: ['item'],
    children: [],
    data: { title, shouldMarkItemsComplete },
  };
}

describe('isDoneLane', () => {
  it('returns false for a lane with an unrelated name', () => {
    expect(isDoneLane(lane('To do'))).toBe(false);
    expect(isDoneLane(lane('In progress'))).toBe(false);
  });

  it('matches common "done" list names', () => {
    expect(isDoneLane(lane('Done'))).toBe(true);
    expect(isDoneLane(lane('✅ Done'))).toBe(true);
    expect(isDoneLane(lane('Completed'))).toBe(true);
    expect(isDoneLane(lane('Finished'))).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isDoneLane(lane('DONE'))).toBe(true);
  });

  it('does not match unrelated words containing "done" as a substring only', () => {
    expect(isDoneLane(lane('Abandoned'))).toBe(false);
  });

  it('returns true when the lane is explicitly marked as a complete lane, regardless of name', () => {
    expect(isDoneLane(lane('Later', true))).toBe(true);
  });

  it('returns false for a null/undefined lane', () => {
    expect(isDoneLane(null)).toBe(false);
    expect(isDoneLane(undefined)).toBe(false);
  });
});

describe('createFlightPath', () => {
  const width = 1200;
  const height = 800;
  const samples = (at: (t: number) => { x: number; y: number }) =>
    Array.from({ length: 401 }, (_, i) => at(i / 400));

  it('starts at the origin and leaves the screen on the far side', () => {
    const path = createFlightPath({ x: 200, y: 600 }, width, height, {
      loop: false,
      exitHeight: 0.1,
    });

    expect(path.direction).toBe(1);
    expect(path.at(0)).toEqual({ x: 200, y: 600 });
    expect(path.at(1).x).toBeGreaterThan(width);
  });

  it('flies away from the nearer edge', () => {
    const path = createFlightPath({ x: 1000, y: 600 }, width, height, {
      loop: false,
      exitHeight: 0.1,
    });

    expect(path.direction).toBe(-1);
    expect(path.at(1).x).toBeLessThan(0);
  });

  it('stays on screen until it exits, from cards anywhere on the board', () => {
    for (const origin of [
      { x: 300, y: 120 },
      { x: 300, y: 650 },
      { x: 1000, y: 400 },
      { x: 600, y: 780 },
    ]) {
      for (const loop of [false, true]) {
        const { at, direction } = createFlightPath(origin, width, height, {
          loop,
          exitHeight: 0,
        });
        let t = 0;
        for (let p = at(t); p.x >= 0 && p.x <= width; p = at((t += 0.005))) {
          expect(p.y).toBeGreaterThanOrEqual(0);
          expect(p.y).toBeLessThanOrEqual(height);
        }
        // It leaves through the far edge, not the top.
        expect(Math.sign(at(t).x - width / 2)).toBe(direction);
        expect(at(t).y).toBeGreaterThan(0);
      }
    }
  });

  it('only flies backwards when turning a loop', () => {
    const origin = { x: 300, y: 650 };
    const backwards = (loop: boolean) => {
      const points = samples(createFlightPath(origin, width, height, { loop, exitHeight: 0 }).at);
      return points.some((p, i) => i > 0 && p.x < points[i - 1].x);
    };

    expect(backwards(false)).toBe(false);
    expect(backwards(true)).toBe(true);
  });

  it('joins the loop without a jump', () => {
    const points = samples(
      createFlightPath({ x: 300, y: 650 }, width, height, { loop: true, exitHeight: 0 }).at
    );
    const steps = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));

    expect(Math.max(...steps)).toBeLessThan(25);
  });
});

describe('celebrate', () => {
  it('does nothing when the system asks for reduced motion', () => {
    const win = {
      matchMedia: () => ({ matches: true }),
      document: { createElement: () => expect.unreachable() },
    } as unknown as Window;

    celebrate(win, { x: 0, y: 0 });
  });
});
