describe('data-source', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('fails with a clear message and no connection details when DATABASE_URL is missing', async () => {
    vi.stubEnv('DATABASE_URL', '');

    const loading = import('./data-source.js');

    await expect(loading).rejects.toThrow('Falta DATABASE_URL');
    await expect(loading).rejects.not.toThrow(/postgres/);
  });
});
