import { injectable } from \'@theia/core/shared/inversify\';
import { BackendApplicationContribution } from \'@theia/core/lib/node/backend-application\';
import { AethelVisualScriptingService, Node, Edge, Graph } from \'../common/aethel-visual-scripting-service\';
import { RpcConnectionHandler } from \'@theia/core/lib/common/messaging/proxy-factory\';
import { spawn } from \'child_process\';
import * as path from \'path\';

@injectable()
export class AethelVisualScriptingBackendService implements AethelVisualScriptingService, BackendApplicationContribution {

    private nodes: Node[] = [];
    private edges: Edge[] = [];

    onStart(): void {
        console.log(\'Aethel Visual Scripting Backend started\');
    }

    async createNode(type: string, position: { x: number; y: number }): Promise<Node> {
        const node: Node = {
            id: `node-${Date.now()}`,
            type,
            position,
            data: {}
        };
        this.nodes.push(node);
        return node;
    }

    async connectNodes(source: string, target: string): Promise<Edge> {
        const edge: Edge = {
            id: `edge-${Date.now()}`,
            source,
            target
        };
        this.edges.push(edge);
        return edge;
    }

    async executeGraph(graph: Graph): Promise<any> {
        // Use NetworkX via Python script
        return new Promise((resolve, reject) => {
            const pythonScript = path.join(__dirname, \'../../../backend/app/routers/execute_graph.py\'); // Assume a script exists
            const pythonProcess = spawn(\'python\', [pythonScript, JSON.stringify(graph)]);

            let output = \'\';
            let error = \'\';

            pythonProcess.stdout.on(\'data\', (data) => {
                output += data.toString();
            });

            pythonProcess.stderr.on(\'data\', (data) => {
                error += data.toString();
            });

            pythonProcess.on(\'close\', (code) => {
                if (code === 0) {
                    try {
                        const result = JSON.parse(output);
                        resolve(result);
                    } catch (e) {
                        resolve({ result: output });
                    }
                } else {
                    reject(new Error(`Python script error: ${error}`));
                }
            });
        });
    }
}

export const AethelVisualScriptingServiceHandler: RpcConnectionHandler<AethelVisualScriptingService> = {
    path: \'/services/aethel-visual-scripting\',
    handler: AethelVisualScriptingBackendService
};
