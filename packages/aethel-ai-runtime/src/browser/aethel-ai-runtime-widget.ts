import { injectable, inject } from '@theia/core/shared/inversify';
import { BaseWidget } from '@theia/core/lib/browser/widgets/widget';
import * as React from '@theia/core/shared/react';
import { AethelAiRuntimeClient } from './aethel-ai-runtime-client';

@injectable()
export class AethelAiRuntimeWidget extends BaseWidget {

    static readonly ID = 'aethel-ai-runtime';
    static readonly LABEL = 'Aethel AI Runtime';

    @inject(AethelAiRuntimeClient)
    protected readonly client: AethelAiRuntimeClient;

    protected state = { output: '', loadedModel: '' };

    protected render(): React.ReactNode {
        return (
            <div className='aethel-ai-runtime-container'>
                <h3>Aethel AI Runtime</h3>
                <p>Run AI models internally with GPU support.</p>
                <div>
                    <input type="text" placeholder="Model Name (e.g., llama2)" ref={(el) => this.modelNameInput = el} />
                    <button onClick={this.loadModel}>Load Model</button>
                </div>
                <div>
                    <textarea placeholder="Prompt" ref={(el) => this.promptInput = el} rows={4} />
                    <button onClick={this.runInference} disabled={!this.state.loadedModel}>Run Inference</button>
                </div>
                <div><strong>Output:</strong> {this.state.output}</div>
                {this.state.loadedModel && <div>Loaded Model: {this.state.loadedModel}</div>}
            </div>
        );
    }

    private modelNameInput: HTMLInputElement | null = null;
    private promptInput: HTMLTextAreaElement | null = null;

    private loadModel = async () => {
        const modelName = this.modelNameInput?.value || '';
        if (!modelName) {
            this.setState({ output: 'Please enter a model name.' });
            return;
        }
        const result = await this.client.loadModel(modelName, '');
        this.setState({ output: result, loadedModel: result.includes('successfully') ? modelName : '' });
    };

    private runInference = async () => {
        const prompt = this.promptInput?.value || '';
        if (!this.state.loadedModel) {
            this.setState({ output: 'No model loaded.' });
            return;
        }
        const result = await this.client.runInference(this.state.loadedModel, prompt);
        this.setState({ output: result });
    };

    private setState = (newState: Partial<typeof this.state>) => {
        this.state = { ...this.state, ...newState };
        this.update();
    };
}
