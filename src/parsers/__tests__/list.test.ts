import { describe, expect, it } from 'vitest';

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

const basicBoard = withFrontmatter(
  [
    '## Todo',
    '',
    '- [ ] Buy milk',
    '- [ ] Walk dog',
    '',
    '',
    '## Done',
    '',
    '- [x] Write tests',
    '',
    '',
    '',
  ].join('\n')
);

describe('markdown -> board parsing', () => {
  it('parses lanes and their items', () => {
    const board = parseToBoard(basicBoard);

    expect(board.children).toHaveLength(2);
    expect(board.children[0].data.title).toBe('Todo');
    expect(board.children[0].children.map((i) => i.data.titleRaw)).toEqual([
      'Buy milk',
      'Walk dog',
    ]);
    expect(board.children[1].data.title).toBe('Done');
    expect(board.children[1].children[0].data.checked).toBe(true);
    expect(board.children[1].children[0].data.checkChar).toBe('x');
  });

  it('extracts tags from item titles', () => {
    const md = withFrontmatter(['## Lane', '', '- [ ] Buy milk #groceries #urgent', ''].join('\n'));
    const board = parseToBoard(md);
    const item = board.children[0].children[0];

    expect(item.data.metadata.tags).toEqual(['#groceries', '#urgent']);
    expect(item.data.titleRaw).toBe('Buy milk #groceries #urgent');
  });

  it('moves tags out of the title when move-tags is enabled', () => {
    const stateManager = createTestStateManager({ settings: { 'move-tags': true } });
    const md = withFrontmatter(['## Lane', '', '- [ ] Buy milk #groceries', ''].join('\n'));
    const board = parseToBoard(md, stateManager);
    const item = board.children[0].children[0];

    expect(item.data.metadata.tags).toEqual(['#groceries']);
    expect(item.data.title).toBe('Buy milk');
  });

  it('parses inline dates using the date trigger', () => {
    const md = withFrontmatter(['## Lane', '', '- [ ] Pay rent @{2024-01-15}', ''].join('\n'));
    const board = parseToBoard(md);
    const item = board.children[0].children[0];

    expect(item.data.metadata.dateStr).toBe('2024-01-15');
    expect(item.data.metadata.date?.format('YYYY-MM-DD')).toBe('2024-01-15');
  });

  it('marks a lane archive when it sits under an "Archive" heading past a thematic break', () => {
    const md = withFrontmatter(
      [
        '## Todo',
        '',
        '- [ ] Buy milk',
        '',
        '',
        '***',
        '',
        '## Archive',
        '',
        '- [x] Old task',
        '',
        '',
      ].join('\n')
    );
    const board = parseToBoard(md);

    expect(board.children).toHaveLength(1);
    expect(board.children[0].data.title).toBe('Todo');
    expect(board.data.archive).toHaveLength(1);
    expect(board.data.archive[0].data.titleRaw).toBe('Old task');
  });
});

describe('board -> markdown serialization', () => {
  it('round-trips lanes and item checkboxes', () => {
    const board = parseToBoard(basicBoard);
    const md = boardToMd(board);

    expect(md).toContain('## Todo');
    expect(md).toContain('- [ ] Buy milk');
    expect(md).toContain('- [ ] Walk dog');
    expect(md).toContain('## Done');
    expect(md).toContain('- [x] Write tests');
  });

  it('is stable under repeated parse/serialize cycles', () => {
    const once = boardToMd(parseToBoard(basicBoard));
    const twice = boardToMd(parseToBoard(once));

    expect(twice).toBe(once);
  });
});
