# Obsidian Kando Plugin

Create markdown-backed Kanban boards in [Obsidian](https://obsidian.md/).

This is a personal fork/continuation of [obsidian-community/obsidian-kanban](https://github.com/obsidian-community/obsidian-kanban) (originally created by [mgmeyers](https://github.com/mgmeyers)), rebased on the latest toolchain (TypeScript 7, strict null checks, all dependencies current) with a small Vitest suite covering the markdown parser and drag-and-drop data layer.

- [Bugs, Issues, & Feature Requests](https://github.com/moritosh/obsidian-kando/issues)
- [Development Roadmap](https://github.com/moritosh/obsidian-kando/projects/1)

![Screen Shot 2021-09-16 at 12.58.22 PM.png](https://github.com/obsidian-community/obsidian-kanban/blob/main/docs/Assets/Screen%20Shot%202021-09-16%20at%2012.58.22%20PM.png)

![Screen Shot 2021-09-16 at 1.10.38 PM.png](https://github.com/obsidian-community/obsidian-kanban/blob/main/docs/Assets/Screen%20Shot%202021-09-16%20at%201.10.38%20PM.png)

## Installing

This plugin isn't in the community plugin store. To install manually:

1. Run `pnpm build` (see below).
2. Copy `build/obsidian-kando/` into your vault's `.obsidian/plugins/obsidian-kando/` folder (or symlink it there).
3. Reload Obsidian and enable **Kando** under Settings → Community plugins.

## Development

Requires [pnpm](https://pnpm.io/) (this repo doesn't use npm/yarn). The version is pinned via the `packageManager` field, so `corepack enable` is enough to get the right one.

```sh
pnpm install       # install dependencies
pnpm dev           # esbuild in watch mode
pnpm build         # production build -> build/obsidian-kando/
pnpm typecheck     # tsc --noemit
pnpm test          # run the Vitest suite
pnpm lint          # eslint (currently broken: typescript-eslint doesn't yet support TS 7)
```

Dependencies are pinned to exact versions — no `^` or `~` ranges — and `pnpm-lock.yaml` is committed. `.npmrc` sets `save-exact=true`, so `pnpm add <pkg>` pins automatically. To move a dependency, bump it deliberately (`pnpm update <pkg> --latest`) and commit the lockfile with it.

## Changelog

### 1.1.0

- Added an optional **Celebrate completions** setting: checking off a card, or moving it to a list named (or explicitly marked as) "Done", has a chance to send a random creature (unicorn, dragon, otter, whale, or flamingo) flying across the screen with a rainbow trail. Off by default; enable it in the plugin settings or per-board.
- Trimmed several small runtime dependencies (`classcat`, `is-plain-object`, `deepmerge`, `react-fast-compare`, `animated-scroll-to`, and a few others) in favor of inlined implementations, shrinking the plugin's bundle.
- Enabled `noImplicitOverride` and hardened external card links to only follow `http(s)` URLs.

### 1.0.0

- Initial release of this fork: rebranded as obsidian-kando, rebased on the current TypeScript/toolchain with strict null checks, and added a Vitest suite covering the markdown parser and drag-and-drop data layer.

## License

GNU GPLv3 (or later) — see [LICENSE.md](./LICENSE.md). This is a derivative work of [obsidian-community/obsidian-kanban](https://github.com/obsidian-community/obsidian-kanban), also GPLv3.
