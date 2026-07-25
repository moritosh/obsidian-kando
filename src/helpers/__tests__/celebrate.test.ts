import { describe, expect, it } from 'vitest';

import type { Lane } from '../../components/types';
import { isDoneLane } from '../celebrate';

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
