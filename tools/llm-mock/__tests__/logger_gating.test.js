describe('logger gating via MOCK_DEBUG', () => {
  const mockCorePath = require.resolve('../lib/mock-core');
  let origEnv = {};
  beforeEach(() => {
    // save env
    origEnv = Object.assign({}, process.env);
    // clear require cache for mock-core so it will reinitialize with new env
    delete require.cache[mockCorePath];
  });
  afterEach(() => {
    // restore env and clear cache
    process.env = Object.assign({}, origEnv);
    delete require.cache[mockCorePath];
  });

  test('default without MOCK_DEBUG uses info level', () => {
    delete process.env.MOCK_DEBUG;
    delete require.cache[mockCorePath];
    const core = require('../lib/mock-core');
    // pino logger exposes .level
    expect(core.logger.level).toBe('info');
  });

  test('with MOCK_DEBUG=true sets debug level', () => {
    process.env.MOCK_DEBUG = 'true';
    delete require.cache[mockCorePath];
    const core = require('../lib/mock-core');
    expect(core.logger.level).toBe('debug');
  });

  test('with MOCK_DEBUG=false keeps info level', () => {
    process.env.MOCK_DEBUG = 'false';
    delete require.cache[mockCorePath];
    const core = require('../lib/mock-core');
    expect(core.logger.level).toBe('info');
  });
});
