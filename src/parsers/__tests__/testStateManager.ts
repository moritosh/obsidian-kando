import { TFile } from 'obsidian';
import type { KanbanSettings } from 'src/Settings';
import type { StateManager } from 'src/StateManager';

const defaultTestSettings: KanbanSettings = {
  'date-trigger': '@',
  'time-trigger': '@@',
  'date-format': 'YYYY-MM-DD',
  'date-display-format': 'YYYY-MM-DD',
  'time-format': 'HH:mm',
  'inline-metadata-position': 'body',
  'move-tags': false,
  'move-dates': false,
  'move-task-metadata': false,
  'metadata-keys': [],
  'date-colors': [],
  'tag-colors': [],
  'tag-sort': [],
  'archive-date-format': 'YYYY-MM-DD HH:mm',
  'archive-date-separator': '',
};

export interface TestStateManagerOptions {
  settings?: Partial<KanbanSettings>;
  file?: TFile;
  getFirstLinkpathDest?: (linkpath: string, sourcePath: string) => TFile | null;
  getFileCache?: (file: TFile) => any;
}

export function createTestStateManager(options: TestStateManagerOptions = {}): StateManager {
  const settings = { ...defaultTestSettings, ...options.settings };
  const file = options.file ?? new TFile('test board.md');

  const stub = {
    file,
    state: undefined,
    app: {
      metadataCache: {
        getFirstLinkpathDest: options.getFirstLinkpathDest ?? (() => null),
        getFileCache: options.getFileCache ?? (() => null),
      },
    },
    getSetting: (key: keyof KanbanSettings) => settings[key],
    hasError: () => false,
    setError: (e: Error) => {
      throw e;
    },
    compileSettings: () => {},
  };

  return stub as unknown as StateManager;
}
