import { StatusCodes } from 'http-status-codes'
import { getRunningExpressApp } from '../../../utils/getRunningExpressApp'
import { Variable } from '../../../database/entities/Variable'
import { InternalFlowiseError } from '../../../errors/internalFlowiseError'
import { getErrorMessage } from '../../../errors/utils'
import { QueryRunner } from 'typeorm'
import { updateMultipleData } from '../services'

const updateMultipleVariables = async (variableEntries: updateMultipleData, queryRunner?: QueryRunner): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        const repository = queryRunner ? queryRunner.manager.getRepository(Variable) : appServer.AppDataSource.getRepository(Variable)

        // console.log("WorkFlows Entries ----->", workFlows)

        // Step 1: Bulk Insert all createTool records
        if (variableEntries?.createData?.length) await repository.insert(variableEntries?.createData)

        // Step 2: Bulk Update all updateTool records
        if (variableEntries?.updateData?.length)
            await Promise.all(
                variableEntries?.updateData?.map((updateItem) => {
                    return repository.update(updateItem?.id, updateItem)
                })
            )

        return { message: 'Variables inserted and updated successfully' }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: variablesServices.updateMultipleVariables - ${getErrorMessage(error)}`
        )
    }
}
export default {
    updateMultipleVariables
}
