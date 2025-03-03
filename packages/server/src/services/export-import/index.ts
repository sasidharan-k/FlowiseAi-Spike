import { StatusCodes } from 'http-status-codes'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { Tool } from '../../database/entities/Tool'
import { Variable } from '../../database/entities/Variable'
import { Assistant } from '../../database/entities/Assistant'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import chatflowService from '../chatflows'
import toolsService from '../tools'
import variableService from '../variables'
import assistantService from '../assistants'

type ExportInput = {
    tool: boolean
    chatflow: boolean
    agentflow: boolean
    variable: boolean
    assistant: boolean
}

type ExportData = {
    Tool: Tool[]
    ChatFlow: ChatFlow[]
    AgentFlow: ChatFlow[]
    Variable: Variable[]
    Assistant: Assistant[]
}

const convertExportInput = (body: any): ExportInput => {
    try {
        if (!body || typeof body !== 'object') throw new Error('Invalid ExportInput object in request body')
        if (body.tool && typeof body.tool !== 'boolean') throw new Error('Invalid tool property in ExportInput object')
        if (body.chatflow && typeof body.chatflow !== 'boolean') throw new Error('Invalid chatflow property in ExportInput object')
        if (body.agentflow && typeof body.agentflow !== 'boolean') throw new Error('Invalid agentflow property in ExportInput object')
        if (body.variable && typeof body.variable !== 'boolean') throw new Error('Invalid variable property in ExportInput object')
        if (body.assistant && typeof body.assistant !== 'boolean') throw new Error('Invalid assistant property in ExportInput object')
        return body as ExportInput
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: exportImportService.convertExportInput - ${getErrorMessage(error)}`
        )
    }
}

const FileDefaultName = 'ExportData.json'
const exportData = async (exportInput: ExportInput, activeWorkspaceId?: string): Promise<{ FileDefaultName: string } & ExportData> => {
    try {
        // step 1 - get all Tool
        let allTool: Tool[] = []
        if (exportInput.tool === true) allTool = await toolsService.getAllTools(activeWorkspaceId)

        // step 2 - get all ChatFlow
        let allChatflow: ChatFlow[] = []
        if (exportInput.chatflow === true) allChatflow = await chatflowService.getAllChatflows('CHATFLOW', activeWorkspaceId)

        // step 3 - get all assistant ChatFlow
        let allAssistantChatflow: ChatFlow[] = []
        if (exportInput.chatflow === true) allAssistantChatflow = await chatflowService.getAllChatflows('ASSISTANT', activeWorkspaceId)

        // step 4 - get all MultiAgent
        let allMultiAgent: ChatFlow[] = []
        if (exportInput.agentflow === true) allMultiAgent = await chatflowService.getAllChatflows('MULTIAGENT', activeWorkspaceId)

        let allVars: Variable[] = []
        if (exportInput.variable === true) allVars = await variableService.getAllVariables(activeWorkspaceId)

        let allAssistants: Assistant[] = []
        if (exportInput.assistant === true) allAssistants = await assistantService.getAllAssistants(undefined, activeWorkspaceId)

        return {
            FileDefaultName,
            Tool: allTool,
            ChatFlow: [...allChatflow, ...allAssistantChatflow],
            AgentFlow: allMultiAgent,
            Variable: allVars,
            Assistant: allAssistants
        }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: exportImportService.exportData - ${getErrorMessage(error)}`
        )
    }
}

const insertWorkspaceId = (importedData: any, activeWorkspaceId?: string) => {
    if (!activeWorkspaceId) return importedData
    importedData.forEach((item: any) => {
        item.workspaceId = activeWorkspaceId
    })
    return importedData
}

const importData = async (importData: ExportData, activeWorkspaceId?: string) => {
    try {
        const appServer = getRunningExpressApp()
        const queryRunner = appServer.AppDataSource.createQueryRunner()

        try {
            await queryRunner.startTransaction()

            if (importData.Tool.length > 0)
                await toolsService.importTools(insertWorkspaceId(importData.Tool, activeWorkspaceId), queryRunner)
            if (importData.ChatFlow.length > 0)
                await chatflowService.importChatflows(insertWorkspaceId(importData.ChatFlow, activeWorkspaceId), queryRunner)
            if (importData.AgentFlow.length > 0)
                await chatflowService.importChatflows(insertWorkspaceId(importData.AgentFlow, activeWorkspaceId), queryRunner)
            if (importData.Variable.length > 0)
                await variableService.importVariables(insertWorkspaceId(importData.Variable, activeWorkspaceId), queryRunner)
            if (importData.Assistant.length > 0)
                await assistantService.importAssistants(insertWorkspaceId(importData.Assistant, activeWorkspaceId), queryRunner)

            await queryRunner.commitTransaction()
        } catch (error) {
            await queryRunner.rollbackTransaction()
            throw error
        } finally {
            if (!queryRunner.isReleased) {
                await queryRunner.release()
            }
        }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: exportImportService.importAll - ${getErrorMessage(error)}`
        )
    }
}

export default {
    convertExportInput,
    exportData,
    importData
}
