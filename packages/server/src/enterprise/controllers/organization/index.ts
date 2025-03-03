import { NextFunction, Request, Response } from 'express'
import organizationService from '../../services/organization'
import { InternalFlowiseError } from '../../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import { setTokenOrCookies } from '../../middleware/passport'

const registerOrganization = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body === 'undefined') {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: organizationController.registerOrganization - body not provided!`
            )
        }
        const apiResponse = await organizationService.registerOrganization(req.body)
        if (apiResponse.user) {
            const adminUser = apiResponse.user
            return setTokenOrCookies(res, adminUser, true, req)
        }
        return res.status(500).json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    registerOrganization
}
