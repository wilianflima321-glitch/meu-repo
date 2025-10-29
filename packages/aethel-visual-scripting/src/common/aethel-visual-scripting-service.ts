export const AethelVisualScriptingService = Symbol('AethelVisualScriptingService');
export const AethelVisualScriptingServicePath = '/services/aethel-visual-scripting';

export interface Node {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: any;
}

export interface Edge {
    id: string;
    source: string;
    target: string;
}

export interface Graph {
    nodes: Node[];
    edges: Edge[];
}

export interface AethelVisualScriptingService {
    createNode(type: string, position: { x: number; y: number }): Promise<Node>;
    connectNodes(source: string, target: string): Promise<Edge>;
    executeGraph(graph: Graph): Promise<any>;
}