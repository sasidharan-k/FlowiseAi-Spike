import { RunCollectorCallbackHandler } from '@langchain/core/tracers/run_collector'
import { Run } from '@langchain/core/tracers/base'
import { EvaluationRunner } from './EvaluationRunner'
import { encoding_for_model } from '@dqbd/tiktoken'

export class EvaluationRunTracer extends RunCollectorCallbackHandler {
    evaluationRunId: string
    model: string
    streaming: boolean
    streamingTokens: string = ''
    promptTokenCount = 0
    completionTokenCount = 0

    constructor(id: string) {
        super()
        this.evaluationRunId = id
    }

    async persistRun(run: Run): Promise<void> {
        return super.persistRun(run)
    }

    onLLMNewToken?(run: Run, token: string): void | Promise<void> {
        if (this.model) {
            this.streamingTokens += token
        }
    }

    onLLMStart?(run: Run): void | Promise<void> {
        if ((run?.serialized as any)?.kwargs?.streaming) {
            this.model = (run?.serialized as any)?.kwargs?.model || (run?.serialized as any)?.kwargs?.model_name
            if (this.model) {
                let encoding: any = undefined
                try {
                    encoding = encoding_for_model(this.model as any)
                    if (encoding) {
                        this.promptTokenCount = 0
                        if (run.inputs?.messages?.length > 0 && run.inputs?.messages[0]?.length > 0) {
                            run.inputs.messages[0].map((message: any) => {
                                const content = message.content as any
                                this.promptTokenCount += content ? encoding.encode(content).length : 0
                            })
                        }
                        if (run.inputs?.prompts?.length > 0) {
                            const content = run.inputs.prompts[0]
                            this.promptTokenCount += content ? encoding.encode(content).length : 0
                        }
                    }
                } catch (e) {
                    // this will fail for non openAI models, ignore the error as we check for encoding later
                    encoding = undefined
                }
            }
        }
    }

    onLLMEnd?(run: Run): void | Promise<void> {
        if (this.model && (run?.serialized as any)?.kwargs?.streaming) {
            this.completionTokenCount = 0
            let encoding: any = undefined

            try {
                encoding = encoding_for_model(this.model as any)
                if (encoding) {
                    this.completionTokenCount = encoding.encode(this.streamingTokens).length
                    this.streamingTokens = ''
                }
            } catch (e) {
                // this will fail for non openAI models, ignore the error as we check for encoding later
                encoding = undefined
            }
            const metric = {
                completionTokens: this.completionTokenCount,
                promptTokens: this.promptTokenCount,
                model: this.model,
                totalTokens: this.promptTokenCount + this.completionTokenCount
            }
            EvaluationRunner.addMetrics(this.evaluationRunId, JSON.stringify(metric))
            //cleanup
            this.promptTokenCount = 0
            this.completionTokenCount = 0
            this.streamingTokens = ''
            this.model = ''
        }
    }

    async onRunUpdate(run: Run): Promise<void> {
        const json = {
            [run.run_type]: elapsed(run)
        }
        let metric = JSON.stringify(json)
        if (metric) {
            EvaluationRunner.addMetrics(this.evaluationRunId, metric)
        }

        if (run.run_type === 'llm') {
            let model = (run?.serialized as any)?.kwargs?.model || (run?.serialized as any)?.kwargs?.model_name
            if (model) {
                EvaluationRunner.addMetrics(this.evaluationRunId, JSON.stringify({ model: model }))
            }
            // Antrophic Models will have the usage at the following path
            // run.outputs.generations[0][0].message.additional_kwargs.usage
            if (
                run.outputs?.generations?.length > 0 &&
                run.outputs?.generations[0].length > 0 &&
                run.outputs?.generations[0][0]?.message?.additional_kwargs?.usage
            ) {
                const usage = run.outputs?.generations[0][0]?.message?.additional_kwargs?.usage
                if (usage.output_tokens) {
                    const metric = {
                        completionTokens: usage.output_tokens,
                        promptTokens: usage.input_tokens,
                        model: model || (event as any).reason?.caller?.llm?.model,
                        totalTokens: usage.input_tokens + usage.output_tokens
                    }
                    EvaluationRunner.addMetrics(this.evaluationRunId, JSON.stringify(metric))
                } else if (usage.completion_tokens) {
                    const metric = {
                        completionTokens: usage.completion_tokens,
                        promptTokens: usage.prompt_tokens,
                        model: model || (event as any).reason?.caller?.llm?.model,
                        totalTokens: usage.total_tokens
                    }
                    EvaluationRunner.addMetrics(this.evaluationRunId, JSON.stringify(metric))
                }
            }

            // OpenAI non streaming models
            if (run.outputs?.llmOutput?.estimatedTokenUsage) {
                EvaluationRunner.addMetrics(this.evaluationRunId, run.outputs?.llmOutput?.estimatedTokenUsage)
            }
            // Amazon Bedrock
            if (run.outputs && run.outputs.llmOutput && run.outputs.llmOutput['amazon-bedrock-invocationMetrics']) {
                const usage = run.outputs?.llmOutput['amazon-bedrock-invocationMetrics']
                const metric = {
                    completionTokens: usage.outputTokenCount,
                    promptTokens: usage.inputTokenCount,
                    model: run.outputs?.llmOutput.model,
                    totalTokens: usage.inputTokenCount + usage.outputTokenCount
                }
                EvaluationRunner.addMetrics(this.evaluationRunId, JSON.stringify(metric))
            }
        }
    }
}

function elapsed(run: Run) {
    if (!run.end_time) return ''
    const elapsed = run.end_time - run.start_time
    return `${elapsed.toFixed(2)}`
}
