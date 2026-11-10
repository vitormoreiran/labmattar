import { LABORATORY_TOOLS } from '../public/lab-tool-navigation.mjs';

// The published index and the tool switcher must expose the same destinations.
// Queries may select a workspace; the tool itself is identified by its path.
export function checkLaboratoryLinks(hrefs, base) {
  const origin = new URL(base).origin;
  const expected = LABORATORY_TOOLS.map(tool => new URL(tool.href, base).pathname);
  const actual = hrefs.map(href => {
    try { const url = new URL(href, base); return url.origin === origin ? url.pathname : url.href; }
    catch { return String(href); }
  });
  const missing = expected.filter(path => !actual.includes(path));
  const unexpected = actual.filter(path => !expected.includes(path));
  const duplicates = actual.filter((path, index) => actual.indexOf(path) !== index);
  return { ready: actual.length === expected.length && !missing.length && !unexpected.length && !duplicates.length, expected, actual, missing, unexpected, duplicates };
}
