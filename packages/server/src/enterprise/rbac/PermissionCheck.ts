import { NextFunction, Request, Response } from 'express'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { ErrorMessage } from '../Interface.Enterprise'

// Check if the user has the required permission for a route
export const checkPermission = (permission: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const server = getRunningExpressApp()
        if (!server.identityManager.isEnterprise()) {
            return next()
        }
        const user = req.user
        // if the user is not logged in, return forbidden
        if (!user) {
            return res.status(403).json({ message: ErrorMessage.UNKNOWN_USER })
        }
        if (user.isApiKeyValidated) {
            return next()
        }
        if (user.id === server.app.locals.Organization?.adminUserId) {
            return next()
        }
        const permissions = server.app.locals.rbacPermissions.get(user.role)
        if (permissions && permissions.includes(permission)) {
            return next()
        }
        // else throw 403 forbidden error
        return res.status(403).json({ message: ErrorMessage.FORBIDDEN })
    }
}

// checks for any permission, input is the permissions separated by comma
export const checkAnyPermission = (permissionsString: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const server = getRunningExpressApp()
        if (!server.identityManager.isEnterprise()) {
            return next()
        }
        const user = req.user
        // if the user is not logged in, return forbidden
        if (!user) {
            return res.status(403).json({ message: ErrorMessage.UNKNOWN_USER })
        }
        if (user.isApiKeyValidated) {
            return next()
        }
        if (user.id === server.app.locals.Organization?.adminUserId) {
            return next()
        }
        const permissions = server.app.locals.rbacPermissions.get(user.role)
        const permissionIds = permissionsString.split(',')
        if (permissions && permissions.length) {
            // split permissions and check if any of the permissions are present in the user's permissions
            for (let i = 0; i < permissionIds.length; i++) {
                if (permissions.includes(permissionIds[i])) {
                    return next()
                }
            }
        }
        // else throw 403 forbidden error
        return res.status(403).json({ message: ErrorMessage.FORBIDDEN })
    }
}
