import { describe, expect, it } from 'vitest';

import {
  appendEntities,
  getEntityFromPath,
  insertEntity,
  moveEntity,
  prependEntities,
  removeEntity,
  updateEntity,
} from '../data';
import type { Nestable } from '../../types';

function leaf(id: string): Nestable {
  return { id, type: 'item', accepts: [], children: [], data: { title: id } };
}

function lane(id: string, children: Nestable[]): Nestable {
  return { id, type: 'lane', accepts: ['item'], children, data: { title: id } };
}

function board(children: Nestable[]): Nestable {
  return { id: 'board', type: 'board', accepts: [], children, data: {} };
}

function fixture() {
  return board([
    lane('lane-a', [leaf('a1'), leaf('a2')]),
    lane('lane-b', [leaf('b1'), leaf('b2'), leaf('b3')]),
  ]);
}

describe('getEntityFromPath', () => {
  it('resolves a nested path to the target entity', () => {
    const root = fixture();
    expect(getEntityFromPath(root, [1, 2]).id).toBe('b3');
    expect(getEntityFromPath(root, [0]).id).toBe('lane-a');
    expect(getEntityFromPath(root, []).id).toBe('board');
  });
});

describe('removeEntity', () => {
  it('removes the entity at the given path without mutating the original', () => {
    const root = fixture();
    const next = removeEntity(root, [0, 0]);

    expect(next.children[0].children.map((c) => c.id)).toEqual(['a2']);
    expect(root.children[0].children.map((c) => c.id)).toEqual(['a1', 'a2']);
  });
});

describe('insertEntity', () => {
  it('inserts entities at the given index', () => {
    const root = fixture();
    const next = insertEntity(root, [0, 1], [leaf('new')]);

    expect(next.children[0].children.map((c) => c.id)).toEqual(['a1', 'new', 'a2']);
  });
});

describe('appendEntities / prependEntities', () => {
  // Destination is a "path to a slot": the last segment is dropped to find the
  // parent (see buildUpdateParentMutation), so appending into lane 0 uses a
  // 2-element path like real call sites do (Lane.tsx: `[...path, lane.children.length - 1]`).
  it('appends to the end of a lane', () => {
    const next = appendEntities(fixture(), [0, 0], [leaf('new')]);
    expect(next.children[0].children.map((c) => c.id)).toEqual(['a1', 'a2', 'new']);
  });

  it('prepends to the start of a lane', () => {
    const next = prependEntities(fixture(), [0, 0], [leaf('new')]);
    expect(next.children[0].children.map((c) => c.id)).toEqual(['new', 'a1', 'a2']);
  });

  it('appends a new lane at the board level', () => {
    const next = appendEntities(fixture(), [], [lane('lane-c', [])]);
    expect(next.children.map((c) => c.id)).toEqual(['lane-a', 'lane-b', 'lane-c']);
  });
});

describe('moveEntity', () => {
  it('moves an item within the same lane', () => {
    const next = moveEntity(fixture(), [0, 0], [0, 2]);
    expect(next.children[0].children.map((c) => c.id)).toEqual(['a2', 'a1']);
  });

  it('moves an item across lanes', () => {
    const next = moveEntity(fixture(), [0, 0], [1, 0]);

    expect(next.children[0].children.map((c) => c.id)).toEqual(['a2']);
    expect(next.children[1].children.map((c) => c.id)).toEqual(['a1', 'b1', 'b2', 'b3']);
  });

  it('moves a lane relative to another lane', () => {
    const next = moveEntity(fixture(), [0], [2]);
    expect(next.children.map((c) => c.id)).toEqual(['lane-b', 'lane-a']);
  });
});

describe('updateEntity', () => {
  it('applies an immutability-helper spec at the given path', () => {
    const root = fixture();
    const next = updateEntity(root, [0, 1], { data: { title: { $set: 'renamed' } } });

    expect(next.children[0].children[1].data.title).toBe('renamed');
    expect(root.children[0].children[1].data.title).toBe('a2');
  });
});
