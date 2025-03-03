import { StatusCodes } from 'http-status-codes'
import { getRunningExpressApp } from '../../../utils/getRunningExpressApp'
import { Assistant } from '../../../database/entities/Assistant'
import { InternalFlowiseError } from '../../../errors/internalFlowiseError'
import { getErrorMessage } from '../../../errors/utils'
import { QueryRunner } from 'typeorm'
import { updateMultipleData } from '../services'

const updateMultipleAssistant = async (assistantEntries: updateMultipleData, queryRunner?: QueryRunner) => {
    try {
        const appServer = getRunningExpressApp()
        const repository = queryRunner ? queryRunner.manager.getRepository(Assistant) : appServer.AppDataSource.getRepository(Assistant)

        // Step 1: Bulk Insert all createTool records
        if (assistantEntries?.createData?.length) await repository.insert(assistantEntries?.createData)

        // Step 2: Bulk Update all updateTool records
        if (assistantEntries?.updateData?.length)
            await Promise.all(
                assistantEntries?.updateData?.map((updateItem) => {
                    return repository.update(updateItem?.id, updateItem)
                })
            )

        return { message: 'Assistant inserted and updated successfully' }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: assistantsService.updateMultipleAssistant - ${getErrorMessage(error)}`
        )
    }
}

export default {
    updateMultipleAssistant
}
