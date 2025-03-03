import { z } from 'zod'

export enum UserStatus {
    INVITED = 'invited',
    DISABLED = 'disabled',
    ACTIVE = 'active'
}

export class IRole {
    id: string
    name: string
    description: string
    permissions: string // string[] stored as comma separated values
}

export class IUser {
    id: string
    email: string
    name: string
    credential: string
    status: UserStatus
    tempToken: string
    tokenExpiry?: Date
    role: string
    lastLogin: Date
    activeWorkspaceId: string
    isApiKeyValidated?: boolean
    loginMode?: string
}

export interface IWorkspace {
    id: string
    name: string
    description: string
    createdDate: Date
    updatedDate: Date
    organizationId: string
    isLive?: Boolean
    liveWorkspaceId?: string
}

export enum OrganizationType {
    ENTERPRISE = 'enterprise'
}

export interface IOrganization {
    id: string
    name: string
    adminUserId: string
    defaultWsId: string
    organizationType?: string
    createdDate: Date
    updatedDate: Date
    ssoConfig?: string
}

export interface IWorkspaceUser {
    id: string
    workspaceId: string
    userId: string
    role: string
}

export interface IWorkspaceShared {
    id: string
    workspaceId: string
    sharedItemId: string
    itemType: string
    createdDate: Date
    updatedDate: Date
}

export interface IWorkspaceReturnValues extends IWorkspace {
    users: {
        id: string
        name: string
        email: string
        role: string
        isOrgOwner: boolean
    }[]
}

export interface ILoginActivity {
    id: string
    username: string
    activityCode: number
    message: string
    loginMode: string
    attemptedDateTime: Date
}

export enum LoginActivityCode {
    LOGIN_SUCCESS = 0,
    LOGOUT_SUCCESS = 1,
    UNKNOWN_USER = -1,
    INCORRECT_CREDENTIAL = -2,
    USER_DISABLED = -3,
    NO_ASSIGNED_WORKSPACE = -4,
    INVALID_LOGIN_MODE = -5,
    REGISTRATION_PENDING = -6,
    UNKNOWN_ERROR = -99
}

export interface IUserWithAssignedWorkspaces {
    id: string
    name: string
    email: string
    status: UserStatus
    activeWorkspaceId: string
    lastLogin: Date
    isOrgOwner: boolean
    assignedRoles: {
        role: string
        active: boolean
        workspace: string
    }[]
}

export interface IWorkspaceWithAssignedUsers {
    id: string
    name: string
    description: string
    createdDate: Date
    updatedDate: Date
    userCount: number
    organizationId: string
    isOrgDefault: boolean
    assignedUsers: {
        user: string
        email: string
        role: string
        isOrgOwner: boolean
    }[]
}

export type IAssignedWorkspace = { id: string; name: string; role: string }
export type LoggedInUser = Partial<IUser> & {
    isOrganizationAdmin: boolean
    assignedWorkspaces: IAssignedWorkspace[]
    permissions?: string[]
    ssoToken?: string
    ssoRefreshToken?: string
    loginMode?: string
}

export enum ErrorMessage {
    INVALID_MISSING_TOKEN = 'Invalid or Missing token',
    TOKEN_EXPIRED = 'Token Expired',
    REFRESH_TOKEN_EXPIRED = 'Refresh Token Expired',
    FORBIDDEN = 'Forbidden',
    UNKNOWN_USER = 'Unknown Username or Password',
    INCORRECT_PASSWORD = 'Incorrect Password',
    INACTIVE_USER = 'Inactive User',
    INVITED_USER = 'User Invited, but has not registered',
    INVALID_WORKSPACE = 'No Workspace Assigned',
    UNKNOWN_ERROR = 'Unknown Error'
}

// IMPORTANT: update the schema on the client side as well
// packages/ui/src/views/organization/index.jsx
export const OrgSetupSchema = z
    .object({
        orgName: z.string().min(1, 'Organization name is required'),
        username: z.string().min(1, 'Name is required'),
        email: z.string().min(1, 'Email is required').email('Invalid email address'),
        password: z
            .string()
            .min(8, 'Password must be at least 8 characters')
            .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
            .regex(/[!@#$%^&*]/, 'Password must contain at least one special character'),
        confirmPassword: z.string().min(1, 'Confirm Password is required')
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ['confirmPassword']
    })

// IMPORTANT: when updating this schema, update the schema on the server as well
// packages/ui/src/views/auth/register.jsx
export const RegisterUserSchema = z
    .object({
        username: z.string().min(1, 'Name is required'),
        email: z.string().min(1, 'Email is required').email('Invalid email address'),
        password: z
            .string()
            .min(8, 'Password must be at least 8 characters')
            .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
            .regex(/[!@#$%^&*]/, 'Password must contain at least one special character'),
        confirmPassword: z.string().min(1, 'Confirm Password is required'),
        token: z.string().min(1, 'Invite Code is required')
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ['confirmPassword']
    })
