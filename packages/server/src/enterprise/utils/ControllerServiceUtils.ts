import { Equal } from 'typeorm'
import { Request } from 'express'

export const getWorkspaceSearchOptions = (workspaceId?: string) => {
    // TODO: Remove the check for enterprise as this will apply to all users for horizontal design
    if (process.env.FLOWISE_EE_LICENSE_KEY) {
        return workspaceId ? { workspaceId: Equal(workspaceId) } : {}
    } else {
        return {}
    }
}

export const getWorkspaceSearchOptionsFromReq = (req: Request) => {
    // TODO: Remove the check for enterprise as this will apply to all users for horizontal design
    if (process.env.FLOWISE_EE_LICENSE_KEY) {
        const workspaceId = req.user?.activeWorkspaceId
        return workspaceId ? { workspaceId: Equal(workspaceId) } : {}
    } else {
        return {}
    }
}
