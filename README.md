# Obsidian Kando Plugin

Create markdown-backed Kanban boards in [Obsidian](https://obsidian.md/).

This is a personal fork/continuation of [obsidian-community/obsidian-kanban](https://github.com/obsidian-community/obsidian-kanban) (originally created by [mgmeyers](https://github.com/mgmeyers)), rebased on the latest toolchain (TypeScript 7, strict null checks, all dependencies current) with a small Vitest suite covering the markdown parser and drag-and-drop data layer.

- [Bugs, Issues, & Feature Requests](https://github.com/moritosh/obsidian-kando/issues)
- [Development Roadmap](https://github.com/moritosh/obsidian-kando/projects/1)

![Screen Shot 2021-09-16 at 12.58.22 PM.png](https://github.com/obsidian-community/obsidian-kanban/blob/main/docs/Assets/Screen%20Shot%202021-09-16%20at%2012.58.22%20PM.png)

![Screen Shot 2021-09-16 at 1.10.38 PM.png](https://github.com/obsidian-community/obsidian-kanban/blob/main/docs/Assets/Screen%20Shot%202021-09-16%20at%201.10.38%20PM.png)

## Installing

This plugin isn't in the community plugin store. To install manually:

1. Run `yarn build` (see below).
2. Copy `build/obsidian-kando/` into your vault's `.obsidian/plugins/obsidian-kando/` folder (or symlink it there).
3. Reload Obsidian and enable **Kando** under Settings → Community plugins.

## Development

Requires [Yarn](https://yarnpkg.com/) (this repo doesn't use npm/pnpm).

```sh
yarn install       # install dependencies
yarn dev           # esbuild in watch mode
yarn build         # production build -> build/obsidian-kando/
yarn typecheck     # tsc --noemit
yarn test          # run the Vitest suite
yarn lint          # eslint (currently broken: typescript-eslint doesn't yet support TS 7)
```

## License

GNU GPLv3 (or later) — see [LICENSE.md](./LICENSE.md). This is a derivative work of [obsidian-community/obsidian-kanban](https://github.com/obsidian-community/obsidian-kanban), also GPLv3.
