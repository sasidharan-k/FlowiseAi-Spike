import { StatusCodes } from 'http-status-codes'
import { InternalFlowiseError } from '../../../errors/internalFlowiseError'
import { getErrorMessage } from '../../../errors/utils'
import { getRunningExpressApp } from '../../../utils/getRunningExpressApp'
import chatflowExtService from '../chatflows'
import toolsExtService from '../tools'
import variableExtService from '../variables'
import assistantExtService from '../assistants'
import exportImportService from '../../export-import'

export interface updateMultipleData {
    createData: any[]
    updateData: any[]
}

export interface IModifiedIds {
    oldId: string
    newId: string
}

const seperateRecords = (importedFromData: any, importedToData: any, currentWorkspaceId: string, copyWorkspaceId: string) => {
    // Seperate Records here to Create and Update in Second Workspace
    let result: updateMultipleData = {
        createData: [],
        updateData: []
    }

    importedFromData.forEach((fromData: any) => {
        // Modify Column values to copy
        fromData.workspaceId = copyWorkspaceId
        fromData.importedId = fromData.id
        fromData.importedWorkspaceId = currentWorkspaceId

        // Reset Create and Update date
        delete fromData?.createdDate
        delete fromData?.updatedDate

        // Find Is New Record or Exist Record?
        let isExistedRecord = importedToData?.find(
            (toData: any) => fromData?.importedId === toData?.importedId && fromData.importedWorkspaceId === toData.importedWorkspaceId
        )

        // If Record already Exist in Second Workspace just Update it
        if (isExistedRecord) {
            // Change Existing Record Id and Created_Date while Updating
            result.updateData.push({ ...fromData, id: isExistedRecord?.id, createdDate: isExistedRecord?.createdDate })
        }
        // If Record not Exist in Second Workspace Create it
        else {
            // Reset Id while Creating
            result.createData.push({ ...fromData, id: undefined })
        }
    })

    return result
}

const exportToOtherWorkspace = async (currentWorkspaceId: string, copyWorkspaceId: string) => {
    const exportInput = {
        tool: true,
        chatflow: true,
        agentflow: true,
        variable: true,
        assistant: true
    }
    // Maintain the new and old Tool Ids for updating in the Second Workspace (Purpose: For Pointing the respective Tool while Copying)
    let modifiedIds: IModifiedIds[] = []

    try {
        const copyFrom = await exportImportService.exportData(exportInput, currentWorkspaceId)
        const copyTo = await exportImportService.exportData(exportInput, copyWorkspaceId)

        const appServer = getRunningExpressApp()
        const queryRunner = appServer.AppDataSource.createQueryRunner()
        try {
            await queryRunner.startTransaction()

            if (copyFrom.Tool.length > 0) {
                const { ids } = await toolsExtService.updateMultipleTools(
                    seperateRecords(copyFrom.Tool, copyTo.Tool, currentWorkspaceId, copyWorkspaceId),
                    queryRunner
                )
                modifiedIds.push(...ids)
            }
            if (copyFrom.Variable.length > 0)
                await variableExtService.updateMultipleVariables(
                    seperateRecords(copyFrom.Variable, copyTo.Variable, currentWorkspaceId, copyWorkspaceId),
                    queryRunner
                )
            if (copyFrom.Assistant.length > 0)
                await assistantExtService.updateMultipleAssistant(
                    seperateRecords(copyFrom.Assistant, copyTo.Assistant, currentWorkspaceId, copyWorkspaceId),
                    queryRunner
                )

            if (copyFrom.ChatFlow.length > 0)
                await chatflowExtService.updateMultipleChatFlow(
                    seperateRecords(copyFrom.ChatFlow, copyTo.ChatFlow, currentWorkspaceId, copyWorkspaceId),
                    modifiedIds,
                    queryRunner
                )
            if (copyFrom.AgentFlow.length > 0)
                await chatflowExtService.updateMultipleChatFlow(
                    seperateRecords(copyFrom.AgentFlow, copyTo.AgentFlow, currentWorkspaceId, copyWorkspaceId),
                    modifiedIds,
                    queryRunner
                )

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
            `Error: TylerExtService.exportToOtherWorkspace - ${getErrorMessage(error)}`
        )
    }
}

export default {
    exportToOtherWorkspace
}
