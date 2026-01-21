'use client';

import { useCallback, useEffect, useState } from 'react';
import { getTestManager, TestItem, TestResult, TestCoverage } from '@/lib/test/test-manager';

export default function TestingPage() {
  const [tests, setTests] = useState<TestItem[]>([]);
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Map<string, TestResult>>(new Map());
  const [coverage, setCoverage] = useState<TestCoverage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [filter, setFilter] = useState<'all' | 'passed' | 'failed' | 'skipped'>('all');
  const [showCoverage, setShowCoverage] = useState(false);

  const testManager = getTestManager();

  const discoverTests = useCallback(async () => {
    setIsDiscovering(true);
    try {
      const discovered = await testManager.discoverTests('/workspace');
      setTests(discovered);
    } catch (error) {
      console.error('Falha ao descobrir testes:', error);
    } finally {
      setIsDiscovering(false);
    }
  }, [testManager]);

  useEffect(() => {
    discoverTests();
  }, [discoverTests]);

  const runTests = async (testIds?: string[]) => {
    setIsRunning(true);
    try {
      const idsToRun = testIds || Array.from(selectedTests);
      if (idsToRun.length === 0) {
        // Run all tests
        idsToRun.push(...getAllTestIds(tests));
      }

      const run = await testManager.runTests(idsToRun, '/workspace');
      setResults(run.results);

      // Get coverage if available
      if (showCoverage) {
        const cov = await testManager.getCoverage('/workspace');
        setCoverage(cov);
      }
    } catch (error) {
      console.error('Falha ao executar testes:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const debugTest = async (testId: string) => {
    try {
      await testManager.debugTest(testId, '/workspace');
    } catch (error) {
      console.error('Falha ao depurar teste:', error);
    }
  };

  const toggleTestSelection = (testId: string) => {
    const newSelection = new Set(selectedTests);
    if (newSelection.has(testId)) {
      newSelection.delete(testId);
    } else {
      newSelection.add(testId);
    }
    setSelectedTests(newSelection);
  };

  const selectAll = () => {
    const allIds = getAllTestIds(tests);
    setSelectedTests(new Set(allIds));
  };

  const deselectAll = () => {
    setSelectedTests(new Set());
  };

  const getAllTestIds = (items: TestItem[]): string[] => {
    const ids: string[] = [];
    for (const item of items) {
      if (item.type === 'test') {
        ids.push(item.id);
      }
      if (item.children) {
        ids.push(...getAllTestIds(item.children));
      }
    }
    return ids;
  };

  const getTestStats = () => {
    let passed = 0, failed = 0, skipped = 0, total = 0;
    
    for (const result of results.values()) {
      total++;
      if (result.state === 'passed') passed++;
      else if (result.state === 'failed' || result.state === 'errored') failed++;
      else if (result.state === 'skipped') skipped++;
    }

    return { passed, failed, skipped, total };
  };

  const getCoverageStats = () => {
    if (coverage.length === 0) return { lines: 0, branches: 0, functions: 0 };

    let totalLines = 0, coveredLines = 0;
    let totalBranches = 0, coveredBranches = 0;
    let totalFunctions = 0, coveredFunctions = 0;

    for (const cov of coverage) {
      totalLines += cov.lines.total;
      coveredLines += cov.lines.covered;
      
      if (cov.branches) {
        totalBranches += cov.branches.total;
        coveredBranches += cov.branches.covered;
      }
      
      if (cov.functions) {
        totalFunctions += cov.functions.total;
        coveredFunctions += cov.functions.covered;
      }
    }

    return {
      lines: totalLines > 0 ? (coveredLines / totalLines * 100).toFixed(1) : 0,
      branches: totalBranches > 0 ? (coveredBranches / totalBranches * 100).toFixed(1) : 0,
      functions: totalFunctions > 0 ? (coveredFunctions / totalFunctions * 100).toFixed(1) : 0
    };
  };

  const renderTestItem = (item: TestItem, depth: number = 0) => {
    const result = results.get(item.id);
    const isSelected = selectedTests.has(item.id);

    const getIcon = () => {
      if (item.type === 'file') return 'ARQ';
      if (item.type === 'suite') return 'SUÍTE';
      if (!result) return '';
      if (result.state === 'passed') return 'OK';
      if (result.state === 'failed' || result.state === 'errored') return 'ERRO';
      if (result.state === 'skipped') return 'IGN';
      return '';
    };

    const shouldShow = () => {
      if (filter === 'all') return true;
      if (!result) return false;
      return result.state === filter;
    };

    if (!shouldShow()) return null;

    return (
      <div key={item.id} style={{ marginLeft: `${depth * 20}px` }}>
        <div className="flex items-center gap-2 p-2 hover:bg-slate-700 rounded cursor-pointer">
          {item.type === 'test' && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleTestSelection(item.id)}
              className="w-4 h-4"
            />
          )}
          <span className="text-xl">{getIcon()}</span>
          <span className="flex-1 text-slate-300">{item.label}</span>
          {result && result.duration && (
            <span className="text-xs text-slate-500">{result.duration}ms</span>
          )}
          {item.type === 'test' && (
            <button
              onClick={() => debugTest(item.id)}
              className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded"
            >
              Depurar
            </button>
          )}
        </div>
        {result && result.message && (
          <div className="ml-12 p-2 bg-slate-900 rounded text-sm text-red-400 mb-2">
            {result.message}
            {result.stack && (
              <pre className="mt-2 text-xs overflow-x-auto">{result.stack}</pre>
            )}
          </div>
        )}
        {item.children && item.children.map(child => renderTestItem(child, depth + 1))}
      </div>
    );
  };

  const stats = getTestStats();
  const coverageStats = getCoverageStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Explorador de testes</h1>
          <p className="text-slate-300">Descubra, execute e depure seus testes</p>
        </div>

        {/* Controls */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 mb-6">
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={discoverTests}
              disabled={isDiscovering}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <span className="text-xs font-semibold">BUSCAR</span>
              <span>{isDiscovering ? 'Buscando...' : 'Buscar testes'}</span>
            </button>
            <button
              onClick={() => runTests()}
              disabled={isRunning}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <span className="text-xs font-semibold">EXEC</span>
              <span>{isRunning ? 'Executando...' : 'Executar tudo'}</span>
            </button>
            <button
              onClick={() => runTests(Array.from(selectedTests))}
              disabled={isRunning || selectedTests.size === 0}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <span className="text-xs font-semibold">EXEC</span>
              <span>Executar selecionados ({selectedTests.size})</span>
            </button>
            <button
              onClick={selectAll}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Selecionar tudo
            </button>
            <button
              onClick={deselectAll}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Desmarcar tudo
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            {(['all', 'passed', 'failed', 'skipped'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === f
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {f === 'all'
                  ? 'Todos'
                  : f === 'passed'
                  ? 'Aprovados'
                  : f === 'failed'
                  ? 'Falharam'
                  : 'Ignorados'}
              </button>
            ))}
            <label className="flex items-center gap-2 px-4 py-2 bg-slate-700 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={showCoverage}
                onChange={(e) => setShowCoverage(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-slate-300">Mostrar cobertura</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Test Tree */}
          <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-sm rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Testes</h3>
            <div className="max-h-[600px] overflow-y-auto">
              {tests.length === 0 ? (
                <p className="text-slate-400 text-center py-8">
                  {isDiscovering ? 'Buscando testes...' : 'Nenhum teste encontrado. Clique em "Buscar testes" para analisar seu workspace.'}
                </p>
              ) : (
                tests.map(test => renderTestItem(test))
              )}
            </div>
          </div>

          {/* Stats & Coverage */}
          <div className="space-y-6">
            {/* Test Stats */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Resultados dos testes</h3>
              {stats.total > 0 ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300">Total</span>
                    <span className="text-white font-semibold">{stats.total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-green-400">Aprovados</span>
                    <span className="text-white font-semibold">{stats.passed}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-red-400">Falharam</span>
                    <span className="text-white font-semibold">{stats.failed}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-yellow-400">Ignorados</span>
                    <span className="text-white font-semibold">{stats.skipped}</span>
                  </div>
                  <div className="pt-3 border-t border-slate-700">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300">Taxa de aprovação</span>
                      <span className="text-white font-semibold">
                        {((stats.passed / stats.total) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 text-sm">Sem resultados ainda</p>
              )}
            </div>

            {/* Coverage */}
            {showCoverage && (
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Cobertura</h3>
                {coverage.length > 0 ? (
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-slate-300">Linhas</span>
                        <span className="text-white font-semibold">{coverageStats.lines}%</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${coverageStats.lines}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-slate-300">Ramificações</span>
                        <span className="text-white font-semibold">{coverageStats.branches}%</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${coverageStats.branches}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-slate-300">Funções</span>
                        <span className="text-white font-semibold">{coverageStats.functions}%</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full"
                          style={{ width: `${coverageStats.functions}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">Sem dados de cobertura disponíveis</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
