import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import {
    ILoginActivity,
    IOrganization,
    IRole,
    IUser,
    IWorkspace,
    IWorkspaceShared,
    IWorkspaceUser,
    UserStatus
} from '../../Interface.Enterprise'

@Entity()
export class User implements IUser {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'text' })
    email: string

    @Column({ type: 'text' })
    name: string

    @Column({ type: 'text' })
    credential: string

    @Column({ type: 'text' })
    status: UserStatus

    @Column({ type: 'text' })
    tempToken: string

    @Column({ type: 'timestamp', nullable: true })
    @CreateDateColumn()
    tokenExpiry?: Date

    @Column({ type: 'text' })
    role: string // JSON String

    @Column({ type: 'text' })
    activeWorkspaceId: string

    @Column({ type: 'timestamp' })
    @CreateDateColumn()
    lastLogin: Date
}

@Entity()
export class Workspace implements IWorkspace {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'text' })
    name: string

    @Column({ type: 'text' })
    description: string

    @Column({ type: 'timestamp' })
    @UpdateDateColumn()
    createdDate: Date

    @Column({ type: 'timestamp' })
    @UpdateDateColumn()
    updatedDate: Date

    @Column({ type: 'text' })
    organizationId: string

    @Column({ type: 'text' })
    isLive?: Boolean

    @Column({ type: 'text' })
    liveWorkspaceId?: string
}

@Entity('workspace_users')
export class WorkspaceUsers implements IWorkspaceUser {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'text' })
    workspaceId: string

    @Column({ type: 'text' })
    userId: string

    @Column({ type: 'text' })
    role: string
}

@Entity('workspace_shared')
export class WorkspaceShared implements IWorkspaceShared {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'text' })
    workspaceId: string

    @Column({ type: 'text' })
    sharedItemId: string

    @Column({ type: 'text', name: 'itemType' })
    itemType: string

    @Column({ type: 'timestamp' })
    @UpdateDateColumn()
    createdDate: Date

    @Column({ type: 'timestamp' })
    @UpdateDateColumn()
    updatedDate: Date
}

@Entity('login_activity')
export class LoginActivity implements ILoginActivity {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'text' })
    username: string

    @Column({ name: 'activity_code' })
    activityCode: number

    @Column({ name: 'login_mode' })
    loginMode: string

    @Column({ type: 'text' })
    message: string

    @Column({ type: 'timestamp' })
    @UpdateDateColumn()
    attemptedDateTime: Date
}

@Entity('roles')
export class Role implements IRole {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'text' })
    name: string

    @Column({ type: 'text' })
    description: string

    @Column({ type: 'text' })
    permissions: string
}

@Entity('organization')
export class Organization implements IOrganization {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'text' })
    name: string

    @Column({ type: 'text' })
    adminUserId: string // owner user id

    @Column({ type: 'text', name: 'defaultWsId' })
    defaultWsId: string // default Workspace

    @Column({ type: 'text', name: 'organization_type' })
    organizationType?: string

    @Column({ type: 'timestamp' })
    @UpdateDateColumn()
    createdDate: Date

    @Column({ type: 'timestamp' })
    @UpdateDateColumn()
    updatedDate: Date

    @Column({ type: 'text', name: 'sso_config' })
    ssoConfig?: string
}
