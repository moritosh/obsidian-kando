import update from 'immutability-helper';
import { memo, useCallback, useEffect, useRef, useState } from 'preact/compat';
import { StateManager } from 'src/StateManager';
import { Path } from 'src/dnd/types';
import { celebrate } from 'src/helpers/celebrate';
import { getTaskStatusDone, toggleTask } from 'src/parsers/helpers/inlineMetadata';

import { BoardModifiers } from '../../helpers/boardModifiers';
import { Icon } from '../Icon/Icon';
import { c } from '../helpers';
import { Item } from '../types';

interface ItemCheckboxProps {
  path: Path;
  item: Item;
  shouldMarkItemsComplete: boolean;
  stateManager: StateManager;
  boardModifiers: BoardModifiers;
}

export const ItemCheckbox = memo(function ItemCheckbox({
  shouldMarkItemsComplete,
  path,
  item,
  stateManager,
  boardModifiers,
}: ItemCheckboxProps) {
  const shouldShowCheckbox = stateManager.useSetting('show-checkboxes');

  const [isCtrlHoveringCheckbox, setIsCtrlHoveringCheckbox] = useState(false);
  const [isHoveringCheckbox, setIsHoveringCheckbox] = useState(false);
  const checkboxRef = useRef<HTMLInputElement>(null);

  const onCheckboxChange = useCallback(() => {
    const wasChecked = item.data.checked;
    const celebrateIfNewlyChecked = (nowChecked: boolean | undefined) => {
      if (!wasChecked && nowChecked && stateManager.getSetting('celebrate-completions')) {
        const rect = checkboxRef.current?.getBoundingClientRect();
        celebrate(
          activeWindow,
          rect && { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        );
      }
    };

    const updates = toggleTask(item, stateManager.file);
    if (updates) {
      const [itemStrings, checkChars, thisIndex] = updates;
      const replacements: Item[] = itemStrings.map((str, i) => {
        const next = stateManager.getNewItem(str, checkChars[i]);
        if (i === thisIndex) next.id = item.id;
        return next;
      });

      boardModifiers.replaceItem(path, replacements);
      celebrateIfNewlyChecked(replacements[thisIndex]?.data.checked);
    } else {
      const nowChecked = !wasChecked;

      boardModifiers.updateItem(
        path,
        update(item, {
          data: {
            checkChar: {
              $apply: (v) => {
                return v === ' ' ? getTaskStatusDone() : ' ';
              },
            },
            $toggle: ['checked'],
          },
        })
      );

      celebrateIfNewlyChecked(nowChecked);
    }
  }, [item, stateManager, boardModifiers, ...path]);

  useEffect(() => {
    if (isHoveringCheckbox) {
      const handler = (e: KeyboardEvent) => {
        if (e.metaKey || e.ctrlKey) {
          setIsCtrlHoveringCheckbox(true);
        } else {
          setIsCtrlHoveringCheckbox(false);
        }
      };

      activeWindow.addEventListener('keydown', handler);
      activeWindow.addEventListener('keyup', handler);

      return () => {
        activeWindow.removeEventListener('keydown', handler);
        activeWindow.removeEventListener('keyup', handler);
      };
    }
  }, [isHoveringCheckbox]);

  if (!(shouldMarkItemsComplete || shouldShowCheckbox)) {
    return null;
  }

  return (
    <div
      onMouseEnter={(e) => {
        setIsHoveringCheckbox(true);

        if (e.ctrlKey || e.metaKey) {
          setIsCtrlHoveringCheckbox(true);
        }
      }}
      onMouseLeave={() => {
        setIsHoveringCheckbox(false);

        if (isCtrlHoveringCheckbox) {
          setIsCtrlHoveringCheckbox(false);
        }
      }}
      className={c('item-prefix-button-wrapper')}
    >
      {shouldShowCheckbox && !isCtrlHoveringCheckbox && (
        <input
          ref={checkboxRef}
          onChange={onCheckboxChange}
          type="checkbox"
          className="task-list-item-checkbox"
          checked={item.data.checked}
          data-task={item.data.checkChar}
        />
      )}
      {(isCtrlHoveringCheckbox || (!shouldShowCheckbox && shouldMarkItemsComplete)) && (
        <a
          onClick={() => {
            boardModifiers.archiveItem(path);
          }}
          className={`${c('item-prefix-button')} clickable-icon`}
          aria-label={isCtrlHoveringCheckbox ? undefined : 'Archive card'}
        >
          <Icon name="sheets-in-box" />
        </a>
      )}
    </div>
  );
});
