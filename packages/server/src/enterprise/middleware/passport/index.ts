import passport from 'passport'
import { VerifiedCallback } from 'passport-jwt'
import express, { NextFunction, Request, Response } from 'express'
import { ErrorMessage, IUser, LoggedInUser, LoginActivityCode, UserStatus } from '../../Interface.Enterprise'
import { decryptToken, encryptToken, generateSafeCopy } from '../../utils/tempTokenUtils'
import bcrypt from 'bcryptjs'
import authService from '../../services/auth'
import auditService from '../../services/audit'
import workspaceService from '../../services/workspace'
import organizationService from '../../services/organization'
import jwt, { JwtPayload, sign } from 'jsonwebtoken'
import { getAuthStrategy } from './AuthStrategy'
import { ENTERPRISE_FEATURES, IdentityManager } from '../../../IdentityManager'
import { HttpStatusCode } from 'axios'
import { InternalFlowiseError } from '../../../errors/internalFlowiseError'
import { getRunningExpressApp } from '../../../utils/getRunningExpressApp'
import session from 'express-session'

const localStrategy = require('passport-local').Strategy

const jwtAudience = process.env.JWT_AUDIENCE
const jwtIssuer = process.env.JWT_ISSUER

const expireAuthTokensOnRestart = process.env.EXPIRE_AUTH_TOKENS_ON_RESTART === 'true'
const jwtSecret = expireAuthTokensOnRestart
    ? process.env.JWT_AUTH_TOKEN_SECRET + '' + Math.round(Math.random() * 1000000)
    : process.env.JWT_AUTH_TOKEN_SECRET!
const jwtRefreshSecret = process.env.JWT_REFRESH_TOKEN_SECRET ?? process.env.JWT_AUTH_TOKEN_SECRET ?? 'refresh_token'

const jwtOptions = {
    secretOrKey: jwtSecret,
    audience: jwtAudience,
    issuer: jwtIssuer
}

const _initializePassportMiddleware = async (app: express.Application) => {
    // Configure session middleware
    app.use(
        session({
            secret: process.env.EXPRESS_SESSION_SECRET || 'flowise',
            resave: false,
            saveUninitialized: true,
            cookie: { secure: false, httpOnly: true }
        })
    )
    // Initialize Passport
    app.use(passport.initialize())
    app.use(passport.session())
    passport.serializeUser((user: any, done) => {
        done(null, user)
    })

    passport.deserializeUser((user: any, done) => {
        done(null, user)
    })
}

export const initializeJwtCookieMiddleware = async (app: express.Application, identityManager: IdentityManager) => {
    await _initializePassportMiddleware(app)

    const strategy = getAuthStrategy(identityManager, jwtOptions)
    passport.use(strategy)

    app.locals.rbacPermissions = new Map()

    const organization = await organizationService.getOrganization()
    if (organization !== null) {
        app.locals.Organization = organization
    }
    passport.use(
        'login',
        new localStrategy(
            {
                usernameField: 'email',
                passwordField: 'password',
                session: false
            },
            async (email: string, password: string, done: VerifiedCallback) => {
                try {
                    if (!email) {
                        await auditService.recordLoginActivity('<empty>', LoginActivityCode.UNKNOWN_USER, ErrorMessage.UNKNOWN_USER)
                        return done({ message: ErrorMessage.UNKNOWN_USER }, false)
                    }
                    const user = await authService.getUserByEmail(email)
                    if (!user) {
                        await auditService.recordLoginActivity(email, LoginActivityCode.UNKNOWN_USER, ErrorMessage.UNKNOWN_USER)
                        return done({ message: ErrorMessage.UNKNOWN_USER }, false)
                    }
                    if (user.status === UserStatus.DISABLED) {
                        await auditService.recordLoginActivity(user.email, LoginActivityCode.USER_DISABLED, ErrorMessage.INACTIVE_USER)
                        return done({ message: 'Login failed! Please contact your administrator.' }, false)
                    }
                    // Users with both modes enabled might have their status as ACTIVE as they have logged in via SSO
                    // but did not register using the invite link for direct login
                    // so check for presence of password
                    if (
                        user.status === UserStatus.ACTIVE &&
                        (user.credential === undefined || user.credential === null || user.credential === '')
                    ) {
                        await auditService.recordLoginActivity(
                            user.email,
                            LoginActivityCode.REGISTRATION_PENDING,
                            ErrorMessage.INVITED_USER
                        )
                        return done({ message: 'Login failed! Please contact your administrator.' }, false)
                    }
                    if (!bcrypt.compareSync(password, user.credential)) {
                        await auditService.recordLoginActivity(
                            user.email,
                            LoginActivityCode.INCORRECT_CREDENTIAL,
                            ErrorMessage.INCORRECT_PASSWORD
                        )
                        return done({ message: ErrorMessage.INCORRECT_PASSWORD }, false)
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
                            ErrorMessage.INVALID_WORKSPACE
                        )
                        return done({ message: 'Login failed! Please contact your administrator.' }, false)
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
                    await authService.updateUserLastLoginTime(user.id)
                    await auditService.recordLoginActivity(user.email, LoginActivityCode.LOGIN_SUCCESS, 'Login Success')
                    const loggedInUser: LoggedInUser = {
                        ...user,
                        permissions: permissions,
                        assignedWorkspaces: assignedWorkspaces,
                        isOrganizationAdmin: orgAdminUser
                    }
                    return done(null, loggedInUser, { message: 'Logged in Successfully' })
                } catch (error) {
                    await auditService.recordLoginActivity('<unknown>', LoginActivityCode.UNKNOWN_ERROR, ErrorMessage.UNKNOWN_ERROR)
                    return done(error)
                }
            }
        )
    )

    app.post('/api/v1/auth/resolve', async (req, res) => {
        if (identityManager.hasEnterpriseFeature(ENTERPRISE_FEATURES.AUTHORIZATION_COOKIE)) {
            // we cache the organization in the app.locals
            if (!app.locals.Organization) {
                app.locals.Organization = await organizationService.getOrganization()
            }
            if (identityManager.isEnterprise() && !identityManager.isEnterpriseLicenseValid()) {
                res.status(HttpStatusCode.Ok).json({ redirectUrl: '/license-expired' })
                return
            }
            // if the organization is not set, redirect to the organization setup page
            if (app.locals.Organization === null) {
                res.status(HttpStatusCode.Ok).json({ redirectUrl: '/organization-setup' })
            } else {
                const body: any = { redirectUrl: '/signin' }
                if (identityManager.hasEnterpriseFeature(ENTERPRISE_FEATURES.SSO_ENABLED)) {
                    body.ssoProvider = identityManager.ssoProviderName
                }
                res.status(HttpStatusCode.Ok).json(body)
            }
        } else {
            throw new InternalFlowiseError(
                500,
                'Unknown authentication provider is set. Please set the AUTHENTICATION_PROVIDER environment variable correctly.'
            )
        }
    })

    app.post('/api/v1/auth/refreshToken', async (req, res) => {
        const refreshToken = req.cookies.refreshToken
        if (!refreshToken) return res.sendStatus(401)

        jwt.verify(refreshToken, jwtRefreshSecret, async (err: any, payload: any) => {
            if (err || !payload) return res.status(403).json({ message: ErrorMessage.REFRESH_TOKEN_EXPIRED })
            const loggedInUser = req.user as LoggedInUser
            const organization = app.locals.Organization
            let isSSO = false
            let newTokenResponse: any = {}
            if (organization && loggedInUser && loggedInUser.ssoRefreshToken) {
                try {
                    newTokenResponse = await identityManager.getRefreshToken(
                        organization.ssoConfig?.providerName,
                        loggedInUser.ssoRefreshToken
                    )
                    if (newTokenResponse.error) {
                        return res.status(403).json({ message: ErrorMessage.REFRESH_TOKEN_EXPIRED })
                    }
                    isSSO = true
                } catch (error) {
                    return res.status(403).json({ message: ErrorMessage.REFRESH_TOKEN_EXPIRED })
                }
            }
            const meta = decryptToken(payload.meta)
            if (!meta) {
                return res.status(403).json({ message: ErrorMessage.REFRESH_TOKEN_EXPIRED })
            }
            const ids = meta.split(':')
            const user = {
                name: payload.username,
                id: ids[0],
                activeWorkspaceId: ids[1],
                role: ids[2]
            }
            if (isSSO) {
                loggedInUser.ssoToken = newTokenResponse.access_token
                if (newTokenResponse.refresh_token) {
                    loggedInUser.ssoRefreshToken = newTokenResponse.refresh_token
                }
                return setTokenOrCookies(res, loggedInUser, false, req, false, true)
            } else {
                return setTokenOrCookies(res, user, false, req)
            }
        })
    })

    app.post('/api/v1/auth/login', (req, res, next?) => {
        passport.authenticate('login', async (err: any, user: IUser) => {
            try {
                if (err || !user) {
                    return next ? next(err) : res.status(401).json(err)
                }
                if (identityManager.isEnterprise() && !identityManager.isEnterpriseLicenseValid()) {
                    return res.status(401).json({ redirectUrl: '/license-expired' })
                }
                req.login(user, { session: false }, async (error) => {
                    if (error) return next ? next(error) : res.status(401).json(error)
                    return setTokenOrCookies(res, user, true, req)
                })
            } catch (error) {
                return next ? next(error) : res.status(401).json(error)
            }
        })(req, res, next)
    })
}

export const setTokenOrCookies = (
    res: Response,
    user: any,
    regenerateRefreshToken: boolean,
    req?: Request,
    redirect?: boolean,
    isSSO?: boolean
) => {
    const token = generateJwtAuthToken(user)
    let refreshToken: string = ''
    if (regenerateRefreshToken) {
        refreshToken = generateJwtRefreshToken(user)
    } else {
        refreshToken = req?.cookies?.refreshToken
    }
    const returnUser = generateSafeCopy(user)
    const identityManager = getRunningExpressApp().identityManager
    returnUser.isOrganizationAdmin = user.id === getRunningExpressApp().app.locals.Organization?.adminUserId
    returnUser.isSSO = !isSSO ? false : isSSO
    if (redirect) {
        // Send user data as part of the redirect URL (using query parameters)
        const dashboardUrl = `/sso-success?user=${encodeURIComponent(JSON.stringify(returnUser))}`
        // Return the token as a cookie in our response.
        let resWithCookies = res.cookie('token', token, { httpOnly: true, secure: false }).cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: false
        })
        resWithCookies.redirect(dashboardUrl)
    } else if (identityManager.hasEnterpriseFeature(ENTERPRISE_FEATURES.AUTHORIZATION_COOKIE)) {
        // Return the token as a cookie in our response.
        res.cookie('token', token, { httpOnly: true, secure: false })
            .cookie('refreshToken', refreshToken, { httpOnly: true, secure: false })
            .type('json')
            .send({ ...returnUser })
    }
}

export const generateJwtAuthToken = (user: any) => {
    let expiryInMinutes = -1
    if (user.ssoToken) {
        const jwtHeader = jwt.decode(user.ssoToken, { complete: true })
        if (jwtHeader) {
            const utcSeconds = (jwtHeader.payload as any).exp
            let d = new Date(0) // The 0 there is the key, which sets the date to the epoch
            d.setUTCSeconds(utcSeconds)
            // get the minutes difference from current time
            expiryInMinutes = Math.abs(d.getTime() - new Date().getTime()) / 60000
        }
    }
    if (expiryInMinutes === -1) {
        expiryInMinutes = process.env.JWT_TOKEN_EXPIRY_IN_MINUTES ? parseInt(process.env.JWT_TOKEN_EXPIRY_IN_MINUTES) : 60
    }
    return _generateJwtToken(user, expiryInMinutes, jwtSecret)
}

export const generateJwtRefreshToken = (user: any) => {
    let expiryInMinutes = -1
    if (user.ssoRefreshToken) {
        const jwtHeader = jwt.decode(user.ssoRefreshToken, { complete: false })
        if (jwtHeader && typeof jwtHeader !== 'string') {
            const utcSeconds = (jwtHeader as JwtPayload).exp
            if (utcSeconds) {
                let d = new Date(0) // The 0 there is the key, which sets the date to the epoch
                d.setUTCSeconds(utcSeconds)
                // get the minutes difference from current time
                expiryInMinutes = Math.abs(d.getTime() - new Date().getTime()) / 60000
            }
        }
    }
    if (expiryInMinutes === -1) {
        expiryInMinutes = process.env.JWT_REFRESH_TOKEN_EXPIRY_IN_MINUTES
            ? parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRY_IN_MINUTES)
            : 10080 // 7 days
    }
    return _generateJwtToken(user, expiryInMinutes, jwtRefreshSecret)
}

const _generateJwtToken = (user: IUser, expiryInMinutes: number, secret: string) => {
    const loginMode = user.loginMode ?? 'Email/Password'
    const encryptedUserInfo = encryptToken(user.id + ':' + user.activeWorkspaceId + ':' + user.role + ':' + loginMode)
    return sign({ id: user.id, username: user.name, meta: encryptedUserInfo }, secret!, {
        expiresIn: expiryInMinutes + 'm', // Expiry in minutes
        notBefore: '0', // Cannot use before now, can be configured to be deferred.
        algorithm: 'HS256', // HMAC using SHA-256 hash algorithm
        audience: jwtAudience, // The audience of the token
        issuer: jwtIssuer // The issuer of the token
    })
}

export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('jwt', { session: false }, (err: any, user: IUser, info: object) => {
        if (err) {
            return next(err)
        }

        // @ts-ignore
        if (info && info.name === 'TokenExpiredError') {
            if (req.cookies && req.cookies.refreshToken) {
                return res.status(401).json({ message: ErrorMessage.TOKEN_EXPIRED, retry: true })
            }
            return res.status(401).json({ message: ErrorMessage.INVALID_MISSING_TOKEN })
        }

        if (!user) {
            return res.status(401).json({ message: ErrorMessage.INVALID_MISSING_TOKEN })
        }

        const identityManager = getRunningExpressApp().identityManager
        if (identityManager.isEnterprise() && !identityManager.isEnterpriseLicenseValid()) {
            return res.status(401).json({ redirectUrl: '/license-expired' })
        }

        req.user = user
        next()
    })(req, res, next)
}
