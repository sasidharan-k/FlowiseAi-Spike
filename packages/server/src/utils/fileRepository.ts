import { ChatFlow } from '../database/entities/ChatFlow'
import { IReactFlowObject } from '../Interface'
import { addBase64FilesToStorage } from 'flowise-components'
import { getRunningExpressApp } from './getRunningExpressApp'
import { checkStorage, updateStorageUsage } from './featureUsage'
import { getOrgData } from '.'

export const containsBase64File = (chatflow: ChatFlow) => {
    const parsedFlowData: IReactFlowObject = JSON.parse(chatflow.flowData)
    const re = new RegExp('^data.*;base64', 'i')
    let found = false
    const nodes = parsedFlowData.nodes
    for (const node of nodes) {
        if (node.data.category !== 'Document Loaders') {
            continue
        }
        const inputs = node.data.inputs
        if (inputs) {
            const keys = Object.getOwnPropertyNames(inputs)
            for (let i = 0; i < keys.length; i++) {
                const input = inputs[keys[i]]
                if (!input) {
                    continue
                }
                if (typeof input !== 'string') {
                    continue
                }
                if (input.startsWith('[')) {
                    try {
                        const files = JSON.parse(input)
                        for (let j = 0; j < files.length; j++) {
                            const file = files[j]
                            if (re.test(file)) {
                                found = true
                                break
                            }
                        }
                    } catch (e) {
                        continue
                    }
                }
                if (re.test(input)) {
                    found = true
                    break
                }
            }
        }
    }
    return found
}

export const updateFlowDataWithFilePaths = async (chatflowid: string, flowData: string) => {
    try {
        const appServer = getRunningExpressApp()
        const orgData = await getOrgData(appServer)

        const parsedFlowData: IReactFlowObject = JSON.parse(flowData)
        const re = new RegExp('^data.*;base64', 'i')
        const nodes = parsedFlowData.nodes
        for (let j = 0; j < nodes.length; j++) {
            const node = nodes[j]
            if (node.data.category !== 'Document Loaders') {
                continue
            }
            if (node.data.inputs) {
                const inputs = node.data.inputs
                const keys = Object.getOwnPropertyNames(inputs)
                for (let i = 0; i < keys.length; i++) {
                    const fileNames: string[] = []
                    const key = keys[i]
                    const input = inputs?.[key]
                    if (!input) {
                        continue
                    }
                    if (typeof input !== 'string') {
                        continue
                    }
                    if (input.startsWith('[')) {
                        try {
                            const files = JSON.parse(input)
                            for (let j = 0; j < files.length; j++) {
                                const file = files[j]
                                if (re.test(file)) {
                                    await checkStorage(orgData)
                                    const { path, totalSize } = await addBase64FilesToStorage(file, chatflowid, fileNames, orgData?.id)
                                    node.data.inputs[key] = path
                                    await updateStorageUsage(orgData.subdomain, totalSize / 1024 / 1024)
                                }
                            }
                        } catch (e) {
                            continue
                        }
                    } else if (re.test(input)) {
                        await checkStorage(orgData)
                        const { path, totalSize } = await addBase64FilesToStorage(input, chatflowid, fileNames, orgData?.id)
                        node.data.inputs[key] = path
                        await updateStorageUsage(orgData.subdomain, totalSize / 1024 / 1024)
                    }
                }
            }
        }

        return JSON.stringify(parsedFlowData)
    } catch (e) {
        return ''
    }
}
