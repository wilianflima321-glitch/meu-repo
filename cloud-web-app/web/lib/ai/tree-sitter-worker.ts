import Parser from 'web-tree-sitter';

let parser: any = null;
let isInitialized = false;

self.onmessage = async (e: MessageEvent) => {
  const { type, payload, id } = e.data;

  if (type === 'INIT') {
    try {
      const ParserAny = Parser as any;
      await ParserAny.init();
      parser = new ParserAny();
      // Em produção, isso viria da pasta public do Next.js
      const Lang = await ParserAny.Language.load('/tree-sitter-tsx.wasm');
      parser.setLanguage(Lang);
      isInitialized = true;
      self.postMessage({ type: 'INIT_SUCCESS', id });
    } catch (err: any) {
      self.postMessage({ type: 'INIT_ERROR', error: err.message, id });
    }
  }

  if (type === 'PARSE') {
    if (!isInitialized || !parser) {
      self.postMessage({ type: 'PARSE_ERROR', error: 'Parser not initialized', id });
      return;
    }
    try {
      const tree = parser.parse(payload.code);
      
      // Coletamos a estrutura em um objeto plano e seguro para transferir via postMessage
      const declarations: any[] = [];
      
      // Busca simplificada por classes e funções para o Deep Context
      const walk = (node: any) => {
        if (node.type === 'class_declaration' || node.type === 'function_declaration' || node.type === 'interface_declaration') {
          const nameNode = node.childForFieldName('name');
          if (nameNode) {
            declarations.push({
              type: node.type,
              name: nameNode.text,
              startIndex: node.startIndex,
              endIndex: node.endIndex,
              startPosition: node.startPosition,
              endPosition: node.endPosition,
            });
          }
        }
        for (let i = 0; i < node.childCount; i++) {
          walk(node.child(i)!);
        }
      };
      
      walk(tree.rootNode);
      tree.delete(); // Free memory

      self.postMessage({ type: 'PARSE_SUCCESS', result: declarations, id });
    } catch (err: any) {
      self.postMessage({ type: 'PARSE_ERROR', error: err.message, id });
    }
  }
};
