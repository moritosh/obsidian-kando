// Minimal runtime stand-in for the `obsidian` module, used only by the Vitest
// test environment (see vitest.config.ts alias). Not shipped in the plugin build.
//
// Most of this surface exists purely so that modules which transitively import
// the plugin's UI layer (main.ts, KanbanView, Settings) can load without
// crashing on `class X extends SomeObsidianClass` at module-evaluation time.
// Only parseYaml/stringifyYaml/moment/TFile/TFolder get real behavior, since
// those are what the parser/helper tests actually exercise.
import realMoment from 'moment';
import { parse as yamlParse, stringify as yamlStringify } from 'yaml';

export const moment = realMoment as unknown as typeof realMoment & Record<string, unknown>;

export function parseYaml(yaml: string): any {
  if (!yaml || !yaml.trim()) return {};
  return yamlParse(yaml) ?? {};
}

export function stringifyYaml(obj: any): string {
  return yamlStringify(obj);
}

export function getLinkpath(path: string): string {
  return path.split('#')[0].split('|')[0];
}

export function parseLinktext(linktext: string): { path: string; subpath: string } {
  const [path, subpath] = linktext.split('#');
  return { path, subpath: subpath ? '#' + subpath : '' };
}

export function htmlToMarkdown(html: string): string {
  return html;
}

export function debounce<T extends (...args: any[]) => any>(fn: T): T {
  return fn;
}

export function setIcon(): void {}

export const Platform = {
  isMobile: false,
  isDesktop: true,
  isMacOS: false,
};

export class TFile {
  path: string;
  name: string;
  basename: string;
  extension: string;
  stat: { ctime: number; mtime: number; size: number };
  parent: unknown = null;
  vault: unknown = null;

  constructor(path = '') {
    this.path = path;
    this.name = path.split('/').pop() ?? path;
    const dot = this.name.lastIndexOf('.');
    this.basename = dot >= 0 ? this.name.slice(0, dot) : this.name;
    this.extension = dot >= 0 ? this.name.slice(dot + 1) : '';
    this.stat = { ctime: 0, mtime: 0, size: 0 };
  }
}

export class TFolder {
  path: string;
  name: string;
  children: unknown[] = [];

  constructor(path = '') {
    this.path = path;
    this.name = path.split('/').pop() ?? path;
  }
}

export class Vault {
  getAbstractFileByPath(): null {
    return null;
  }
  getConfig(): unknown {
    return undefined;
  }
}

export class Menu {
  addItem() {
    return this;
  }
  addSeparator() {
    return this;
  }
  addSections() {
    return this;
  }
  showAtMouseEvent() {
    return this;
  }
  showAtPosition() {
    return this;
  }
}

export class Keymap {
  static isModEvent(): boolean {
    return false;
  }
}

export class Component {
  load() {}
  onload() {}
  unload() {}
  onunload() {}
  addChild<T>(child: T): T {
    return child;
  }
  removeChild() {}
  register() {}
  registerEvent() {}
  registerDomEvent() {}
  registerInterval() {}
}

export class App {
  metadataCache: any = {
    getFirstLinkpathDest: () => null,
    getFileCache: () => null,
  };
  vault: any = new Vault();
  workspace: any = {};
  plugins: any = {
    enabledPlugins: new Set(),
    plugins: {},
  };
  internalPlugins: any = {
    plugins: {},
  };
}

export class Plugin extends Component {
  app: App;
  constructor(app?: App) {
    super();
    this.app = app ?? new App();
  }
  addCommand() {}
  addRibbonIcon() {}
  addSettingTab() {}
  registerView() {}
  registerExtensions() {}
  loadData(): Promise<any> {
    return Promise.resolve({});
  }
  saveData(): Promise<void> {
    return Promise.resolve();
  }
}

export class View extends Component {
  app: App;
  leaf: unknown;
  containerEl: HTMLElement = document.createElement('div');
  contentEl: HTMLElement = document.createElement('div');
  constructor(leaf?: any) {
    super();
    this.leaf = leaf;
    this.app = leaf?.app ?? new App();
  }
  getViewType(): string {
    return 'view';
  }
  getDisplayText(): string {
    return '';
  }
}

export class TextFileView extends View {
  data = '';
  file: TFile | null = null;
  requestSave() {}
}

export class Modal extends Component {
  app: App;
  contentEl: HTMLElement = document.createElement('div');
  constructor(app: App) {
    super();
    this.app = app;
  }
  open() {}
  close() {}
  onOpen() {}
  onClose() {}
}

export class PluginSettingTab extends Component {
  app: App;
  containerEl: HTMLElement = document.createElement('div');
  constructor(app: App) {
    super();
    this.app = app;
  }
  display() {}
  hide() {}
}

export class Setting {
  constructor(_containerEl: HTMLElement) {}
  setName() {
    return this;
  }
  setDesc() {
    return this;
  }
  addText() {
    return this;
  }
  addToggle() {
    return this;
  }
  addDropdown() {
    return this;
  }
  addButton() {
    return this;
  }
  addExtraButton() {
    return this;
  }
}

export class ToggleComponent {
  setValue() {
    return this;
  }
  onChange() {
    return this;
  }
}

export class DropdownComponent {
  addOption() {
    return this;
  }
  setValue() {
    return this;
  }
  onChange() {
    return this;
  }
}

export class MarkdownView extends TextFileView {}

export class EditorSuggest<T> extends Component {
  app: App;
  constructor(app: App) {
    super();
    this.app = app;
  }
  open() {}
  close() {}
}

export type Editor = any;
export type EditorPosition = { line: number; ch: number };
export type EditorSuggestContext = any;
export type EditorSuggestTriggerInfo = any;
export type ViewState = any;
export type ViewStateResult = any;
export type WorkspaceLeaf = any;
export type HoverParent = any;
export type HoverPopover = any;
export type Stat = { ctime: number; mtime: number; size: number };

export const MarkdownRenderer = {
  render: () => Promise.resolve(),
  renderMarkdown: () => Promise.resolve(),
};
