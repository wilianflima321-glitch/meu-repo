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

  const { execFileSync } = require('child_process');

  function nodeLoggerLevelWithEnv(env) {
    // Run a short node subprocess that requires the mock-core module and prints logger.level
    const script = `Object.assign(process.env, ${JSON.stringify(env)}); const core = require('./lib/mock-core'); console.log(core.logger.level);`;
    // Use execFileSync with explicit args to avoid quoting issues on Windows paths
    // Prepare child env: remove MOCK_DEBUG unless it's explicitly provided in env param
    const childEnv = Object.assign({}, process.env);
    if (!Object.prototype.hasOwnProperty.call(env, 'MOCK_DEBUG')) {
      delete childEnv.MOCK_DEBUG;
    }
    Object.assign(childEnv, env || {});
    const out = execFileSync(process.execPath, ['-e', script], { cwd: __dirname + '/..', env: childEnv });
    return String(out || '').trim();
  }

  test('default without MOCK_DEBUG uses info level', () => {
    const level = nodeLoggerLevelWithEnv({});
    expect(level).toBe('info');
  });

  test('with MOCK_DEBUG=true sets debug level', () => {
    const level = nodeLoggerLevelWithEnv({ MOCK_DEBUG: 'true' });
    expect(level).toBe('debug');
  });

  test('with MOCK_DEBUG=false keeps info level', () => {
    const level = nodeLoggerLevelWithEnv({ MOCK_DEBUG: 'false' });
    expect(level).toBe('info');
  });
});
