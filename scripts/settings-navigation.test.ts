import assert from 'node:assert/strict';
import {
  createSettingsPath,
  getSettingsReturnPath,
  normalizeSettingsReturnPath,
} from '../artifacts/d8advisr/src/lib/settingsNavigation.ts';

assert.equal(createSettingsPath('/home'), '/settings?returnTo=%2Fhome');
assert.equal(createSettingsPath('/profile'), '/settings?returnTo=%2Fprofile');
assert.equal(getSettingsReturnPath('?returnTo=%2Fhome'), '/home');
assert.equal(getSettingsReturnPath(''), '/profile', 'Direct Settings entry must retain the safe Profile fallback');

for (const unsafePath of ['https://example.com', '//example.com', '/', '/admin', '/signin', '/settings?returnTo=/home']) {
  assert.equal(normalizeSettingsReturnPath(unsafePath), '/profile', `${unsafePath} must use the safe fallback`);
}

console.log('PASS settings preserves safe consumer return destinations');
