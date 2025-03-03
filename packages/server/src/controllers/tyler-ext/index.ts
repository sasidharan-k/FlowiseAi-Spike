import { NextFunction, Request, Response } from 'express'
import tylerExtService from '../../services/tyler-ext/services'
import { ChatflowType } from '../../Interface'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import chatflowsService from '../../services/chatflows'

const copyWorkspace = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await tylerExtService.exportToOtherWorkspace(req.body.fromWorkspaceId as string, req.body.toWorkspaceId as string)
        return res.json({ message: 'success' })
    } catch (error) {
        next(error)
    }
}

const getAllChatflows = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.query?.workspaceId === 'undefined' || !req.query?.workspaceId) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: tylerExtRouter.getAllChatflows - workspaceId not provided!`)
        }
        const apiResponse = await chatflowsService.getAllChatflows(req.query?.type as ChatflowType, req.query?.workspaceId as string)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    copyWorkspace,
    getAllChatflows
}
