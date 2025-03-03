import { useSelector } from 'react-redux'
import { useConfig } from '@/store/context/ConfigContext'

export const useAuth = () => {
    const { isEnterpriseLicensed, isCloud } = useConfig()
    const permissions = useSelector((state) => state.auth.permissions)
    const isGlobal = useSelector((state) => state.auth.isGlobal)
    const currentUser = useSelector((state) => state.auth.user)

    const hasPermission = (permissionId) => {
        if (!isEnterpriseLicensed || isGlobal) {
            return true
        }
        if (!permissionId) return false
        const permissionIds = permissionId.split(',')
        if (permissions && permissions.length) {
            return permissionIds.some((permissionId) => permissions.includes(permissionId))
        }
        return false
    }

    const hasAssignedWorkspace = (workspaceId) => {
        if (!isEnterpriseLicensed || isGlobal) {
            return true
        }
        const assignedWorkspaces = currentUser?.assignedWorkspaces || []
        if (assignedWorkspaces.length) {
            return assignedWorkspaces.some((workspace) => workspace.id === workspaceId)
        }
        return false
    }

    const hasDisplay = (display) => {
        if (!display) {
            return true
        }
        if (isCloud && display.includes('cloud')) {
            return true
        } else if (isEnterpriseLicensed && display.includes('enterprise')) {
            return true
        }
        return false
    }

    return { hasPermission, hasAssignedWorkspace, hasDisplay }
}
