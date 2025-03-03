import { StatusCodes } from 'http-status-codes'
import { Tool } from '../../../database/entities/Tool'
import { InternalFlowiseError } from '../../../errors/internalFlowiseError'
import { getErrorMessage } from '../../../errors/utils'
import { getRunningExpressApp } from '../../../utils/getRunningExpressApp'
import { QueryRunner } from 'typeorm'
import { updateMultipleData } from '../services'

const updateMultipleTools = async (toolEntries: updateMultipleData, queryRunner?: QueryRunner): Promise<any> => {
    try {
        // Find the new and old Tool Ids for updating in the Second Workspace (Purpose: For Pointing the respective Tool while Copying)
        let ids = {
            create: toolEntries?.createData?.map((item) => ({ oldId: item?.importedId, newId: '' })),
            update: toolEntries?.updateData?.map((item) => ({ oldId: item?.importedId, newId: item?.id }))
        }

        const appServer = getRunningExpressApp()
        const repository = queryRunner ? queryRunner.manager.getRepository(Tool) : appServer.AppDataSource.getRepository(Tool)

        // Step 1: Bulk Insert all createTool records
        if (toolEntries?.createData?.length) {
            const createResonse = await repository.insert(toolEntries?.createData)

            createResonse?.identifiers?.forEach((item, index: number) => {
                ids.create[index].newId = item?.id
            })
        }

        // // Step 2: Bulk Update all updateTool records
        if (toolEntries?.updateData?.length)
            await Promise.all(
                toolEntries?.updateData?.map((updateItem) => {
                    return repository.update(updateItem?.id, updateItem)
                })
            )

        return { ids: [...ids.create, ...ids.update], message: 'Tools inserted and updated successfully' }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: toolsService.updateMultipleTools - ${getErrorMessage(error)}`
        )
    }
}
export default {
    updateMultipleTools
}
