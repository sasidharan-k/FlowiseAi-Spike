import { ICommonObject } from 'flowise-components'

const CostModels: any[] = [
    {
        modelName: 'gpt-4-turbo',
        inputPrice: 0.00001,
        outputPrice: 0.00003,
        totalPrice: 0
    },
    {
        modelName: 'gpt-4-turbo-2024-04-09',
        inputPrice: 0.00001,
        outputPrice: 0.00003,
        totalPrice: 0
    },
    {
        modelName: 'gpt-4-turbo-preview',
        inputPrice: 0.00001,
        outputPrice: 0.00003,
        totalPrice: 0
    },
    {
        modelName: 'gpt-4-turbo-vision',
        inputPrice: 0.00001,
        outputPrice: 0.00003,
        totalPrice: 0
    },
    {
        modelName: 'gpt-4o',
        inputPrice: 0.000005,
        outputPrice: 0.000015,
        totalPrice: 0
    },
    {
        modelName: 'gpt-4o-2024-05-13',
        inputPrice: 0.000005,
        outputPrice: 0.000015,
        totalPrice: 0
    },
    {
        modelName: 'text-ada-001',
        inputPrice: 0,
        outputPrice: 0,
        totalPrice: 0.000004
    },
    {
        modelName: 'text-babbage-001',
        inputPrice: 0,
        outputPrice: 0,
        totalPrice: 5e-7
    },
    {
        modelName: 'text-bison',
        inputPrice: 2.5e-7,
        outputPrice: 5e-7,
        totalPrice: 0
    },
    {
        modelName: 'text-bison-32k',
        inputPrice: 2.5e-7,
        outputPrice: 5e-7,
        totalPrice: 0
    },
    {
        modelName: 'text-curie-001',
        inputPrice: 0,
        outputPrice: 0,
        totalPrice: 0.00002
    },
    {
        modelName: 'text-davinci-001',
        inputPrice: 0,
        outputPrice: 0,
        totalPrice: 0.00002
    },
    {
        modelName: 'text-davinci-002',
        inputPrice: 0,
        outputPrice: 0,
        totalPrice: 0.00002
    },
    {
        modelName: 'text-davinci-003',
        inputPrice: 0,
        outputPrice: 0,
        totalPrice: 0.00002
    },
    {
        modelName: 'text-embedding-3-small',
        inputPrice: 0,
        outputPrice: 0,
        totalPrice: 2e-8
    },
    {
        modelName: 'text-embedding-ada-002',
        inputPrice: 0,
        outputPrice: 0,
        totalPrice: 1e-7
    },
    {
        modelName: 'text-embedding-ada-002-v2',
        inputPrice: 0,
        outputPrice: 0,
        totalPrice: 1e-7
    },
    {
        modelName: 'text-unicorn',
        inputPrice: 0.0000025,
        outputPrice: 0.0000075,
        totalPrice: 0
    },
    {
        modelName: 'textembedding-gecko',
        inputPrice: 0,
        outputPrice: 0,
        totalPrice: 1e-7
    },
    {
        modelName: 'textembedding-gecko-multilingual',
        inputPrice: 0,
        outputPrice: 0,
        totalPrice: 1e-7
    },
    {
        modelName: ' gpt-4-preview',
        inputPrice: 0.00001,
        outputPrice: 0.00003,
        totalPrice: 0
    },
    {
        modelName: 'babbage-002',
        inputPrice: 4e-7,
        outputPrice: 0.0000016,
        totalPrice: 0
    },
    {
        modelName: 'chat-bison',
        inputPrice: 2.5e-7,
        outputPrice: 5e-7,
        totalPrice: 0
    },
    {
        modelName: 'chat-bison-32k',
        inputPrice: 2.5e-7,
        outputPrice: 5e-7,
        totalPrice: 0
    },
    {
        modelName: 'claude-1.1',
        inputPrice: 0.000008,
        outputPrice: 0.000024,
        totalPrice: 0
    },
    {
        modelName: 'claude-1.2',
        inputPrice: 0.000008,
        outputPrice: 0.000024,
        totalPrice: 0
    },
    {
        modelName: 'claude-1.3',
        inputPrice: 0.000008,
        outputPrice: 0.000024,
        totalPrice: 0
    },
    {
        modelName: 'claude-2.0',
        inputPrice: 0.000008,
        outputPrice: 0.000024,
        totalPrice: 0
    },
    {
        modelName: 'claude-2.1',
        inputPrice: 0.000008,
        outputPrice: 0.000024,
        totalPrice: 0
    },
    {
        modelName: 'claude-3-haiku-20240307',
        inputPrice: 0.00000025,
        outputPrice: 0.00000125,
        totalPrice: 0
    },
    {
        modelName: 'claude-3-opus-20240229',
        inputPrice: 0.000015,
        outputPrice: 0.000075,
        totalPrice: 0
    },
    {
        modelName: 'claude-3-sonnet-20240229',
        inputPrice: 0.000003,
        outputPrice: 0.000015,
        totalPrice: 0
    },
    {
        modelName: 'claude-3-haiku',
        inputPrice: 2.5e-7,
        outputPrice: 0.00000125,
        totalPrice: 0
    },
    {
        modelName: 'claude-3-opus',
        inputPrice: 0.000015,
        outputPrice: 0.000075,
        totalPrice: 0
    },
    {
        modelName: 'claude-3-sonnet',
        inputPrice: 0.000003,
        outputPrice: 0.000015,
        totalPrice: 0
    },
    {
        modelName: 'claude-instant-1',
        inputPrice: 0.00000163,
        outputPrice: 0.00000551,
        totalPrice: 0
    },
    {
        modelName: 'claude-instant-1.2',
        inputPrice: 0.00000163,
        outputPrice: 0.00000551,
        totalPrice: 0
    },
    {
        modelName: 'code-bison',
        inputPrice: 2.5e-7,
        outputPrice: 5e-7,
        totalPrice: 0
    },
    {
        modelName: 'code-bison-32k',
        inputPrice: 2.5e-7,
        outputPrice: 5e-7,
        totalPrice: 0
    },
    {
        modelName: 'code-gecko',
        inputPrice: 2.5e-7,
        outputPrice: 5e-7,
        totalPrice: 0
    },
    {
        modelName: 'codechat-bison',
        inputPrice: 2.5e-7,
        outputPrice: 5e-7,
        totalPrice: 0
    },
    {
        modelName: 'codechat-bison-32k',
        inputPrice: 2.5e-7,
        outputPrice: 5e-7,
        totalPrice: 0
    },
    {
        modelName: 'davinci-002',
        inputPrice: 0.000006,
        outputPrice: 0.000012,
        totalPrice: 0
    },
    {
        modelName: 'ft:babbage-002',
        inputPrice: 0.0000016,
        outputPrice: 0.0000016,
        totalPrice: 0
    },
    {
        modelName: 'ft:davinci-002',
        inputPrice: 0.000012,
        outputPrice: 0.000012,
        totalPrice: 0
    },
    {
        modelName: 'ft:gpt-3.5-turbo-0613',
        inputPrice: 0.000012,
        outputPrice: 0.000016,
        totalPrice: 0
    },
    {
        modelName: 'ft:gpt-3.5-turbo-1106',
        inputPrice: 0.000003,
        outputPrice: 0.000006,
        totalPrice: 0
    },
    {
        modelName: 'gemini-1.0-pro',
        inputPrice: 1.25e-7,
        outputPrice: 3.75e-7,
        totalPrice: 0
    },
    {
        modelName: 'gemini-1.0-pro-001',
        inputPrice: 1.25e-7,
        outputPrice: 3.75e-7,
        totalPrice: 0
    },
    {
        modelName: 'gemini-1.0-pro-latest',
        inputPrice: 2.5e-7,
        outputPrice: 5e-7,
        totalPrice: 0
    },
    {
        modelName: 'gemini-pro',
        inputPrice: 1.25e-7,
        outputPrice: 3.75e-7,
        totalPrice: 0
    },
    {
        modelName: 'gpt-3.5-turbo',
        inputPrice: 5e-7,
        outputPrice: 0.0000015,
        totalPrice: 0
    },
    {
        modelName: 'gpt-3.5-turbo-0125',
        inputPrice: 5e-7,
        outputPrice: 0.0000015,
        totalPrice: 0
    },
    {
        modelName: 'gpt-3.5-turbo-0301',
        inputPrice: 0.000002,
        outputPrice: 0.000002,
        totalPrice: 0
    },
    {
        modelName: 'gpt-3.5-turbo-0613',
        inputPrice: 0.0000015,
        outputPrice: 0.000002,
        totalPrice: 0
    },
    {
        modelName: 'gpt-3.5-turbo-1106',
        inputPrice: 0.000001,
        outputPrice: 0.000002,
        totalPrice: 0
    },
    {
        modelName: 'gpt-3.5-turbo-16k',
        inputPrice: 5e-7,
        outputPrice: 0.0000015,
        totalPrice: 0
    },
    {
        modelName: 'gpt-3.5-turbo-16k-0613',
        inputPrice: 0.000003,
        outputPrice: 0.000004,
        totalPrice: 0
    },
    {
        modelName: 'gpt-3.5-turbo-instruct',
        inputPrice: 0.0000015,
        outputPrice: 0.000002,
        totalPrice: 0
    },
    {
        modelName: 'gpt-4',
        inputPrice: 0.00003,
        outputPrice: 0.00006,
        totalPrice: 0
    },
    {
        modelName: 'gpt-4-0125-preview',
        inputPrice: 0.00001,
        outputPrice: 0.00003,
        totalPrice: 0
    },
    {
        modelName: 'gpt-4-0314',
        inputPrice: 0.00003,
        outputPrice: 0.00006,
        totalPrice: 0
    },
    {
        modelName: 'gpt-4-0613',
        inputPrice: 0.00003,
        outputPrice: 0.00006,
        totalPrice: 0
    },
    {
        modelName: 'gpt-4-1106-preview',
        inputPrice: 0.00001,
        outputPrice: 0.00003,
        totalPrice: 0
    },
    {
        modelName: 'gpt-4-32k',
        inputPrice: 0.00006,
        outputPrice: 0.00012,
        totalPrice: 0
    },
    {
        modelName: 'gpt-4-32k-0314',
        inputPrice: 0.00006,
        outputPrice: 0.00012,
        totalPrice: 0
    },
    {
        modelName: 'gpt-4-32k-0613',
        inputPrice: 0.00006,
        outputPrice: 0.00012,
        totalPrice: 0
    }
]
// fractionDigits is the number of digits after the decimal point, for display purposes
const fractionDigits = 2
// This function calculates the cost of the tokens from metrics array
export const calculateCost = (metricsArray: ICommonObject[]) => {
    for (let i = 0; i < metricsArray.length; i++) {
        const metric = metricsArray[i]
        const completionTokens = metric.completionTokens
        const promptTokens = metric.promptTokens
        const totalTokens = metric.totalTokens

        const model = metric.model
        let promptTokensCost: string = '0'
        let completionTokensCost: string = '0'
        let totalTokensCost = '0'
        if (model) {
            const modelCostConfig = CostModels.find((value) => value.modelName === model)
            if (modelCostConfig) {
                if (modelCostConfig.totalPrice > 0) {
                    let cost = modelCostConfig.totalPrice * (totalTokens / 1000)
                    if (cost < 0.01) {
                        totalTokensCost = '$ <0.01'
                    } else {
                        totalTokensCost = '$ ' + cost.toFixed(fractionDigits)
                    }
                } else {
                    let totalCost = 0
                    if (promptTokens) {
                        const cost = modelCostConfig.inputPrice * (promptTokens / 1000)
                        totalCost += cost
                        if (cost < 0.01) {
                            promptTokensCost = '$ <0.01'
                        } else {
                            promptTokensCost = cost.toFixed(fractionDigits)
                        }
                    }
                    if (completionTokens) {
                        const cost = modelCostConfig.outputPrice * (completionTokens / 1000)
                        totalCost += cost
                        if (cost < 0.01) {
                            completionTokensCost = '$ <0.01'
                        } else {
                            completionTokensCost = cost.toFixed(fractionDigits)
                        }
                    }
                    if (totalCost < 0.01) {
                        totalTokensCost = '$ <0.01'
                    } else {
                        totalTokensCost = totalCost.toFixed(fractionDigits)
                    }
                }
            }
        }
        metric['totalCost'] = totalTokensCost
        metric['promptCost'] = promptTokensCost
        metric['completionCost'] = completionTokensCost
    }
}
