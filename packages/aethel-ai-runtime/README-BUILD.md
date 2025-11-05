Bootstrap & build helper for @aethel/aethel-ai-runtime

Usage (PowerShell):

  cd cloud-ide-desktop\aethel_theia_fork\packages\aethel-ai-runtime
  .\scripts\bootstrap_and_build.ps1

What it does:
- Installs dependencies (yarn preferred, falls back to npm)
- Runs `tsc --noEmit` to check types
- Attempts to auto-install `@types/*` for simple missing-module diagnostics
- Re-runs typecheck and then `yarn run build` / `npm run build`

Notes:
- This script is for developer convenience. It performs network installs.
- If `tsc` still reports errors after the attempts, inspect `stdout.txt` and `stderr.txt` generated in the package folder for details and open an issue or paste the output for help.
