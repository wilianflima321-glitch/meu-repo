import { injectable, inject } from 'inversify';
import { RpcProxy, RpcProxyFactory } from '@theia/core/lib/common';
import { AethelVisualScriptingService, Node, Edge, Graph } from '../common/aethel-visual-scripting-service';

@injectable()
export class AethelVisualScriptingClient implements AethelVisualScriptingService {

    @inject(RpcProxyFactory)
    protected readonly rpcProxyFactory: RpcProxyFactory<AethelVisualScriptingService>;

    protected readonly proxy: RpcProxy<AethelVisualScriptingService>;

    constructor() {
        this.proxy = this.rpcProxyFactory.createProxy();
    }

    createNode(type: string, position: { x: number; y: number }): Promise<Node> {
        return this.proxy.createNode(type, position);
    }

    connectNodes(source: string, target: string): Promise<Edge> {
        return this.proxy.connectNodes(source, target);
    }

    executeGraph(graph: Graph): Promise<any> {
        return this.proxy.executeGraph(graph);
    }
}