// Usage: bun run release <version>
//
// Sets the version in package.json, manifest.json and versions.json, turns the
// README's "### Unreleased" changelog heading into "### <version>", commits, tags
// and pushes. The tag starts the release workflow, which builds the plugin and
// publishes it with that changelog section as the release notes.
import { $ } from 'bun';

const version = process.argv[2];

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) {
  fail('Usage: bun run release <major.minor.patch>');
}
// Untracked files are fine: the release commit only takes the files below,
// and the release workflow builds from the tag.
if ((await $`git status --porcelain --untracked-files=no`.text()).trim()) {
  fail('The working tree has uncommitted changes.');
}
if ((await $`git branch --show-current`.text()).trim() !== 'main') {
  fail('Releases are made from main.');
}
if ((await $`git tag --list ${version}`.text()).trim()) {
  fail(`Tag ${version} already exists.`);
}

const readme = await Bun.file('README.md').text();
if (!readme.includes('\n### Unreleased\n')) {
  fail('README.md has no "### Unreleased" changelog section to release.');
}
await Bun.write('README.md', readme.replace('\n### Unreleased\n', `\n### ${version}\n`));

const pkg = await Bun.file('package.json').json();
pkg.version = version;
await Bun.write('package.json', JSON.stringify(pkg, null, 2) + '\n');

// Obsidian matches the release tag against manifest.json's version, and reads
// versions.json to find the newest release a given app version can install.
const manifest = await Bun.file('manifest.json').json();
manifest.version = version;
await Bun.write('manifest.json', JSON.stringify(manifest, null, '\t') + '\n');

const versions = await Bun.file('versions.json').json();
versions[version] = manifest.minAppVersion;
await Bun.write('versions.json', JSON.stringify(versions, null, '\t') + '\n');

await $`git commit -m ${`Release ${version}`} README.md package.json manifest.json versions.json`;
await $`git tag ${version}`;
await $`git push --atomic origin main ${version}`;
