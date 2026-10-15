import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { migrations } from './index.js';

describe('migrations registry', () => {
  it('lists every migration file in the folder', () => {
    const folder = fileURLToPath(new URL('.', import.meta.url));
    const files = readdirSync(folder).filter((file) => /^\d+-.+\.ts$/.test(file));

    expect(migrations).toHaveLength(files.length);
  });
});
