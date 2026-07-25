// Minimal runtime stand-in for `obsidian-dataview`, used only in tests.
// Returns undefined, matching real behavior when the Dataview plugin isn't installed.
export function getAPI(): undefined {
  return undefined;
}
