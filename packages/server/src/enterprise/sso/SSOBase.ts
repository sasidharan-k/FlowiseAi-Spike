// SSOBase.ts
import express from 'express'
import passport from 'passport'
import authService from '../services/auth'
import auditService from '../services/audit'
import workspaceService from '../services/workspace'
import { ErrorMessage, LoggedInUser, LoginActivityCode, UserStatus } from '../Interface.Enterprise'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'

abstract class SSOBase {
    protected app: express.Application
    protected ssoConfig: any

    constructor(app: express.Application, ssoConfig?: any) {
        this.app = app
        this.ssoConfig = ssoConfig
    }

    setSSOConfig(ssoConfig: any) {
        this.ssoConfig = ssoConfig
    }

    getSSOConfig() {
        return this.ssoConfig
    }

    abstract getProviderName(): string
    abstract initialize(): void
    abstract refreshToken(ssoRefreshToken: string): Promise<{ [key: string]: any }>
    async verifyAndLogin(
        app: express.Application,
        email: string,
        done: (err?: Error | null, user?: Express.User, info?: any) => void,
        profile: passport.Profile,
        accessToken: string | object,
        refreshToken: string
    ) {
        const ssoProviderName = this.getProviderName()
        const user = await authService.getUserByEmail(email)
        if (!user) {
            await auditService.recordLoginActivity(email, LoginActivityCode.UNKNOWN_USER, ErrorMessage.UNKNOWN_USER, ssoProviderName)
            return done(
                { name: 'SSO_LOGIN_FAILED', message: ssoProviderName + ' Login failed! Please contact your administrator.' },
                undefined
            )
        }
        // Users with both modes enabled might have their status as invited, allow them to login with SSO
        if (user.status === UserStatus.DISABLED) {
            await auditService.recordLoginActivity(email, LoginActivityCode.USER_DISABLED, ErrorMessage.INACTIVE_USER, ssoProviderName)
            return done(
                { name: 'SSO_LOGIN_FAILED', message: ssoProviderName + ' Login failed! Please contact your administrator.' },
                undefined
            )
        }

        const allPermissions = getRunningExpressApp().identityManager.getPermissions().toJSON()
        let assignedWorkspaces = await workspaceService.getAssignedWorkspacesForUser(user.id)
        let permissions: string[] = []
        const orgAdminUser = user.id === getRunningExpressApp().app.locals.Organization?.adminUserId

        if (assignedWorkspaces.length === 0) {
            /* in an ideal setup, this should never happen */
            await auditService.recordLoginActivity(
                user.email,
                LoginActivityCode.NO_ASSIGNED_WORKSPACE,
                ErrorMessage.INVALID_WORKSPACE,
                ssoProviderName
            )
            return done(
                { name: 'SSO_LOGIN_FAILED', message: ssoProviderName + ' Login failed! Please contact your administrator.' },
                undefined
            )
        } else {
            // check if this user is the organization admin user
            if (orgAdminUser) {
                user.role = 'org_admin'
                if (!user.activeWorkspaceId || user.activeWorkspaceId === '') {
                    user.activeWorkspaceId = assignedWorkspaces[0].id
                }
            } else {
                // get the role from the active workspace
                let role = ''
                if (user.activeWorkspaceId && user.activeWorkspaceId !== '') {
                    role = assignedWorkspaces.find((w) => w.id === user.activeWorkspaceId)?.role ?? ''
                } else {
                    role = assignedWorkspaces[0].role
                    user.activeWorkspaceId = assignedWorkspaces[0].id
                }

                user.role = role
                const rbac = await authService.getRoleByName(role)
                if (rbac) {
                    permissions = rbac.permissions.split(',')
                    app.locals.rbacPermissions.set(role, rbac.permissions)
                } else if (role === 'pw') {
                    permissions = Object.values(allPermissions).flatMap((group) => group.map((item) => item.key))
                    app.locals.rbacPermissions.set(role, permissions)
                }
            }
        }
        const toUpdateUserProperties: any = {
            lastLogin: new Date()
        }
        if (!user.name) {
            toUpdateUserProperties.name = profile.displayName
        }
        if (user.status === UserStatus.INVITED) {
            toUpdateUserProperties.status = UserStatus.ACTIVE
            // if the user is logging in with a temp token (invited), clear it
            if (user.tempToken) {
                toUpdateUserProperties.tempToken = ''
                toUpdateUserProperties.tokenExpiry = new Date()
            }
        }
        await authService.updateUserProperties(user.id, toUpdateUserProperties)
        await auditService.recordLoginActivity(user.email, LoginActivityCode.LOGIN_SUCCESS, 'Login Success', ssoProviderName)
        const loggedInUser: LoggedInUser = {
            ...user,
            name: profile.displayName || user.name,
            ssoToken: accessToken as string,
            ssoRefreshToken: refreshToken,
            permissions: permissions,
            assignedWorkspaces: assignedWorkspaces,
            isOrganizationAdmin: orgAdminUser,
            loginMode: ssoProviderName
        }
        return done(null, loggedInUser as Express.User, { message: 'Logged in Successfully' })
    }
}

export default SSOBase
