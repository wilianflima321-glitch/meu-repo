# AI IDE (package: @theia/ai-ide) - Quickstart

Passos rápidos para desenvolvedores no Windows (resumido):

1) Verifique pré-requisitos

 - Node 18+ e npm
 - (Opcional para builds nativos) Visual Studio Build Tools (cl.exe)

2) Bootstrap (instale dependências do mock e Playwright browsers se for usar E2E)

```powershell
# do repositório root
Set-Location G:\repo
./tools/scripts/bootstrap-dev.ps1 -InstallDeps -InstallPlaywrightBrowsers
```

3) Rodar checagem de TypeScript e testes unitários (pacote `ai-ide`)

```powershell
# do repositório root
npm run check:ai-ide-ts
npm run test:ai-ide
```

Os testes Mocha compilados moram em `lib/`. Por padrão o runner executa apenas `package.spec.js`, que é um smoke test leve. Para rodar todo o conjunto (35 testes), defina `FULL_TESTS=1`:

```powershell
$env:FULL_TESTS='1'
npm run test:ai-ide
Remove-Item Env:FULL_TESTS
```

O runner habilita shims para resolver imports do Theia em Node (resolver customizado, jsdom, patch de inversify). Para validar em um ambiente `require` puro, desabilite-os:

```powershell
$env:THEIA_TEST_SHIMS='0'
npm run test:ai-ide
Remove-Item Env:THEIA_TEST_SHIMS
```

4) Rodar mock backend (developer mock)

```powershell
Set-Location tools/llm-mock
npm start
# ou em background
npm run start:background
```

5) Rodar Playwright E2E (opcional)

```powershell
Set-Location tools/llm-mock
# Prefer running via um Playwright config quando disponível para selecionar projetos:
npx playwright test --config=playwright.config.ts
# Ou rodar um teste específico diretamente:
npx playwright test playwright/test.spec.ts
```

Notas
- Os testes unitários usam shims opcionais em `packages/ai-ide/test`. Se precisar depurar resolução Theia, use `DEBUG_THEIA_RESOLVER=1` antes de rodar `npm run test:ai-ide`.
- Se você preferir um ambiente "real", instale as dependências Theia dev-packages conforme instruções do projeto e execute `theiaext build`.
- Para compilar sem executar testes, use `npm run build:ai-ide`.
<div align='center'>

<br />

<img src='https://raw.githubusercontent.com/eclipse-theia/theia/master/logo/theia.svg?sanitize=true' alt='theia-ext-logo' width='100px' />

<h2>ECLIPSE THEIA - AI IDE Agents EXTENSION</h2>

<hr />

</div>

## Description

The `@theia/ai-ide` package consolidates various AI agents for use within IDEs like the Theia IDE.

## Agents

The package includes the following agents:

- **Orchestrator Chat Agent**: Analyzes user requests and determines which specific chat agent is best suited to handle each request. It seamlessly delegates tasks to the appropriate agent, ensuring users receive the most relevant assistance. It used as the default agent if no other agent is specified.

- **Universal Chat Agent**: Provides general programming support. It answers broad programming-related questions and serves as a fallback for generic inquiries, without specific access to the user context or workspace. This agent is used as the preferred fallback in case the default agent is not available.

- **Coder Agent**: Assists software developers with code-related tasks in the Theia IDE. It utilizes AI to provide recommendations and improvements, leveraging a suite of functions to interact with the workspace.

- **Command Chat Agent**: This agent helps users execute commands within the Theia IDE based on user requests. It identifies the correct command from Theia's command registry and facilitates its execution, providing users with a seamless command interaction experience.

- **Architect Agent**: The agent is able to inspect the current files of the workspace, including their content, to answer questions.

## Configuration View

The package provides a configuration view that enables you to adjust settings related to the behavior of AI agents. This view is implemented in the files located at packages/ai-ide/src/browser/ai-configuration and offers customization of default parameters, feature toggles, and additional preferences for the AI IDE.

## Additional Information

- [Theia - GitHub](https://github.com/eclipse-theia/theia)
- [Theia - Website](https://theia-ide.org/)

## License

- [Eclipse Public License 2.0](http://www.eclipse.org/legal/epl-2.0/)
- [GNU General Public License, version 2 with the GNU Classpath Exception](https://projects.eclipse.org/license/secondary-gpl-2.0-cp)

## Trademark

"Theia" is a trademark of the Eclipse Foundation
<https://www.eclipse.org/theia>
