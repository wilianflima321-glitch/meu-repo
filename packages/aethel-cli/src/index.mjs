#!/usr/bin/env node

const COMMANDS = [
  ['init <name>', 'Scaffold a governed Aethel project from a template.'],
  ['deploy', 'Create a deployment request with evidence and rollback metadata.'],
  ['agent run <prompt>', 'Start a scoped agent mission through the Aethel Tool Bus.'],
  ['viewport export <asset>', 'Package viewport assets with render evidence.'],
];

function printHelp() {
  console.log('Aethel CLI skeleton');
  console.log('');
  console.log('Usage: aethel <command>');
  console.log('');
  console.log('Commands:');
  for (const [command, description] of COMMANDS) {
    console.log(`  ${command.padEnd(24)} ${description}`);
  }
  console.log('');
  console.log('This private skeleton is intentionally non-mutating until the public CLI contract is finalized.');
}

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  printHelp();
  process.exit(0);
}

console.error(`aethel: command "${args.join(' ')}" is not enabled in the private skeleton yet.`);
console.error('Run "aethel --help" to see the planned command surface.');
process.exit(2);
