import { NextFunction, Request, Response } from 'express'
import { InternalFlowiseError } from '../../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import authService from '../../services/auth'
import { User } from '../../database/entities/EnterpriseEntities'
import { RegisterUserSchema, UserStatus } from '../../Interface.Enterprise'
import { generateSafeCopy } from '../../utils/tempTokenUtils'
import bcrypt from 'bcryptjs'
import { getRunningExpressApp } from '../../../utils/getRunningExpressApp'

const logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (req.user) {
            await authService.logoutUser(req.user)
            if (req.isAuthenticated()) {
                req.logout((err) => {
                    if (err) {
                        return res.status(500).json({ message: 'Logout failed' })
                    }
                    req.session.destroy((err) => {
                        if (err) {
                            return res.status(500).json({ message: 'Failed to destroy session' })
                        }
                    })
                })
            } else {
                // For JWT-based users (owner, org_admin)
                res.clearCookie('connect.sid') // Clear the session cookie
                res.clearCookie('token') // Clear the JWT cookie
                res.clearCookie('refreshToken') // Clear the JWT cookie
                return res.redirect('/login') // Redirect to the login page
            }
        }
        return res.status(200).json({ message: 'logged_out', redirectTo: `/login` })
    } catch (error) {
        next(error)
    }
}

const updateDetails = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'Error: authService.updateUser - id not provided!')
        }
        if (typeof req.body === 'undefined') {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'Error: authService.updateUser - body not provided!')
        }
        const user = await authService.getUserById(req.params.id)
        if (!user) {
            throw new InternalFlowiseError(StatusCodes.NOT_FOUND, `User ${req.params.id} not found`)
        }
        const body = req.body
        if (body.oldPassword) {
            if (!bcrypt.compareSync(body.oldPassword, user.credential)) {
                throw new InternalFlowiseError(StatusCodes.EXPECTATION_FAILED, 'Existing password is incorrect')
            }
        }
        const updatedUser = new User()
        Object.assign(updatedUser, body)
        if (body.updatedPassword) {
            updatedUser.credential = body.updatedPassword
        }
        const apiResponse = await authService.updateUser(user, updatedUser)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const createUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body === 'undefined') {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: authService.createUser - body not provided!`)
        }
        const body = req.body
        const newUser = new User()
        Object.assign(newUser, body)
        const apiResponse = await authService.createUser(newUser)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const inviteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body === 'undefined') {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: authService.inviteUser - body not provided!`)
        }
        const body = req.body
        const newUser = new User()
        Object.assign(newUser, body)
        newUser.status = UserStatus.INVITED
        const apiResponse = await authService.inviteUser(newUser)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'Error: authService.deleteUser - id not provided!')
        }
        const apiResponse = await authService.deleteUser(req.params.id)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse: any[] = await authService.getAllUsers()
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const findUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body === 'undefined') {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: authService.findUsers - body not provided!`)
        }
        const searchString = req.body.searchTerm
        const apiResponse = await authService.findUsers(searchString)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getUserById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'Error: authService.updateUser - id not provided!')
        }
        const user: any = await authService.getUserById(req.params.id)
        if (!user) {
            return res.status(404).send(`User ${req.params.id} not found in the database`)
        }
        return res.json(generateSafeCopy(user, false))
    } catch (error) {
        next(error)
    }
}

const getUserByEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.email) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'Error: authService.updateUser - id not provided!')
        }
        const user = await authService.getUserByEmail(req.params.email)
        if (!user) {
            return res.status(404).send(`User ${req.params.email} not found in the database`)
        }
        return res.json(user)
    } catch (error) {
        next(error)
    }
}

const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.body?.email) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'Error: authService.forgotPassword - email not provided!')
        }
        const apiResponse = await authService.forgotPassword(req.body.email)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const resetCurrentPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body === 'undefined' || !req.body?.email || !req.body?.token || !req.body?.updatedPassword) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'Error: authService.resetCurrentPassword - incomplete data!')
        }
        const apiResponse = await authService.resetCurrentPassword(req.body)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const updateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'Error: authService.updateUser - id not provided!')
        }
        if (typeof req.body === 'undefined') {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'Error: authService.updateUser - body not provided!')
        }
        const user = await authService.getUserById(req.params.id)
        if (!user) {
            return res.status(404).send(`User ${req.params.id} not found in the database`)
        }
        const body = req.body
        const updatedUser = new User()
        Object.assign(updatedUser, body)
        const apiResponse = await authService.updateUser(user, updatedUser)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const updateUserRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'Error: authService.updateUserRole - id not provided!')
        }
        if (typeof req.body === 'undefined' || !req.body.role) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'Error: authService.updateUserRole - body not provided!')
        }

        const user = await authService.getUserById(req.params.id)
        if (!user) {
            return res.status(404).send(`User ${req.params.id} not found in the database`)
        }

        await authService.updateUserRole(req.params.id, req.body.role)

        return res.json({ message: 'User role updated successfully' })
    } catch (error) {
        next(error)
    }
}

const registerUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body === 'undefined') {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'Error: authService.registerUser - body not provided!')
        }
        const body = req.body

        const result = RegisterUserSchema.safeParse({
            username: body.username,
            email: body.email,
            password: body.password,
            confirmPassword: body.confirmPassword,
            token: body.token
        })
        if (!result.success) {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, result.error.message)
        }

        const apiResponse = await authService.registerUser(body)
        if (apiResponse !== 'OK') {
            throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, 'Error: authService.registerUser - error registering user!')
        }
        const loginDetails = {
            message: 'User Registered Successfully! Please login to continue.'
        }
        return res.json(loginDetails)
    } catch (error) {
        next(error)
    }
}

const createRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body === 'undefined') {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'Error: authService.createRole - body not provided!')
        }
        const currentRole = await authService.getRoleByName(req.body.name)
        if (currentRole) {
            return res.status(StatusCodes.NOT_ACCEPTABLE).json('Role already exists with the same name!')
        }

        const body = req.body
        if (body.permissions) {
            body.permissions = body.permissions.join(',')
        }
        const apiResponse = await authService.createRole(body)
        if (apiResponse) {
            ;(apiResponse as any).permissions = apiResponse.permissions.split(',')
        }
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const updateRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'Error: authService.updateRole - id not provided!')
        }
        if (typeof req.body === 'undefined') {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'Error: authService.updateRole - body not provided!')
        }
        const body = req.body
        if (body.name) {
            delete body.name
        }
        if (body.permissions) {
            body.permissions = body.permissions.join(',')
        }
        const apiResponse = await authService.updateRole(req.params.id, body)
        if (apiResponse) {
            ;(apiResponse as any).permissions = apiResponse.permissions.split(',')
        }
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const deleteRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'Error: authService.updateRole - id not provided!')
        }
        const apiResponse = await authService.deleteRole(req.params.id)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getRoleByName = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.name) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, 'Error: authService.getRoleByName - name not provided!')
        }
        const apiResponse = await authService.getRoleByName(req.params.name)
        if (apiResponse) {
            ;(apiResponse as any).permissions = apiResponse.permissions.split(',')
        }
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getAllRoles = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const apiResponse = await authService.getAllRoles()
        if (apiResponse && apiResponse.length > 0) {
            for (const role of apiResponse) {
                if (role.permissions) {
                    ;(role as any).permissions = role.permissions.split(',')
                }
            }
        }
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getAllPermissions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const appServer = getRunningExpressApp()
        return res.json(appServer.identityManager.getPermissions())
    } catch (error) {
        next(error)
    }
}

export default {
    logout,
    updateDetails,
    createUser,
    deleteUser,
    inviteUser,
    getAllUsers,
    updateUser,
    updateUserRole,
    getUserById,
    getUserByEmail,
    registerUser,
    findUsers,
    forgotPassword,
    resetCurrentPassword,
    createRole,
    updateRole,
    getRoleByName,
    getAllRoles,
    deleteRole,
    getAllPermissions
}
