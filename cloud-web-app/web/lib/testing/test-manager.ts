/**
 * Compat layer: ide-integration.ts referencia "../testing/test-manager".
 * A implementação real vive em lib/test/test-manager.ts.
 */

export {
	TestManager,
	JestAdapter,
	PytestAdapter,
	GoTestAdapter,
	getTestManager,
	resetTestManager,
} from '../test/test-manager';

export type {
	TestItem,
	TestRun,
	TestResult,
	TestCoverage,
	TestAdapter,
} from '../test/test-manager';
