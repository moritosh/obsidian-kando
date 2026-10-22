import { render } from 'preact';
import { act } from 'preact/test-utils';
import type { KanbanSettings } from 'src/Settings';
import type { StateManager } from 'src/StateManager';
import { createTestStateManager } from 'src/parsers/__tests__/testStateManager';
import { astToUnhydratedBoard } from 'src/parsers/formats/list';
import { hydrateBoard } from 'src/parsers/helpers/hydrateBoard';
import { parseMarkdown } from 'src/parsers/parseMarkdown';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SearchContext, SearchContextProps } from '../../context';
import { Board } from '../../types';
import { TableView } from '../Table';

// The real cells pull in the markdown renderer, menus and editing state; these tests
// are about the table itself, so render plain text in their place.
vi.mock('../Cells', async () => {
  const { h } = await import('preact');
  return {
    ItemCell: ({ item }: any) => h('span', null, item.data.titleRaw),
    LaneCell: ({ lane }: any) => h('span', null, lane.data.title),
    DateCell: () => null,
  };
});

const md = [
  '---',
  '',
  'kanban-plugin: board',
  '',
  '---',
  '',
  '## Todo',
  '',
  '- [ ] Walk dog',
  '- [ ] Buy milk',
  '',
  '',
  '## Done',
  '',
  '- [x] Write tests',
  '',
  '',
  '',
].join('\n');

function setup(settings: Partial<KanbanSettings> = {}) {
  const stateManager = createTestStateManager({ settings });
  const parsed = parseMarkdown(stateManager, md);
  const board = hydrateBoard(
    stateManager,
    astToUnhydratedBoard(stateManager, parsed.settings, parsed.frontmatter, parsed.ast, md)
  );

  const setState = vi.fn();
  Object.assign(stateManager, {
    app: { ...stateManager.app, vault: { getConfig: () => false } },
    useSetting: (key: keyof KanbanSettings) => stateManager.getSetting(key),
    getAView: () => ({}),
    setState,
  });

  return { board, stateManager, setState };
}

let container: HTMLElement | null = null;

async function mount(board: Board, stateManager: StateManager, query = '') {
  container = document.body.appendChild(document.createElement('div'));
  const search: SearchContextProps = {
    query,
    items: new Set(),
    lanes: new Set(),
    search: () => {},
  };
  await act(() => {
    render(
      <SearchContext.Provider value={search}>
        <TableView boardData={board} stateManager={stateManager} />
      </SearchContext.Provider>,
      container!
    );
  });
  return container;
}

afterEach(() => {
  if (!container) return;
  render(null, container);
  container.remove();
  container = null;
});

const cardTitles = (el: HTMLElement) =>
  Array.from(el.querySelectorAll('tbody tr')).map((tr) => tr.querySelector('td')!.textContent);

const headers = (el: HTMLElement) => Array.from(el.querySelectorAll('th'));

const fire = (target: EventTarget, type: string, init: MouseEventInit = {}) =>
  act(() => {
    target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, ...init }));
  });

describe('TableView', () => {
  it('lists every card with its list, in board order', async () => {
    const { board, stateManager } = setup();
    const el = await mount(board, stateManager);

    expect(headers(el).map((th) => th.textContent)).toEqual(['Card', 'List']);
    expect(cardTitles(el)).toEqual(['Walk dog', 'Buy milk', 'Write tests']);
    expect(
      Array.from(el.querySelectorAll('tbody tr')).map((tr) => tr.lastChild!.textContent)
    ).toEqual(['Todo', 'Todo', 'Done']);
  });

  it('cycles a column through ascending, descending and unsorted on header clicks', async () => {
    const { board, stateManager } = setup();
    const el = await mount(board, stateManager);
    const cardHeader = () => headers(el)[0].querySelector('.kanban-plugin__table-header')!;
    const sortIcon = () =>
      headers(el)[0]
        .querySelector('.kanban-plugin__table-header-sort [data-icon]')!
        .getAttribute('data-icon');

    expect(sortIcon()).toBe('lucide-chevrons-up-down');

    await fire(cardHeader(), 'click');
    expect(cardTitles(el)).toEqual(['Buy milk', 'Walk dog', 'Write tests']);
    expect(sortIcon()).toBe('lucide-chevron-up');

    await fire(cardHeader(), 'click');
    expect(cardTitles(el)).toEqual(['Write tests', 'Walk dog', 'Buy milk']);
    expect(sortIcon()).toBe('lucide-chevron-down');

    await fire(cardHeader(), 'click');
    expect(cardTitles(el)).toEqual(['Walk dog', 'Buy milk', 'Write tests']);
    expect(sortIcon()).toBe('lucide-chevrons-up-down');
  });

  it('filters rows by the search query and marks the matching cells', async () => {
    const { board, stateManager } = setup();
    const el = await mount(board, stateManager, 'milk');

    expect(cardTitles(el)).toEqual(['Buy milk']);
    const [cardCell, laneCell] = Array.from(el.querySelectorAll('tbody td'));
    expect(cardCell.classList.contains('mod-search-match')).toBe(true);
    expect(laneCell.classList.contains('mod-search-match')).toBe(false);
  });

  it('resizes a column by dragging its handle and resets it on double-click', async () => {
    const { board, stateManager } = setup();
    const el = await mount(board, stateManager);
    const table = el.querySelector('table')!;
    const cardWidth = () =>
      (headers(el)[0].querySelector('.kanban-plugin__table-cell-wrapper') as HTMLElement).style
        .width;
    const resizer = headers(el)[0].querySelector('.resizer')!;

    // The card column defaults to 272px and the list column to TanStack's 150px.
    expect(cardWidth()).toBe('272px');
    expect(table.style.width).toBe('422px');
    expect(resizer.classList.contains('ltr')).toBe(true);

    await fire(resizer, 'mousedown', { clientX: 300 });
    expect(resizer.classList.contains('isResizing')).toBe(true);
    await fire(document, 'mousemove', { clientX: 350 });
    await fire(document, 'mouseup', { clientX: 350 });

    expect(resizer.classList.contains('isResizing')).toBe(false);
    expect(cardWidth()).toBe('322px');
    expect(table.style.width).toBe('472px');
    // Body cells follow the header.
    expect((el.querySelector('tbody td > div') as HTMLElement).style.width).toBe('322px');

    await fire(resizer, 'dblclick');
    expect(cardWidth()).toBe('272px');
    expect(table.style.width).toBe('422px');
  });

  it('saves column widths to the board settings once resizing settles', async () => {
    const { board, stateManager, setState } = setup();
    const el = await mount(board, stateManager);
    const resizer = headers(el)[0].querySelector('.resizer')!;

    await fire(resizer, 'mousedown', { clientX: 300 });
    await fire(document, 'mousemove', { clientX: 320 });
    await fire(document, 'mousemove', { clientX: 340 });
    await fire(document, 'mouseup', { clientX: 340 });

    // Writes are debounced by 500ms and nothing is written on first render.
    expect(setState).not.toHaveBeenCalled();
    await act(() => new Promise((resolve) => setTimeout(resolve, 600)));

    expect(setState).toHaveBeenCalledTimes(1);
    const next = setState.mock.calls[0][0](board);
    expect(next.data.settings['table-sizing']).toEqual({ card: 312 });
  });

  it('starts from the widths saved in the board settings', async () => {
    const { board, stateManager } = setup({ 'table-sizing': { card: 400, lane: 200 } });
    const el = await mount(board, stateManager);

    expect(el.querySelector('table')!.style.width).toBe('600px');
  });
});
