import { StatusCodes } from 'http-status-codes'
import { getRunningExpressApp } from '../../../utils/getRunningExpressApp'
import { Role, User, Workspace, WorkspaceShared, WorkspaceUsers } from '../../database/entities/EnterpriseEntities'
import { InternalFlowiseError } from '../../../errors/internalFlowiseError'
import { getErrorMessage } from '../../../errors/utils'
import { getAppVersion } from '../../../utils'
import { generateSafeCopy, generateTempToken, isTokenValid, TokenType } from '../../utils/tempTokenUtils'
import { IUser, IUserWithAssignedWorkspaces, LoginActivityCode, UserStatus } from '../../Interface.Enterprise'
import bcrypt from 'bcryptjs'
import { EntityManager, ILike, Like } from 'typeorm'
import auditService from '../audit'
import workspaceService from '../workspace'
import { sendPasswordResetEmail, sendWorkspaceInvite } from '../../utils/sendEmail'
import { ChatFlow } from '../../../database/entities/ChatFlow'
import { ApiKey } from '../../../database/entities/ApiKey'
import { Credential } from '../../../database/entities/Credential'
import { Tool } from '../../../database/entities/Tool'
import { Assistant } from '../../../database/entities/Assistant'
import { DocumentStore } from '../../../database/entities/DocumentStore'
import { Variable } from '../../../database/entities/Variable'
import { Dataset } from '../../../database/entities/Dataset'
import { Evaluator } from '../../../database/entities/Evaluator'
import { Evaluation } from '../../../database/entities/Evaluation'
import { CustomTemplate } from '../../../database/entities/CustomTemplate'

const createUser = async (newUser: User) => {
    try {
        const appServer = getRunningExpressApp()

        const user = appServer.AppDataSource.getRepository(User).create(newUser)
        const dbResponse = await appServer.AppDataSource.getRepository(User).save(user)
        await appServer.telemetry.sendTelemetry('user_created', {
            version: await getAppVersion(),
            role: user.role
        })
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: authService.createUser - ${getErrorMessage(error)}`)
    }
}

const logoutUser = async (loggedinUser: IUser) => {
    try {
        const appServer = getRunningExpressApp()
        if (loggedinUser) {
            const dbResponse = await appServer.AppDataSource.getRepository(User).findOneBy({
                id: loggedinUser.id
            })
            if (dbResponse) {
                await auditService.recordLoginActivity(
                    dbResponse.email,
                    LoginActivityCode.LOGOUT_SUCCESS,
                    'Logout Success',
                    loggedinUser.loginMode ?? 'Email/Password'
                )
            }
        }
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: authService.createUser - ${getErrorMessage(error)}`)
    }
}

const deleteUser = async (userId: string): Promise<any> => {
    try {
        const appServer = getRunningExpressApp()
        if (userId === appServer.app.locals.Organization?.adminUserId) {
            throw new InternalFlowiseError(StatusCodes.FORBIDDEN, `Cannot delete the organization owner`)
        }
        const dataSource = appServer.AppDataSource
        let dbResponse = undefined
        await dataSource.transaction(async (transactionalEntityManager: EntityManager) => {
            // delete the workspace users as well
            await transactionalEntityManager.getRepository(WorkspaceUsers).delete({ userId: userId })

            // dete their personal workspace as well
            const user = await transactionalEntityManager.getRepository(User).findOneByOrFail({ id: userId })

            // delete the users master record
            dbResponse = await transactionalEntityManager.getRepository(User).delete({ id: userId })
            const workspaceDescription = 'Personal Workspace of ' + user.id
            const personalWorkspace = await transactionalEntityManager
                .getRepository(Workspace)
                .findOneBy({ description: workspaceDescription })
            if (personalWorkspace) {
                await transactionalEntityManager.getRepository(WorkspaceShared).delete({ workspaceId: personalWorkspace.id })
                await transactionalEntityManager.getRepository(ChatFlow).delete({ workspaceId: personalWorkspace.id })
                await transactionalEntityManager.getRepository(ApiKey).delete({ workspaceId: personalWorkspace.id })
                await transactionalEntityManager.getRepository(Tool).delete({ workspaceId: personalWorkspace.id })
                await transactionalEntityManager.getRepository(Assistant).delete({ workspaceId: personalWorkspace.id })
                await transactionalEntityManager.getRepository(Credential).delete({ workspaceId: personalWorkspace.id })
                await transactionalEntityManager.getRepository(DocumentStore).delete({ workspaceId: personalWorkspace.id })
                await transactionalEntityManager.getRepository(Variable).delete({ workspaceId: personalWorkspace.id })
                await transactionalEntityManager.getRepository(Dataset).delete({ workspaceId: personalWorkspace.id })
                await transactionalEntityManager.getRepository(Evaluator).delete({ workspaceId: personalWorkspace.id })
                await transactionalEntityManager.getRepository(Evaluation).delete({ workspaceId: personalWorkspace.id })
                await transactionalEntityManager.getRepository(CustomTemplate).delete({ workspaceId: personalWorkspace.id })

                await transactionalEntityManager.getRepository(Workspace).delete({ id: personalWorkspace.id })
            }
        })
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: authService.deleteUser - ${getErrorMessage(error)}`)
    }
}

const getAllUsers = async () => {
    const usersWithWorkspaces: IUserWithAssignedWorkspaces[] = []
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(User).find()
        // loop through the roles and add the items from workspace users
        for (const returnUser of dbResponse) {
            const userWithWs: IUserWithAssignedWorkspaces = {
                id: returnUser.id,
                name: returnUser.name,
                email: returnUser.email,
                status: returnUser.status,
                activeWorkspaceId: returnUser.activeWorkspaceId,
                lastLogin: returnUser.lastLogin,
                isOrgOwner: appServer.app.locals.Organization?.adminUserId === returnUser.id,
                assignedRoles: []
            }
            const workspaceUsers = await appServer.AppDataSource.getRepository(WorkspaceUsers).find({
                where: {
                    userId: returnUser.id
                }
            })
            // add the users to the role
            for (const workspaceUser of workspaceUsers) {
                let workspaceName = ''

                const ws = await appServer.AppDataSource.getRepository(Workspace).findOneBy({
                    id: workspaceUser.workspaceId
                })

                if (ws) {
                    workspaceName = ws.name
                    if (workspaceName === 'Personal Workspace') continue
                }

                userWithWs.assignedRoles.push({
                    role: workspaceUser.role,
                    active: workspaceUser.workspaceId === returnUser.activeWorkspaceId,
                    workspace: workspaceName
                })
            }

            usersWithWorkspaces.push(userWithWs)
        }
        return usersWithWorkspaces
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: authService.getAllUsers - ${getErrorMessage(error)}`)
    }
}

const getUserById = async (userId: string) => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(User).findOneBy({
            id: userId
        })
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: authService.getUserById - ${getErrorMessage(error)}`)
    }
}

const getUserByEmail = async (userEmail: string) => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(User).findOneBy({
            email: ILike(userEmail)
        })
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: authService.getUserByEmail - ${getErrorMessage(error)}`)
    }
}

const updateUser = async (user: User, updatedUser: User) => {
    try {
        const appServer = getRunningExpressApp()
        if (updatedUser.credential) {
            const salt = bcrypt.genSaltSync(parseInt(process.env.PASSWORD_SALT_HASH_ROUNDS || '5'))
            const hash = bcrypt.hashSync(updatedUser.credential, salt)
            updatedUser.credential = hash
        }
        const tmpUpdatedVariable = appServer.AppDataSource.getRepository(User).merge(user, updatedUser)
        const dbResponse = await appServer.AppDataSource.getRepository(User).save(tmpUpdatedVariable)

        return generateSafeCopy(dbResponse)
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: authService.updateUser - ${getErrorMessage(error)}`)
    }
}

const updateUserRole = async (userId: string, newRole: string) => {
    const appServer = getRunningExpressApp()
    const queryRunner = appServer.AppDataSource.createQueryRunner() // Create query runner
    await queryRunner.connect()

    try {
        await queryRunner.startTransaction()

        await queryRunner.manager.getRepository(User).update(userId, { role: newRole })

        await queryRunner.manager.getRepository(WorkspaceUsers).update({ userId }, { role: newRole })

        await queryRunner.commitTransaction()
    } catch (error) {
        await queryRunner.rollbackTransaction()
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: authService.updateUserRole - ${getErrorMessage(error)}`)
    } finally {
        await queryRunner.release()
    }
}

const updateUserLastLoginTime = async (userId: string) => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(User).update(
            {
                id: userId
            },
            {
                lastLogin: new Date()
            }
        )
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: authService.updateUser - ${getErrorMessage(error)}`)
    }
}

const updateUserProperties = async (userId: string, properties: any) => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(User).update(
            {
                id: userId
            },
            properties
        )
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: authService.updateUserProperties - ${getErrorMessage(error)}`
        )
    }
}

const forgotPassword = async (email: string) => {
    try {
        const appServer = getRunningExpressApp()
        const user = await getUserByEmail(email)
        if (user === null) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Error: authService.forgotPassword - User not found`)
        }
        user.tempToken = generateTempToken()
        const tokenExpiry = new Date()
        const expiryInMins = process.env.PASSWORD_RESET_TOKEN_EXPIRY_IN_MINUTES
            ? parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRY_IN_MINUTES)
            : 15
        tokenExpiry.setMinutes(tokenExpiry.getMinutes() + expiryInMins)
        user.tokenExpiry = tokenExpiry
        await appServer.AppDataSource.getRepository(User).save(user)
        const resetLink = `${process.env.APP_URL}/reset-password?token=${user.tempToken}`
        await sendPasswordResetEmail(user.email, resetLink)
        return 'OK'
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: authService.forgotPassword - ${getErrorMessage(error)}`)
    }
}

const inviteUser = async (user: User) => {
    try {
        const appServer = getRunningExpressApp()
        const dataSource = appServer.AppDataSource
        if (user.id) {
            let dbResponse = undefined
            await dataSource.transaction(async (transactionalEntityManager: EntityManager) => {
                // this is update invite
                const currentUser = await getUserById(user.id)
                if (currentUser === null) {
                    throw new Error(`User ${user.id} not found in the database`)
                }
                if (currentUser.status === UserStatus.ACTIVE) {
                    // if user is active from SSO, do not revert to invited
                    user.status = UserStatus.ACTIVE
                }
                const updatedUser = transactionalEntityManager.getRepository(User).merge(currentUser, user)
                // generate a new token and expiry
                updatedUser.tempToken = generateTempToken()
                const tokenExpiry = new Date()
                const expiryInHours = process.env.INVITE_TOKEN_EXPIRY_IN_HOURS ? parseInt(process.env.INVITE_TOKEN_EXPIRY_IN_HOURS) : 24
                tokenExpiry.setHours(tokenExpiry.getHours() + expiryInHours)
                updatedUser.tokenExpiry = tokenExpiry
                //now update the workspace user entry as well
                const workspaceUser = await transactionalEntityManager.getRepository(WorkspaceUsers).findOneBy({
                    userId: user.id
                })
                if (workspaceUser) {
                    workspaceUser.role = user.role
                    workspaceUser.workspaceId = user.activeWorkspaceId
                    await transactionalEntityManager.getRepository(WorkspaceUsers).save(workspaceUser)

                    const workspace = await workspaceService.getWorkspaceById(user.activeWorkspaceId)
                    const workspaceName = workspace.name

                    const registerLink = `${process.env.APP_URL}/register?token=${updatedUser.tempToken}`
                    await sendWorkspaceInvite(user.email, workspaceName, registerLink)
                }
                dbResponse = await transactionalEntityManager.getRepository(User).save(updatedUser)
            })
            return dbResponse
        } else {
            let dbResponse = undefined
            await dataSource.transaction(async (transactionalEntityManager: EntityManager) => {
                // new invite
                // first check for duplicate email
                const existingUser = await getUserByEmail(user.email)
                if (existingUser) {
                    return { error: 'User already exists with this email!' }
                }
                const newInvite = transactionalEntityManager.getRepository(User).create(user)
                const newUser = await transactionalEntityManager.getRepository(User).save(newInvite)
                // we need the user id to generate the token, hence this is a 2-step process
                newUser.tempToken = generateTempToken()
                const tokenExpiry = new Date()
                const expiryInHours = process.env.INVITE_TOKEN_EXPIRY_IN_HOURS ? parseInt(process.env.INVITE_TOKEN_EXPIRY_IN_HOURS) : 24
                tokenExpiry.setHours(tokenExpiry.getHours() + expiryInHours)
                newUser.tokenExpiry = tokenExpiry
                dbResponse = await transactionalEntityManager.getRepository(User).save(newUser)
                const workspaceUser = transactionalEntityManager.getRepository(WorkspaceUsers).create({
                    userId: newUser.id,
                    workspaceId: user.activeWorkspaceId,
                    role: user.role
                })
                await transactionalEntityManager.getRepository(WorkspaceUsers).save(workspaceUser)

                // create personal workspace
                // const organizations = await transactionalEntityManager.getRepository(Organization).find()
                // const workspaceDescription = 'Personal Workspace of ' + newUser.email
                // let newPersonalWorkspace = await transactionalEntityManager.getRepository(Workspace).create({
                //     name: 'Personal Workspace',
                //     description: workspaceDescription,
                //     organizationId: organizations[0].id
                // })
                // newPersonalWorkspace = await transactionalEntityManager.getRepository(Workspace).save(newPersonalWorkspace)

                // const newPersonalWorkspaceUser = await transactionalEntityManager.getRepository(WorkspaceUsers).create({
                //     workspaceId: newPersonalWorkspace.id,
                //     userId: newUser.id,
                //     role: 'pw'
                // })
                // await transactionalEntityManager.getRepository(WorkspaceUsers).save(newPersonalWorkspaceUser)

                const workspace = await workspaceService.getWorkspaceById(user.activeWorkspaceId)
                const workspaceName = workspace.name

                const registerLink = `${process.env.APP_URL}/register?token=${newUser.tempToken}`
                await sendWorkspaceInvite(user.email, workspaceName, registerLink)
            })
            return dbResponse
        }
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: authService.inviteUser - ${getErrorMessage(error)}`)
    }
}

const resetCurrentPassword = async (body: any) => {
    try {
        const appServer = getRunningExpressApp()
        const currentUser = await getUserByEmail(body.email)

        if (currentUser === null) {
            throw new Error('Invalid email')
        }

        if (currentUser.tempToken !== body.token) {
            throw new Error('Invalid token')
        }

        const tokenExpiry = currentUser.tokenExpiry ? new Date(currentUser.tokenExpiry) : null
        if (!tokenExpiry) {
            throw new Error('Invalid token expiry')
        }

        if (!isTokenValid(tokenExpiry, TokenType.PASSWORD_RESET)) {
            throw new Error('Reset Token has expired.')
        }

        // all checks are done, now update the user password, don't forget to hash it and do not forget to clear the temp token
        // leave the user status and other details as is
        const salt = bcrypt.genSaltSync(parseInt(process.env.PASSWORD_SALT_HASH_ROUNDS || '5'))
        const hash = bcrypt.hashSync(body.updatedPassword, salt)
        currentUser.credential = hash
        currentUser.tempToken = ''
        currentUser.tokenExpiry = undefined
        await appServer.AppDataSource.getRepository(User).save(currentUser)
        return 'OK'
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `${getErrorMessage(error)}`)
    }
}

const registerUser = async (body: any) => {
    try {
        const appServer = getRunningExpressApp()

        const email = body.email
        const currentUser = await getUserByEmail(email)

        if (currentUser === null) {
            throw new Error('Invalid email')
        }

        if (currentUser.status !== UserStatus.INVITED) {
            throw new Error('Invalid status')
        }

        if (currentUser.tempToken !== body.token) {
            throw new Error('Invalid invite code')
        }

        const tokenExpiry = currentUser.tokenExpiry ? new Date(currentUser.tokenExpiry) : null
        if (!tokenExpiry) {
            throw new Error('Invalid token expiry')
        }

        if (!isTokenValid(tokenExpiry, TokenType.INVITE)) {
            throw new Error('Invite Token has expired.')
        }

        // all checks are done, now update the user status and other details
        currentUser.status = UserStatus.ACTIVE
        const salt = bcrypt.genSaltSync(parseInt(process.env.PASSWORD_SALT_HASH_ROUNDS || '5'))
        const hash = bcrypt.hashSync(body.password, salt)
        currentUser.credential = hash
        currentUser.name = body.username
        currentUser.tempToken = ''
        currentUser.tokenExpiry = undefined
        await appServer.AppDataSource.getRepository(User).save(currentUser)
        return 'OK'
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `${getErrorMessage(error)}`)
    }
}

const findUsers = async (searchString: string) => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(User).find({
            select: {
                id: true,
                name: true,
                email: true,
                role: true
            },
            where: [
                {
                    email: Like('%' + searchString + '%')
                },
                {
                    name: Like('%' + searchString + '%')
                }
            ]
        })
        for (const user of dbResponse) {
            const workspaceNames = []
            const workspaces = await appServer.AppDataSource.getRepository(WorkspaceUsers).find({
                where: {
                    userId: user.id
                }
            })
            if (workspaces.length > 0) {
                for (const ws of workspaces) {
                    const workspace = await appServer.AppDataSource.getRepository(Workspace).findOneBy({
                        id: ws.workspaceId
                    })
                    if (workspace) {
                        workspaceNames.push({ id: workspace.id, name: workspace.name })
                    }
                }
            } else {
                workspaceNames.push('Unassigned')
            }
            ;(user as any).workspaceNames = workspaceNames
        }
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: authService.findUsers - ${getErrorMessage(error)}`)
    }
}

// role related functions
const createRole = async (body: any) => {
    try {
        const appServer = getRunningExpressApp()

        const roleEntity = appServer.AppDataSource.getRepository(Role).create({
            name: body.name,
            description: body.description,
            permissions: body.permissions
        })
        const result = await appServer.AppDataSource.getRepository(Role).save(roleEntity)
        return result
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: authService.createRole - ${getErrorMessage(error)}`)
    }
}

const updateRole = async (id: string, body: any) => {
    try {
        try {
            const appServer = getRunningExpressApp()
            const currentRole = await appServer.AppDataSource.getRepository(Role).findOneBy({
                id: id
            })
            if (!currentRole) {
                throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `Role ${id} not found`)
            }

            const updatedRole = appServer.AppDataSource.getRepository(Role).merge(currentRole, body)
            const dbResponse = await appServer.AppDataSource.getRepository(Role).save(updatedRole)
            return dbResponse
        } catch (error) {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: authService.updateRole - ${getErrorMessage(error)}`)
        }
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: authService.updateRole - ${getErrorMessage(error)}`)
    }
}

const deleteRole = async (id: string) => {
    try {
        try {
            const appServer = getRunningExpressApp()
            const deletedRole = await appServer.AppDataSource.getRepository(Role).delete({
                id: id
            })
            return deletedRole
        } catch (error) {
            throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: authService.updateRole - ${getErrorMessage(error)}`)
        }
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: authService.updateRole - ${getErrorMessage(error)}`)
    }
}

const getRoleByName = async (name: string) => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(Role).findOneBy({
            name: name
        })
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: authService.getRoleByName - ${getErrorMessage(error)}`)
    }
}

const getAllRoles = async () => {
    try {
        const appServer = getRunningExpressApp()
        const dbResponse = await appServer.AppDataSource.getRepository(Role).find()
        // loop through the roles and add the items from workspace users
        for (const role of dbResponse) {
            const workspaceUsers = await appServer.AppDataSource.getRepository(WorkspaceUsers).find({
                where: {
                    role: role.name
                }
            })
            const assignedUsers: any[] = []
            // add the users to the role
            for (const workspaceUser of workspaceUsers) {
                const assignedUser: any = {}
                const dbUser = await appServer.AppDataSource.getRepository(User).findOneBy({
                    id: workspaceUser.userId
                })
                if (dbUser) {
                    assignedUser.user = dbUser.name
                    assignedUser.email = dbUser.email
                }
                const ws = await appServer.AppDataSource.getRepository(Workspace).findOneBy({
                    id: workspaceUser.workspaceId
                })
                if (ws) {
                    assignedUser.workspace = ws.name
                }
                assignedUsers.push(assignedUser)
            }
            ;(role as any).assignedUsers = assignedUsers
        }
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(StatusCodes.INTERNAL_SERVER_ERROR, `Error: authService.getAllRoles - ${getErrorMessage(error)}`)
    }
}

export default {
    createUser,
    deleteUser,
    getAllUsers,
    getUserById,
    getUserByEmail,
    updateUser,
    updateUserRole,
    inviteUser,
    registerUser,
    findUsers,
    updateUserLastLoginTime,
    forgotPassword,
    resetCurrentPassword,
    createRole,
    updateRole,
    getAllRoles,
    getRoleByName,
    deleteRole,
    logoutUser,
    updateUserProperties
}
