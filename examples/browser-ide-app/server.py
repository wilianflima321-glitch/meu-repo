#!/usr/bin/env python3
"""Legacy entrypoint.

Este arquivo existia como um servidor *mock* para endpoints de IA.

Padrão do repositório: **real-or-fail**.
Logo, este script NÃO deve expor respostas simuladas.

Use o backend real em Node/TypeScript (Express + WebSocket):

  cd examples/browser-ide-app
  npm install
  npm start
"""

import sys


def main() -> int:
    sys.stderr.write(
        "[real-or-fail] examples/browser-ide-app/server.py foi desativado (era mock).\n"
        "Use o backend real: `npm start` (server.js/server.ts).\n"
    )
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
