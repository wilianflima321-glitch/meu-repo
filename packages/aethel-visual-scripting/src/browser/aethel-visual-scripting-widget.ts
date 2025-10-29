import { injectable, inject } from \'@theia/core/shared/inversify\';
import { BaseWidget } from \'@theia/core/lib/browser/widgets/widget\';
import * as React from \'@theia/core/shared/react\';
import { AethelVisualScriptingClient } from \'./aethel-visual-scripting-client\';
import { Node, Edge, Graph } from \'../common/aethel-visual-scripting-service\';
import * as LiteGraph from \'litegraph.js\';

@injectable()
export class AethelVisualScriptingWidget extends BaseWidget {

    static readonly ID = \'aethel-visual-scripting\';
    static readonly LABEL = \'Visual Scripting\';

    @inject(AethelVisualScriptingClient)
    protected readonly client: AethelVisualScriptingClient;

    protected graph: LiteGraph.LGraph | null = null;
    protected canvas: LiteGraph.LGraphCanvas | null = null;

    protected render(): React.ReactNode {
        return (
            <div className=\'aethel-visual-scripting-container\'>
                <h3>Visual Scripting Editor</h3>
                <div className=\'toolbar\'>
                    <button onClick={this.addNode}>Add Node</button>
                    <button onClick={this.executeGraph}>Execute Graph</button>
                    <button onClick={this.saveGraph}>Save Graph</button>
                    <button onClick={this.loadGraph}>Load Graph</button>
                </div>
                <div ref={(el) => this.canvasRef = el} style={{ width: \'100%\', height: \'600px\', border: \'1px solid #ccc\' }}></div>
            </div>
        );
    }

    private canvasRef: HTMLDivElement | null = null;

    protected onAfterAttach(msg: any): void {
        super.onAfterAttach(msg);
        if (this.canvasRef) {
            this.initializeLiteGraph();
        }
    }

    private initializeLiteGraph() {
        this.graph = new LiteGraph.LGraph();
        this.canvas = new LiteGraph.LGraphCanvas(this.canvasRef!, this.graph);

        // Register custom nodes
        this.registerCustomNodes();

        // Load graph if exists
        this.loadGraphFromStorage();

        // Start rendering
        this.graph.start();
    }

    private registerCustomNodes() {
        // Example custom node for AGI logic
        class LogicNode extends LiteGraph.LGraphNode {
            constructor() {
                super();
                this.title = "Logic Gate";
                this.addInput("A", "boolean");
                this.addInput("B", "boolean");
                this.addOutput("Out", "boolean");
                this.addProperty("operation", "AND");
            }
            onExecute() {
                const a = this.getInputData(0);
                const b = this.getInputData(1);
                let result = false;
                if (this.properties.operation === "AND") result = a && b;
                else if (this.properties.operation === "OR") result = a || b;
                this.setOutputData(0, result);
            }
        }
        LiteGraph.LGraph.registerNodeType("aethel/logic", LogicNode);

        // Add more custom nodes as needed
    }

    private addNode = () => {
        if (!this.graph) return;
        const node = LiteGraph.LGraph.createNode("aethel/logic");
        node.pos = [Math.random() * 300, Math.random() * 300];
        this.graph.add(node);
    };

    private executeGraph = async () => {
        if (!this.graph) return;
        // Convert LiteGraph to our format
        const nodes: Node[] = [];
        const edges: Edge[] = [];

        this.graph._nodes.forEach((lgNode, index) => {
            nodes.push({
                id: lgNode.id.toString(),
                type: lgNode.type,
                position: { x: lgNode.pos[0], y: lgNode.pos[1] },
                data: lgNode.properties
            });
        });

        // Add edge logic based on connections
        // Simplified: assume sequential

        const graph: Graph = { nodes, edges };
        const result = await this.client.executeGraph(graph);
        console.log(\'Execution result:\', result);
    };

    private saveGraph = () => {
        if (!this.graph) return;
        const data = this.graph.serialize();
        localStorage.setItem(\'aethel-visual-scripting-graph\', JSON.stringify(data));
        console.log(\'Graph saved\');
    };

    private loadGraph = () => {
        const data = localStorage.getItem(\'aethel-visual-scripting-graph\');
        if (data && this.graph) {
            this.graph.configure(JSON.parse(data));
            console.log(\'Graph loaded\');
        }
    };

    private loadGraphFromStorage() {
        this.loadGraph();
    }

    protected onBeforeDetach(msg: any): void {
        if (this.graph) {
            this.graph.stop();
        }
        super.onBeforeDetach(msg);
    }
}


