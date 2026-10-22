import { render } from 'preact';
import { useContext, useMemo, useRef } from 'preact/compat';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DndManager } from '../../managers/DndManager';
import { useDragHandle } from '../../managers/DragManager';
import { Entity } from '../../types';
import { DndContext } from '../DndContext';
import { Droppable } from '../Droppable';
import { Sortable } from '../Sortable';
import { DndManagerContext } from '../context';

const ITEM_HEIGHT = 40;
const ITEM_GAP = 10;

// jsdom has no layout, so give each item the box it would have in a vertical list.
function layOut(el: HTMLElement, index: number) {
  const top = index * (ITEM_HEIGHT + ITEM_GAP);
  el.getBoundingClientRect = () =>
    ({
      x: 0,
      y: top,
      left: 0,
      top,
      width: 200,
      height: ITEM_HEIGHT,
      right: 200,
      bottom: top + ITEM_HEIGHT,
      toJSON: () => ({}),
    }) as DOMRect;
}

// Mirrors how Item wires its refs: the outer node is measured and is the drag handle.
function TestItem({ id, index }: { id: string; index: number }) {
  const measureRef = useRef<HTMLDivElement | null>(null);
  const elementRef = useRef<HTMLDivElement | null>(null);
  const bindHandle = useDragHandle(measureRef, measureRef);
  const data = useMemo(() => ({ id, type: 'item', accepts: ['item'] }), [id]);

  return (
    <div
      data-testid={id}
      ref={(el) => {
        if (el) layOut(el, index);
        measureRef.current = el;
        bindHandle(el);
      }}
    >
      <div ref={elementRef}>
        <Droppable
          id={id}
          index={index}
          elementRef={elementRef}
          measureRef={measureRef}
          data={data}
        >
          {id}
        </Droppable>
      </div>
    </div>
  );
}

let manager: DndManager | null = null;
function CaptureManager() {
  manager = useContext(DndManagerContext);
  return null;
}

interface ListProps {
  ids: string[];
  onDrop: (drag: Entity, drop: Entity) => void;
  onSortChange?: (isSorting: boolean) => void;
}

function List({ ids, onDrop, onSortChange }: ListProps) {
  return (
    <DndContext win={window} onDrop={onDrop}>
      <CaptureManager />
      <Sortable axis="vertical" onSortChange={onSortChange}>
        {ids.map((id, i) => (
          <TestItem key={id} id={id} index={i} />
        ))}
      </Sortable>
    </DndContext>
  );
}

let container: HTMLElement | null = null;

async function mount(ids: string[], onDrop = vi.fn(), onSortChange = vi.fn()) {
  container = document.body.appendChild(document.createElement('div'));
  await act(() => {
    render(<List ids={ids} onDrop={onDrop} onSortChange={onSortChange} />, container!);
  });
  // Droppables register once Obsidian's onNodeInserted fires, which is async.
  await vi.waitFor(() => expect(manager!.hitboxEntities.size).toBe(ids.length));
  return { el: container, onDrop, onSortChange, dndManager: manager! };
}

afterEach(() => {
  if (container) {
    render(null, container);
    container.remove();
  }
  container = null;
  manager = null;
});

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

function pointer(target: EventTarget, type: string, x: number, y: number) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    buttons: type === 'pointerup' ? 0 : 1,
    clientX: x,
    clientY: y,
  });
  // jsdom's MouseEvent has no pointer fields, its constructor rejects Vitest's
  // global window as `view`, and pageX/Y follow scroll (always 0 here).
  Object.defineProperties(event, {
    view: { value: window },
    pointerId: { value: 1 },
    pointerType: { value: 'mouse' },
    pageX: { value: x },
    pageY: { value: y },
  });
  target.dispatchEvent(event);
}

async function drag(handle: HTMLElement, from: [number, number], to: [number, number]) {
  pointer(handle, 'pointerdown', ...from);
  // Moves are throttled to one per frame: the first crosses the drag threshold and
  // starts the drag, the second moves the dragged hitbox over its target.
  pointer(window, 'pointermove', from[0], from[1] + 10);
  await nextFrame();
  pointer(window, 'pointermove', ...to);
  await nextFrame();
  pointer(window, 'pointerup', ...to);
}

describe('drag and drop', () => {
  it('registers a hitbox per droppable and one sort listener', async () => {
    const { dndManager } = await mount(['a', 'b', 'c']);

    expect(Array.from(dndManager.hitboxEntities.values()).map((e) => e.getData().id)).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(dndManager.hitboxEntities.get('-b')!.getHitbox()).toEqual([0, 50, 200, 90]);
    expect(dndManager.dragManager.emitter.listenerCount('dragEnd')).toBe(1);
  });

  it('drops a dragged item onto the item it is moved over', async () => {
    const { el, onDrop } = await mount(['a', 'b', 'c']);

    // Drag "a" from its middle down over "c" (top 100).
    await drag(el.querySelector('[data-testid="a"]')!, [100, 20], [100, 130]);

    await vi.waitFor(() => expect(onDrop).toHaveBeenCalledTimes(1));
    const [dragEntity, dropEntity] = onDrop.mock.calls[0];
    expect(dragEntity.getData().id).toBe('a');
    expect(dropEntity.getData().id).toBe('c');
    expect(dropEntity.getPath()).toEqual([2]);
  });

  it('does not drop when an item is released over itself', async () => {
    const { el, onDrop, onSortChange } = await mount(['a', 'b', 'c']);

    // Far enough to start a drag (> 5px), but the hitbox stays clear of "a" and "c".
    await drag(el.querySelector('[data-testid="b"]')!, [100, 70], [100, 75]);

    // The sort ends in the same timer that decides whether to drop.
    expect(onSortChange).toHaveBeenCalledWith(true);
    await vi.waitFor(() => expect(onSortChange).toHaveBeenLastCalledWith(false));
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('ignores pointer moves under the drag threshold', async () => {
    const { el, onDrop, dndManager } = await mount(['a', 'b']);
    const onDragStart = vi.fn();
    dndManager.dragManager.emitter.on('dragStart', onDragStart);

    pointer(el.querySelector('[data-testid="a"]')!, 'pointerdown', 100, 20);
    pointer(window, 'pointermove', 102, 22);
    await nextFrame();
    pointer(window, 'pointerup', 102, 22);

    expect(onDragStart).not.toHaveBeenCalled();
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('unregisters hitboxes and listeners when the list unmounts', async () => {
    const { dndManager } = await mount(['a', 'b', 'c']);
    const emitter = dndManager.dragManager.emitter;

    // Preact 11 runs effect cleanups after paint; act() flushes them.
    await act(() => {
      render(null, container!);
    });

    expect(dndManager.hitboxEntities.size).toBe(0);
    for (const event of ['dragStart', 'dragEnd', 'dragEnter', 'dragLeave']) {
      expect(emitter.listenerCount(event)).toBe(0);
    }
  });

  it('re-registers under the new index when an item moves', async () => {
    const onDrop = vi.fn();
    const onSortChange = vi.fn();
    const { dndManager } = await mount(['a', 'b', 'c'], onDrop, onSortChange);

    await act(() => {
      render(
        <List ids={['c', 'a', 'b']} onDrop={onDrop} onSortChange={onSortChange} />,
        container!
      );
    });

    const paths: Record<string, number[]> = {};
    dndManager.hitboxEntities.forEach((e) => (paths[e.getData().id] = e.getPath()));
    expect(paths).toEqual({ a: [1], b: [2], c: [0] });
  });
});
