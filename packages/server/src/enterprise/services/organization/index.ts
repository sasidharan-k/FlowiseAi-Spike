import { getRunningExpressApp } from '../../../utils/getRunningExpressApp'
import { Organization, User, Workspace, WorkspaceUsers } from '../../database/entities/EnterpriseEntities'
import { InternalFlowiseError } from '../../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import { getErrorMessage } from '../../../errors/utils'
import { LoggedInUser, LoginActivityCode, OrganizationType, UserStatus, OrgSetupSchema } from '../../Interface.Enterprise'
import bcrypt from 'bcryptjs'
import auditService from '../audit'
import { AES, enc } from 'crypto-js'
import { getEncryptionKey } from '../../../utils'

const registerOrganization = async (body: any) => {
    try {
        const appServer = getRunningExpressApp()
        const organizations = await appServer.AppDataSource.getRepository(Organization).find()
        if (organizations.length !== 0) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'Organization already registered')
        }

        const result = OrgSetupSchema.safeParse({
            orgName: body.orgName,
            username: body.username,
            email: body.email,
            password: body.password,
            confirmPassword: body.confirmPassword
        })

        if (!result.success) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, result.error.message)
        }

        let loggedInUser: LoggedInUser = {} as LoggedInUser
        await appServer.AppDataSource.transaction(async (manager) => {
            // (1) create the organization
            const newOrg = new Organization()
            newOrg.organizationType = OrganizationType.ENTERPRISE
            newOrg.name = body.orgName
            const organization = manager.getRepository(Organization).create(newOrg)
            await manager.getRepository(Organization).save(organization)

            // (2) create the default workspace
            const workspace = manager.getRepository(Workspace).create({ name: 'Default', description: 'Default Workspace' })
            workspace.organizationId = organization.id
            const defaultWs = await manager.getRepository(Workspace).save(workspace)

            // (3) create the admin user
            const adminUser = new User()
            Object.assign(adminUser, body)
            adminUser.role = 'org_admin'
            adminUser.status = UserStatus.ACTIVE
            const salt = bcrypt.genSaltSync(parseInt(process.env.PASSWORD_SALT_HASH_ROUNDS || '5'))
            adminUser.credential = bcrypt.hashSync(body.password, salt)
            adminUser.name = body.username
            adminUser.tempToken = ''
            adminUser.tokenExpiry = undefined
            adminUser.activeWorkspaceId = workspace.id
            adminUser.lastLogin = new Date()
            const aUser = manager.getRepository(User).create(adminUser)
            const newUser = await manager.getRepository(User).save(aUser)

            // (4) assign the user to the default workspace
            const workspaceUser = manager
                .getRepository(WorkspaceUsers)
                .create({ workspaceId: workspace.id, userId: aUser.id, role: 'org_admin' })
            await manager.getRepository(WorkspaceUsers).save(workspaceUser)

            // (5) update the organization with the owner user id and default workspace id
            await manager.getRepository(Organization).update(organization.id, { adminUserId: aUser.id, defaultWsId: defaultWs.id })

            // (6) update the local cache with the new organization
            appServer.app.locals.Organization = await manager.getRepository(Organization).findOne({
                where: { id: organization.id }
            })
            await auditService.recordLoginActivity(newUser.email, LoginActivityCode.LOGIN_SUCCESS, 'Login Success')
            loggedInUser = {
                ...newUser,
                permissions: [],
                assignedWorkspaces: [
                    {
                        id: workspace.id,
                        name: workspace.name,
                        role: 'org_admin'
                    }
                ],
                isOrganizationAdmin: true
            }
        })
        return { user: loggedInUser }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: organizationService.registerOrganization - ${getErrorMessage(error)}`
        )
    }
}

const getOrganization = async () => {
    try {
        const appServer = getRunningExpressApp()
        const organization = await appServer.AppDataSource.getRepository(Organization).find()
        const org: any = organization?.length > 0 ? organization[0] : null
        if (org && org.ssoConfig !== null && org.ssoConfig !== undefined && org.ssoConfig !== '') {
            const encryptedConfig = org.ssoConfig
            const decryptedConfig = await decrypt(encryptedConfig)
            org.ssoConfig = JSON.parse(decryptedConfig)
        }
        return org
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: organizationService.getOrganization - ${getErrorMessage(error)}`
        )
    }
}

const updateSSOConfig = async (config: any) => {
    try {
        const appServer = getRunningExpressApp()
        const organization = await appServer.AppDataSource.getRepository(Organization).find()
        if (organization.length > 0) {
            const org = organization[0]
            org.ssoConfig = await encrypt(JSON.stringify(config))
            await appServer.AppDataSource.getRepository(Organization).save(org)
        }
        return 'OK'
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: organizationService.getOrganization - ${getErrorMessage(error)}`
        )
    }
}

const encrypt = async (config: string): Promise<string> => {
    const encryptKey = await getEncryptionKey()
    return AES.encrypt(config, encryptKey).toString()
}

const decrypt = async (encryptedConfig: string): Promise<string> => {
    const encryptKey = await getEncryptionKey()
    const decryptedData = AES.decrypt(encryptedConfig, encryptKey)
    const decryptedDataStr = decryptedData.toString(enc.Utf8)
    return decryptedDataStr
}

export default {
    registerOrganization,
    getOrganization,
    updateSSOConfig
}
