import esbuild from 'esbuild';
import { lessLoader } from 'esbuild-plugin-less';
import fs from 'fs';
import { builtinModules } from 'module';
import path from 'path';
import process from 'process';

const isProd = process.argv[2] === 'production';
const OUT_DIR = './build/obsidian-kando';

// Boards can live in popout windows, so timers and animation frames scheduled by
// bundled libraries have to run on the window the plugin is active in.
const activeWindowGlobals = {
  name: 'active-window-globals',
  setup(build) {
    const pattern = /\b(requestAnimationFrame|cancelAnimationFrame|clearTimeout|setTimeout)\b/g;
    build.onLoad({ filter: /node_modules\/.*/ }, async (args) => {
      const source = await fs.promises.readFile(args.path, 'utf8');
      const contents = source.replace(pattern, (match, name, offset) =>
        source[offset - 1] === '.' ? match : `activeWindow.${name}`
      );
      return { contents, loader: 'default' };
    });
  },
};

const copyManifestPlugin = {
  name: 'copy-manifest',
  setup(build) {
    build.onEnd(() => {
      fs.mkdirSync(OUT_DIR, { recursive: true });
      fs.copyFileSync('./manifest.json', path.join(OUT_DIR, 'manifest.json'));
    });
  },
};

const context = await esbuild.context({
  entryPoints: ['./src/main.ts', './src/styles.less'],
  bundle: true,
  define: {
    global: 'window',
  },
  plugins: [lessLoader(), activeWindowGlobals, copyManifestPlugin],
  external: [
    'obsidian',
    'electron',
    '@codemirror/autocomplete',
    '@codemirror/closebrackets',
    '@codemirror/collab',
    '@codemirror/commands',
    '@codemirror/comment',
    '@codemirror/fold',
    '@codemirror/gutter',
    '@codemirror/highlight',
    '@codemirror/history',
    '@codemirror/language',
    '@codemirror/lint',
    '@codemirror/matchbrackets',
    '@codemirror/panel',
    '@codemirror/rangeset',
    '@codemirror/rectangular-selection',
    '@codemirror/search',
    '@codemirror/state',
    '@codemirror/stream-parser',
    '@codemirror/text',
    '@codemirror/tooltip',
    '@codemirror/view',
    'node:*',
    // `buffer` is bundled from npm instead: box-intersect needs it and mobile has no Node.
    ...builtinModules.filter((m) => m !== 'buffer'),
  ],
  format: 'cjs',
  target: 'es2018',
  logLevel: 'info',
  sourcemap: isProd ? false : 'inline',
  treeShaking: true,
  outdir: OUT_DIR,
  minify: isProd,
});

if (isProd) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
