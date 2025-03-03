import { StatusCodes } from 'http-status-codes'
import { ChatFlow } from '../../../database/entities/ChatFlow'
import { InternalFlowiseError } from '../../../errors/internalFlowiseError'
import { getErrorMessage } from '../../../errors/utils'
import { getRunningExpressApp } from '../../../utils/getRunningExpressApp'
import { QueryRunner } from 'typeorm'
import { IModifiedIds, updateMultipleData } from '../services'

const updateMultipleChatFlow = async (
    workFlows: updateMultipleData,
    modifiedIds: IModifiedIds[],
    queryRunner?: QueryRunner
): Promise<any> => {
    try {
        // Update the New Tool IDS which is present in the Second Workspace, for the ChatFlow (Purpose: For Pointing the respective Tool while Copying).
        let workFlowsJson = JSON.stringify(workFlows)

        modifiedIds?.forEach((item) => {
            workFlowsJson = workFlowsJson.replaceAll(item?.oldId, item?.newId)
        })
        const parsedWorkFlows: updateMultipleData = JSON.parse(workFlowsJson)

        const appServer = getRunningExpressApp()
        const repository = queryRunner ? queryRunner.manager.getRepository(ChatFlow) : appServer.AppDataSource.getRepository(ChatFlow)

        // Step 1: Bulk Insert all createTool records
        if (workFlows?.createData?.length) await repository.insert(parsedWorkFlows?.createData)

        // Step 2: Bulk Update all updateTool records
        if (workFlows?.updateData?.length)
            await Promise.all(
                parsedWorkFlows?.updateData?.map((updateItem) => {
                    return repository.update(updateItem?.id, updateItem)
                })
            )

        return { message: 'ChatFlows inserted and updated successfully' }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatflowsService.updateMultipleChatflow - ${getErrorMessage(error)}`
        )
    }
}
export default {
    updateMultipleChatFlow
}
