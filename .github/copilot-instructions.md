# Copilot Instructions for AI Coding Agents

## Visão Geral da Arquitetura
- O projeto é um framework extensível para IDEs Cloud & Desktop, baseado em web, com suporte a múltiplos idiomas e extensões.
- Estrutura modular: cada funcionalidade principal está em `packages/` (ex: `ai-core`, `workspace`, `terminal`, `toolbar`, etc.).
- Extensões VS Code são suportadas via protocolo, veja `packages/ai-ide` e `packages/vsx-registry` para integração.
- Fluxo de dados e serviços: comunicação entre pacotes via APIs internas, eventos e serviços registrados.
- Documentação detalhada em `doc/` e links no README para guias de desenvolvimento, testes e integração.

## Fluxos de Desenvolvimento
- **Build:** Use comandos npm/yarn nos diretórios de pacotes ou na raiz. Exemplo: `yarn install && yarn build`.
- **Testes:** Testes unitários e de integração em cada pacote, execute com `yarn test` ou scripts específicos em `doc/Testing.md`.
- **Debug:** Debug via VS Code ou navegadores, com suporte a breakpoints em TypeScript. Veja `doc/Developing.md` para instruções.
- **SBOM:** Releases geram SBOM para segurança da cadeia de suprimentos, consulte documentação de SBOM.

## Convenções Específicas
- Siga as [Coding Guidelines](doc/coding-guidelines.md) e [Code Organization](doc/code-organization.md).
- Novos recursos devem ser implementados como pacotes em `packages/` e registrados no manifesto.
- Integrações com VS Code: utilize APIs compatíveis e consulte `doc/Plugin-API.md`.
- Testes de API e integração: exemplos em `doc/api-testing.md`.
- Licenças: EPL 2.0 e GPLv2+Classpath Exception, arquivos em raiz.

## Integrações e Dependências
- Integração com extensões VS Code via `packages/vsx-registry`.
- Dependências externas gerenciadas por `package.json` em cada pacote.
- Scripts de automação e deploy em `deployment/` e `scripts/`.

## Exemplos de Padrões
- Novo pacote: crie em `packages/novo-pacote`, registre no manifesto e siga padrões de exportação/importação.
- Comunicação entre pacotes: use serviços e eventos, evite dependências diretas entre pacotes.
- Testes: coloque testes em subpastas `__tests__` ou `tests/` dentro do pacote.

## Arquivos e Diretórios-Chave
- `packages/`: principais funcionalidades e extensões
- `doc/`: documentação de desenvolvimento, testes, migração
- `deployment/`: scripts de deploy para AWS, Azure, GCP
- `scripts/`: utilitários e automações
- `README.md`: visão geral, links úteis e instruções rápidas

## Referências
- [Documentação oficial](https://theia-ide.org/docs/)
- [Guia de desenvolvimento](doc/Developing.md)
- [Guia de testes](doc/Testing.md)
- [Roadmap](https://github.com/eclipse-theia/theia/wiki/Eclipse-Theia-Roadmap)

---

> Atualize este arquivo conforme novas convenções ou fluxos surgirem. Dê feedback se algum ponto estiver incompleto ou pouco claro.
