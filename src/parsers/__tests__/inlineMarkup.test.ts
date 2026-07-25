import { describe, expect, it } from 'vitest';
import { TFile } from 'obsidian';

import { astToUnhydratedBoard, boardToMd } from '../formats/list';
import { hydrateBoard } from '../helpers/hydrateBoard';
import { parseMarkdown } from '../parseMarkdown';
import { createTestStateManager } from './testStateManager';

function withFrontmatter(body: string) {
  return ['---', '', 'kanban-plugin: board', '', '---', '', body].join('\n');
}

function parseToBoard(md: string, stateManager = createTestStateManager()) {
  const parsed = parseMarkdown(stateManager, md);
  const board = astToUnhydratedBoard(
    stateManager,
    parsed.settings,
    parsed.frontmatter,
    parsed.ast,
    md
  );
  return hydrateBoard(stateManager, board);
}

describe('wikilinks and embeds', () => {
  it('resolves a [[wikilink]] to a file via the metadata cache', () => {
    const target = new TFile('Notes/Recipe.md');
    const stateManager = createTestStateManager({
      getFirstLinkpathDest: (linkpath) => (linkpath === 'Recipe' ? target : null),
    });
    const md = withFrontmatter(['## Lane', '', '- [ ] See [[Recipe]] for dinner', ''].join('\n'));

    const board = parseToBoard(md, stateManager);
    const item = board.children[0].children[0];

    expect(item.data.metadata.fileAccessor).toEqual({
      target: 'Recipe',
      isEmbed: false,
    });
    expect(item.data.metadata.file).toBe(target);
  });

  it('marks an embed wikilink as isEmbed', () => {
    const md = withFrontmatter(['## Lane', '', '- [ ] ![[Diagram.png]]', ''].join('\n'));
    const board = parseToBoard(md);
    const item = board.children[0].children[0];

    expect(item.data.metadata.fileAccessor).toMatchObject({
      target: 'Diagram.png',
      isEmbed: true,
    });
  });

  it('does not resolve a wikilink target that is missing from the vault', () => {
    const md = withFrontmatter(['## Lane', '', '- [ ] See [[Missing Note]]', ''].join('\n'));
    const board = parseToBoard(md);
    const item = board.children[0].children[0];

    expect(item.data.metadata.fileAccessor).toEqual({
      target: 'Missing Note',
      isEmbed: false,
    });
    expect(item.data.metadata.file).toBeUndefined();
  });
});

describe('block ids', () => {
  it('extracts a trailing block id and strips it from the title', () => {
    const md = withFrontmatter(['## Lane', '', '- [ ] Buy milk ^my-block-id', ''].join('\n'));
    const board = parseToBoard(md);
    const item = board.children[0].children[0];

    expect(item.data.blockId).toBe('my-block-id');
    expect(item.data.titleRaw).toBe('Buy milk');
  });

  it('round-trips the block id back into markdown', () => {
    const md = withFrontmatter(['## Lane', '', '- [ ] Buy milk ^my-block-id', ''].join('\n'));
    const roundTripped = boardToMd(parseToBoard(md));

    expect(roundTripped).toContain('- [ ] Buy milk ^my-block-id');
  });
});
