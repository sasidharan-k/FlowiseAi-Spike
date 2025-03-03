import { StatusCodes } from 'http-status-codes'
import { getRunningExpressApp } from '../../../utils/getRunningExpressApp'
import { InternalFlowiseError } from '../../../errors/internalFlowiseError'
import { getErrorMessage } from '../../../errors/utils'
import { User, Workspace, WorkspaceShared, WorkspaceUsers } from '../../database/entities/EnterpriseEntities'
import { IWorkspaceReturnValues, IWorkspaceWithAssignedUsers, UserStatus } from '../../Interface.Enterprise'
import { EntityManager, In } from 'typeorm'
import authService from '../auth'
import { ChatFlow } from '../../../database/entities/ChatFlow'
import { ApiKey } from '../../../database/entities/ApiKey'
import { Tool } from '../../../database/entities/Tool'
import { Assistant } from '../../../database/entities/Assistant'
import { DocumentStore } from '../../../database/entities/DocumentStore'
import { Dataset } from '../../../database/entities/Dataset'
import { Evaluator } from '../../../database/entities/Evaluator'
import { Evaluation } from '../../../database/entities/Evaluation'
import { Credential } from '../../../database/entities/Credential'
import { CustomTemplate } from '../../../database/entities/CustomTemplate'
import { Variable } from '../../../database/entities/Variable'

const getAllWorkspaces = async () => {
    try {
        const allWorkspaces: IWorkspaceWithAssignedUsers[] = []
        const appServer = getRunningExpressApp()
        const workspaces = await appServer.AppDataSource.getRepository(Workspace).find()
        for (const workspace of workspaces) {
            const workspaceWithAssignments = await _getWorkspaceAssignments(workspace)
            if (workspace.name !== 'Personal Workspace') allWorkspaces.push(workspaceWithAssignments)
        }
        return allWorkspaces
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: workspaceService.getAllWorkspaces - ${getErrorMessage(error)}`
        )
    }
}

const _getWorkspaceAssignments = async (workspace: Workspace) => {
    const workspaceWithUsers: IWorkspaceWithAssignedUsers = workspace as IWorkspaceWithAssignedUsers
    workspaceWithUsers.assignedUsers = []
    const appServer = getRunningExpressApp()
    const assignments = await appServer.AppDataSource.getRepository(WorkspaceUsers).find({
        where: {
            workspaceId: workspace.id
        }
    })
    workspaceWithUsers.userCount = assignments.length
    workspaceWithUsers.isOrgDefault = appServer.app.locals.Organization?.defaultWsId === workspace.id
    for (const assignment of assignments) {
        const user = await appServer.AppDataSource.getRepository(User).findOneBy({
            id: assignment.userId
        })
        if (user) {
            workspaceWithUsers.assignedUsers.push({
                user: user.name,
                email: user.email,
                role: assignment.role,
                isOrgOwner: user.id === appServer.app.locals.Organization?.adminUserId
            })
        }
    }
    return workspaceWithUsers
}

const getWorkspaceById = async (id: string) => {
    try {
        const appServer = getRunningExpressApp()
        const workspace = await appServer.AppDataSource.getRepository(Workspace).findOneBy({
            id: id
        })
        if (!workspace) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Workspace ${id} not found`)
        return await _getWorkspaceAssignments(workspace)
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: workspaceService.getWorkspaceById - ${getErrorMessage(error)}`
        )
    }
}

const getWorkspaceNamesByIds = async (ids: string[]) => {
    try {
        const appServer = getRunningExpressApp()
        const workspaces = await appServer.AppDataSource.getRepository(Workspace).find({
            select: {
                id: true,
                name: true
            },
            where: {
                id: In(ids)
            }
        })
        return workspaces
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: workspaceService.getWorkspaceById - ${getErrorMessage(error)}`
        )
    }
}

const getWorkspaceUsers = async (id: string) => {
    try {
        const appServer = getRunningExpressApp()
        const workspace = await appServer.AppDataSource.getRepository(Workspace).findOneBy({
            id: id
        })
        if (!workspace) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Workspace ${id} not found`)
        const contents = await appServer.AppDataSource.getRepository(WorkspaceUsers).find({
            where: {
                workspaceId: id
            }
        })
        const returnValue = workspace as IWorkspaceReturnValues
        if (contents && contents.length > 0) {
            const users = await appServer.AppDataSource.getRepository(User).find({
                where: {
                    id: In(contents.map((content) => content.userId))
                }
            })
            // create a new array of users with role
            returnValue.users = users.map((user) => {
                const userRole = contents.find((content) => content.userId === user.id)
                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: userRole?.role as string,
                    status: user.status,
                    isOrgOwner: user.id === appServer.app.locals.Organization?.adminUserId,
                    lastLogin: user.lastLogin
                }
            })
        }
        return returnValue
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: workspaceService.getWorkspaceUsers - ${getErrorMessage(error)}`
        )
    }
}

// Create new workspace
const createWorkspace = async (body: any) => {
    try {
        let { isLive, liveWorkspaceId, ...restBody } = body
        const appServer = getRunningExpressApp()
        const newWs = new Workspace()
        Object.assign(newWs, restBody)
        const reservedWorkspaceName = 'Personal Workspace'
        if (newWs.name.trim() === reservedWorkspaceName)
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, `${reservedWorkspaceName} is a reserved workspace name`)
        newWs.organizationId = appServer.app.locals.Organization?.id
        newWs.isLive = isLive ? true : false
        newWs.liveWorkspaceId = liveWorkspaceId ? liveWorkspaceId : ''
        const dataSource = appServer.AppDataSource

        return await dataSource.transaction(async (transactionalEntityManager: EntityManager) => {
            const workspace = transactionalEntityManager.getRepository(Workspace).create(newWs)
            const result = await transactionalEntityManager.getRepository(Workspace).save(workspace)
            // add the org admin to the workspace users
            const wsUser = new WorkspaceUsers()
            wsUser.workspaceId = result.id
            wsUser.userId = body.userId
            wsUser.role = body.role
            const workspaceUser = transactionalEntityManager.getRepository(WorkspaceUsers).create(wsUser)
            await transactionalEntityManager.getRepository(WorkspaceUsers).save(workspaceUser)
            return {
                status: 'OK',
                workspace: result
            }
        })
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: workspaceService.createWorkspace - ${getErrorMessage(error)}`
        )
    }
}

// Update Workspace
const updateWorkspace = async (id: string, body: any) => {
    try {
        const appServer = getRunningExpressApp()
        const workspace = await appServer.AppDataSource.getRepository(Workspace).findOneBy({
            id: id
        })
        if (!workspace) throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Workspace ${id} not found`)

        const updateWs = new Workspace()
        Object.assign(updateWs, body)
        appServer.AppDataSource.getRepository(Workspace).merge(workspace, updateWs)
        await appServer.AppDataSource.getRepository(Workspace).save(workspace)
        return 'OK'
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: workspaceService.updateWorkspace - ${getErrorMessage(error)}`
        )
    }
}

const getAssignedWorkspacesForUser = async (id: string) => {
    try {
        const appServer = getRunningExpressApp()
        const workspaceUsers = await appServer.AppDataSource.getRepository(WorkspaceUsers).find({
            where: {
                userId: id
            }
        })
        if (!workspaceUsers || workspaceUsers.length === 0) {
            return []
        }

        const isOrgAdminUser = id === appServer.app.locals.Organization?.adminUserId
        if (isOrgAdminUser) {
            // declare a new array to hold all workspaces
            const allWs: any[] = []
            const allWorkspaces = await getAllWorkspaces()
            allWorkspaces.forEach((w) => {
                allWs.push({
                    id: w.id,
                    name: w.name,
                    role: 'org_admin',
                    isDefault: appServer.app.locals.Organization?.defaultWsId === w.id
                })
            })
            return allWs
        }

        const workspaceDetails = []
        for (const ws of workspaceUsers) {
            const workspace = await appServer.AppDataSource.getRepository(Workspace).findOneBy({
                id: ws.workspaceId
            })
            if (workspace) {
                workspaceDetails.push({
                    name: workspace.name,
                    id: workspace.id,
                    role: ws.role,
                    isDefault: appServer.app.locals.Organization?.defaultWsId === workspace.id
                })
            }
        }
        return workspaceDetails
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: workspaceService.getAssignedWorkspacesForUser - ${getErrorMessage(error)}`
        )
    }
}

// Delete workspace via id
const deleteWorkspace = async (id: string) => {
    try {
        const appServer = getRunningExpressApp()

        const dataSource = appServer.AppDataSource
        if (appServer.app.locals.Organization?.defaultWsId === id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'Cannot delete default workspace')
        }
        // execute all updates using transactionalEntityManager
        return await dataSource.transaction(async (transactionalEntityManager: EntityManager) => {
            // delete all users in workspace
            await transactionalEntityManager.getRepository(WorkspaceUsers).delete({ workspaceId: id })
            // delete all items shared with workspace
            await transactionalEntityManager.getRepository(WorkspaceShared).delete({ workspaceId: id })
            // get users with active workspace id as the workspace being deleted
            const users = await transactionalEntityManager.getRepository(User).find({
                where: {
                    activeWorkspaceId: id
                }
            })
            // find the assigned workspaces for the users and set the active workspace to the first workspace
            for (const user of users) {
                const assignedWorkspaces = await transactionalEntityManager.getRepository(WorkspaceUsers).find({
                    where: {
                        userId: user.id
                    }
                })
                if (assignedWorkspaces.length > 0) {
                    user.activeWorkspaceId = assignedWorkspaces[0].workspaceId
                    await transactionalEntityManager.getRepository(User).save(user)
                }
            }

            // Hard delete all items in workspace
            // TODO: use foreign key constraints to cascade delete
            await transactionalEntityManager.getRepository(ChatFlow).delete({ workspaceId: id })
            await transactionalEntityManager.getRepository(ApiKey).delete({ workspaceId: id })
            await transactionalEntityManager.getRepository(Tool).delete({ workspaceId: id })
            await transactionalEntityManager.getRepository(Assistant).delete({ workspaceId: id })
            await transactionalEntityManager.getRepository(Credential).delete({ workspaceId: id })
            await transactionalEntityManager.getRepository(DocumentStore).delete({ workspaceId: id })
            await transactionalEntityManager.getRepository(Variable).delete({ workspaceId: id })
            await transactionalEntityManager.getRepository(Dataset).delete({ workspaceId: id })
            await transactionalEntityManager.getRepository(Evaluator).delete({ workspaceId: id })
            await transactionalEntityManager.getRepository(Evaluation).delete({ workspaceId: id })
            await transactionalEntityManager.getRepository(CustomTemplate).delete({ workspaceId: id })

            await transactionalEntityManager.getRepository(Workspace).delete({ id: id })

            return 'OK'
        })
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: workspaceService.deleteWorkspace - ${getErrorMessage(error)}`
        )
    }
}

// remove users from workspace
const unlinkUsersFromWorkspace = async (id: string, body: any) => {
    try {
        const appServer = getRunningExpressApp()
        const userIds = body.userIds as []
        const ws = await appServer.AppDataSource.getRepository(Workspace).findOneBy({
            id: id
        })
        if (!ws) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Workspace ${id} not found`)
        }
        for (const userId of userIds) {
            await appServer.AppDataSource.getRepository(WorkspaceUsers).delete({
                workspaceId: id,
                userId: userId
            })
        }
        return 'OK'
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: workspaceService.unlinkUsersFromWorkspace - ${getErrorMessage(error)}`
        )
    }
}

// add users to workspace
const linkUsersToWorkspace = async (id: string, body: any) => {
    try {
        const appServer = getRunningExpressApp()
        const role = body.role
        let userDetails = []

        if (body.userIds) {
            const userIds = body.userIds as []
            for (const userId of userIds) {
                const workspaceUser = appServer.AppDataSource.getRepository(WorkspaceUsers).create({
                    workspaceId: id,
                    userId: userId,
                    role: role.name
                })
                userDetails.push({ id: workspaceUser?.userId, role: workspaceUser?.role })
                await appServer.AppDataSource.getRepository(WorkspaceUsers).save(workspaceUser)
            }
        }
        if (body.newUsers) {
            for (const user of body.newUsers) {
                const newUser = new User()
                Object.assign(newUser, user)
                newUser.status = UserStatus.INVITED
                newUser.role = role.name
                newUser.activeWorkspaceId = id
                const apiResponse: any = await authService.inviteUser(newUser)
                userDetails.push({ id: apiResponse?.id, role: apiResponse?.role })
            }
        }
        return {
            status: 'OK',
            userDetails
        }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: workspaceService.linkUsersToWorkspace - ${getErrorMessage(error)}`
        )
    }
}

const switchWorkspace = async (user: any, newWorkspaceId: string) => {
    try {
        const appServer = getRunningExpressApp()
        const loggedInUser = await appServer.AppDataSource.getRepository(User).findOneBy({
            id: user.id
        })
        if (!loggedInUser) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Unauthorized: User not found`)
        }
        let assignedWorkspaces: any[] = []
        let result: WorkspaceUsers | null = null
        if (user.id === appServer.app.locals.Organization?.adminUserId) {
            let allWorkspaces = await getAllWorkspaces()
            assignedWorkspaces = allWorkspaces.map((ws) => {
                return {
                    id: ws.id,
                    name: ws.name,
                    role: 'org_admin'
                }
            })
        } else {
            assignedWorkspaces = await getAssignedWorkspacesForUser(user.id)
            result = await appServer.AppDataSource.getRepository(WorkspaceUsers).findOneBy({
                userId: user.id,
                workspaceId: newWorkspaceId
            })
            // if result is null, user is not assigned to the workspace
            if (!result) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Unauthorized: User not assigned to workspace`)
            }
            // iterate results and does not contain the newWorkspaceId, throw an error
            // this is a safety check to prevent unauthorized access by spoofing the workspace id from the API
            if (!assignedWorkspaces.find((ws) => ws.id === newWorkspaceId)) {
                throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, `Unauthorized: User not assigned to workspace`)
            }
        }
        loggedInUser.activeWorkspaceId = newWorkspaceId
        const updatedResponse = await appServer.AppDataSource.getRepository(User).save(loggedInUser)
        ;(updatedResponse as any).assignedWorkspaces = assignedWorkspaces
        if (result?.role) {
            updatedResponse.role = result.role
        }
        return updatedResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: workspaceService.switchWorkspace - ${getErrorMessage(error)}`
        )
    }
}

const getSharedWorkspacesForItem = async (itemId: string) => {
    try {
        const appServer = getRunningExpressApp()
        const sharedWorkspaces = await appServer.AppDataSource.getRepository(WorkspaceShared).find({
            where: {
                sharedItemId: itemId
            }
        })
        if (sharedWorkspaces.length === 0) {
            return []
        }
        // iterate through sharedWorkspaces and get the workspace names
        const workspaceIds = sharedWorkspaces.map((ws) => ws.workspaceId)
        const workspaceNames = await getWorkspaceNamesByIds(workspaceIds)
        // create a new array of sharedWorkspaces with workspace names, workspaceId
        const sharedWorkspacesWithNames = sharedWorkspaces.map((sw) => {
            const workspaceName = workspaceNames.find((wn) => wn.id === sw.workspaceId)
            return {
                workspaceId: sw.workspaceId,
                workspaceName: workspaceName?.name,
                sharedItemId: sw.sharedItemId,
                itemType: sw.itemType
            }
        })
        return sharedWorkspacesWithNames
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: workspaceService.getSharedWorkspaces - ${getErrorMessage(error)}`
        )
    }
}

const getSharedItemsForWorkspace = async (wsId: string, itemType: string) => {
    try {
        const appServer = getRunningExpressApp()
        const sharedItems = await appServer.AppDataSource.getRepository(WorkspaceShared).find({
            where: {
                workspaceId: wsId,
                itemType: itemType
            }
        })
        if (sharedItems.length === 0) {
            return []
        }
        if (itemType === 'credential') {
            const credentialIds = sharedItems.map((ci) => ci.sharedItemId)
            const credentials: any[] = await appServer.AppDataSource.getRepository(Credential).find({
                select: ['id', 'name', 'credentialName'],
                where: {
                    id: In(credentialIds)
                }
            })
            return credentials
        } else if (itemType === 'custom_template') {
            const templateIds = sharedItems.map((ci) => ci.sharedItemId)
            const templates: any[] = await appServer.AppDataSource.getRepository(CustomTemplate).find({
                where: {
                    id: In(templateIds)
                }
            })
            return templates
        }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: workspaceService.getSharedWorkspaces - ${getErrorMessage(error)}`
        )
    }
}

const setSharedWorkspacesForItem = async (itemId: string, body: any) => {
    try {
        const itemType: string = body.itemType
        const workspaceIds: string[] = body.workspaceIds

        const appServer = getRunningExpressApp()
        const sharedWorkspaces = await appServer.AppDataSource.getRepository(WorkspaceShared).find({
            where: {
                sharedItemId: itemId
            }
        })
        await appServer.AppDataSource.transaction(async (transactionalEntityManager: EntityManager) => {
            // delete all shared workspaces for the item
            if (sharedWorkspaces.length > 0) {
                await transactionalEntityManager.getRepository(WorkspaceShared).delete({
                    sharedItemId: itemId
                })
            }
            // add shared workspaces for the item
            for (const workspaceId of workspaceIds) {
                const sharedWorkspace = appServer.AppDataSource.getRepository(WorkspaceShared).create({
                    workspaceId: workspaceId,
                    sharedItemId: itemId,
                    itemType: itemType
                })
                await transactionalEntityManager.getRepository(WorkspaceShared).save(sharedWorkspace)
            }
        })
        return 'OK'
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: workspaceService.setSharedWorkspaces - ${getErrorMessage(error)}`
        )
    }
}

export default {
    getAllWorkspaces,
    getWorkspaceById,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    getWorkspaceUsers,
    unlinkUsersFromWorkspace,
    linkUsersToWorkspace,
    getWorkspaceNamesByIds,
    switchWorkspace,
    getAssignedWorkspacesForUser,
    getSharedWorkspacesForItem,
    setSharedWorkspacesForItem,
    getSharedItemsForWorkspace
}
