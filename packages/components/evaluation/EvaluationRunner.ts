import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'

export class EvaluationRunner {
    static metrics = new Map<string, string[]>()
    static getAndDeleteMetrics(id: string) {
        const val = EvaluationRunner.metrics.get(id)
        EvaluationRunner.metrics.delete(id)
        return val
    }

    static addMetrics(id: string, metric: string) {
        if (EvaluationRunner.metrics.has(id)) {
            EvaluationRunner.metrics.get(id)?.push(metric)
        } else {
            EvaluationRunner.metrics.set(id, [metric])
        }
    }

    baseURL = ''

    constructor(baseURL: string) {
        this.baseURL = baseURL
    }

    public async runEvaluations(data: any) {
        const chatflowIds = JSON.parse(data.chatflowId)
        const returnData: any = {}
        returnData.evaluationId = data.evaluationId
        returnData.runDate = new Date()
        returnData.rows = []
        for (let i = 0; i < data.dataset.rows.length; i++) {
            returnData.rows.push({
                input: data.dataset.rows[i].input,
                expectedOutput: data.dataset.rows[i].output,
                itemNo: data.dataset.rows[i].sequenceNo,
                evaluations: []
            })
        }
        for (let i = 0; i < chatflowIds.length; i++) {
            const chatflowId = chatflowIds[i]
            await this.evaluateChatflow(chatflowId, data, returnData)
        }
        return returnData
    }

    async evaluateChatflow(chatflowId: string, data: any, returnData: any) {
        for (let i = 0; i < data.dataset.rows.length; i++) {
            const item = data.dataset.rows[i]
            const uuid = uuidv4()
            let axiosConfig = {
                headers: {
                    'X-Request-ID': uuid,
                    'X-Flowise-Evaluation': 'true'
                }
            }
            let startTime = performance.now()
            const runData: any = {}
            runData.chatflowId = chatflowId
            runData.startTime = startTime
            const postData: any = { question: item.input, evaluationRunId: uuid, evaluation: true }
            if (data.sessionId) {
                postData.overrideConfig = { sessionId: data.sessionId }
            }
            let response = await axios.post(`${this.baseURL}/api/v1/prediction/${chatflowId}`, postData, axiosConfig)
            const endTime = performance.now()
            const timeTaken = (endTime - startTime).toFixed(2)
            runData.metrics = {
                apiLatency: timeTaken
            }
            runData.uuid = uuid
            runData.actualOutput = response.data.text
            runData.latency = timeTaken
            returnData.rows[i].evaluations.push(runData)
        }
        return returnData
    }
}
