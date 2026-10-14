import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

describe('entities registry', () => {
  it('lists every entity file under src', async () => {
    // data-source.ts requires DATABASE_URL when it loads; the unit test job has none.
    vi.stubEnv('DATABASE_URL', 'postgres://localhost:5432/unused');
    const { entities } = await import('./data-source.js');
    const src = fileURLToPath(new URL('..', import.meta.url));
    const files = readdirSync(src, { recursive: true, withFileTypes: true }).filter(
      (entry) => entry.isFile() && entry.name.endsWith('.entity.ts'),
    );

    expect(entities).toHaveLength(files.length);
  });
});
