import { Request, Response, NextFunction } from 'express'
import { InternalFlowiseError } from '../../../errors/internalFlowiseError'
import workspaceService from '../../services/workspace'
import { StatusCodes } from 'http-status-codes'
import { generateSafeCopy } from '../../utils/tempTokenUtils'
import { setTokenOrCookies } from '../../middleware/passport'
import authService from '../../services/auth'
import { getRunningExpressApp } from '../../../utils/getRunningExpressApp'

const getAllWorkspaces = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await workspaceService.getAllWorkspaces()
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getWorkspaceById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: workspaceController.getWorkspace - id not provided!`)
        }
        const apiResponse = await workspaceService.getWorkspaceById(req.params.id)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getWorkspaceUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: workspaceController.getWorkspace - id not provided!`)
        }
        const apiResponse = await workspaceService.getWorkspaceUsers(req.params.id)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getAssignedWorkspacesForUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: workspaceController.getAssignedWorkspacesForUser - user not provided!`
            )
        }
        const apiResponse = await workspaceService.getAssignedWorkspacesForUser(req?.user?.id)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const createWorkspace = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: workspaceController.createWorkspace - body not provided!`
            )
        }
        req.body.userId = req.user?.id
        req.body.role = req.user?.role
        const apiResponse = await workspaceService.createWorkspace(req.body)
        if (apiResponse.status === 'OK') {
            const id = req.user?.id
            if (id) {
                let assignedWorkspacesForUser = await workspaceService.getAssignedWorkspacesForUser(id)
                if (req.body.from_bellerophon != 'true') {
                    return res.json(assignedWorkspacesForUser)
                }
            }
        }
        return res.json(apiResponse.workspace)
    } catch (error) {
        next(error)
    }
}

const updateWorkspace = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: workspaceController.updateWorkspace - body not provided!`
            )
        }
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: workspaceController.updateWorkspace - id not provided!`)
        }
        const apiResponse = await workspaceService.updateWorkspace(req.params.id, req.body)
        if (apiResponse === 'OK') {
            const id = req.user?.id
            if (id) {
                let assignedWorkspacesForUser = await workspaceService.getAssignedWorkspacesForUser(id)
                return res.json(assignedWorkspacesForUser)
            }
        }
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const unlinkUsersFromWorkspace = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: workspaceController.unlinkUsersFromWorkspace - body not provided!`
            )
        }
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: workspaceController.unlinkUsersFromWorkspace - id not provided!`
            )
        }
        const apiResponse = await workspaceService.unlinkUsersFromWorkspace(req.params.id, req.body)
        if (apiResponse === 'OK') {
            //edge case, if the user is unlinking themselves, return the updated workspaces
            const userIds = req.body.userIds
            const id = req.user?.id
            if (id && userIds?.length && userIds?.includes(id)) {
                let assignedWorkspacesForUser = await workspaceService.getAssignedWorkspacesForUser(id)
                return res.json(assignedWorkspacesForUser)
            }
        }
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const linkUsersToWorkspace = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: workspaceController.linkUsersToWorkspace - body not provided!`
            )
        }
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: workspaceController.linkUsersToWorkspace - id not provided!`
            )
        }
        const apiResponse = await workspaceService.linkUsersToWorkspace(req.params.id, req.body)
        if (apiResponse?.status === 'OK') {
            //edge case, if the user is linking themselves, return the updated workspaces
            const userIds = req.body.userIds
            const id = req.user?.id
            if (id && userIds?.length && userIds?.includes(id)) {
                if (req.body.from_bellerophon != 'true') {
                    let assignedWorkspacesForUser = await workspaceService.getAssignedWorkspacesForUser(id)
                    return res.json(assignedWorkspacesForUser)
                }
            }
        }
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const deleteWorkspace = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: workspaceController.deleteWorkspace - id not provided!`)
        }
        // the service deletes all workspaceUsers and workspaceSharedItems
        const apiResponse = await workspaceService.deleteWorkspace(req.params.id)
        if (apiResponse === 'OK') {
            const id = req.user?.id
            if (id) {
                let assignedWorkspacesForUser = await workspaceService.getAssignedWorkspacesForUser(id)
                return res.json(assignedWorkspacesForUser)
            }
        }
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const switchWorkspace = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const server = getRunningExpressApp()
        if (!req.user) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Unauthorized: User not found`)
        }
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Error: workspaceController.switchWorkspace - id not provided!`)
        }
        const currentUser: any = req.user
        const user = await workspaceService.switchWorkspace(currentUser, req.params.id)
        // Generate and sign a JWT that is valid for one hour.
        const returnUser: any = generateSafeCopy(user)
        if (returnUser.id !== getRunningExpressApp().app.locals.Organization?.adminUserId) {
            const rbac = await authService.getRoleByName(returnUser.role)
            if (rbac) {
                ;(returnUser as any).permissions = rbac.permissions.split(',')
                server.app.locals.rbacPermissions.set(returnUser.role, rbac.permissions)
            } else if (returnUser.role === 'pw') {
                const allPermissions = getRunningExpressApp().identityManager.getPermissions().toJSON()
                returnUser.permissions = Object.values(allPermissions).flatMap((group) => group.map((item) => item.key))
                server.app.locals.rbacPermissions.set(returnUser.role, returnUser.permissions)
            }
        }
        return setTokenOrCookies(res, returnUser, false, req)
    } catch (error) {
        next(error)
    }
}

const getSharedWorkspacesForItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Unauthorized: User not found`)
        }
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.UNAUTHORIZED,
                `Error: workspaceController.getSharedWorkspacesForItem - id not provided!`
            )
        }
        return res.json(await workspaceService.getSharedWorkspacesForItem(req.params.id))
    } catch (error) {
        next(error)
    }
}

const setSharedWorkspacesForItem = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Unauthorized: User not found`)
        }
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.UNAUTHORIZED,
                `Error: workspaceController.setSharedWorkspacesForItem - id not provided!`
            )
        }
        if (!req.body) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: workspaceController.setSharedWorkspacesForItem - body not provided!`
            )
        }
        return res.json(await workspaceService.setSharedWorkspacesForItem(req.params.id, req.body))
    } catch (error) {
        next(error)
    }
}

export default {
    getAllWorkspaces,
    getWorkspaceById,
    createWorkspace,
    getAssignedWorkspacesForUser,
    updateWorkspace,
    deleteWorkspace,
    getWorkspaceWithContentsById: getWorkspaceUsers,
    unlinkUsersFromWorkspace,
    linkUsersToWorkspace,
    switchWorkspace,
    getSharedWorkspacesForItem,
    setSharedWorkspacesForItem
}
