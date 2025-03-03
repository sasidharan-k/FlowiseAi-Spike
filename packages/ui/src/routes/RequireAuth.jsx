import { Navigate } from 'react-router'
import PropTypes from 'prop-types'
import { useLocation } from 'react-router-dom'
import { useConfig } from '@/store/context/ConfigContext'
import AuthUtils from '@/utils/authUtils'
import { useAuth } from '@/hooks/useAuth'

export const RequireAuth = ({ permission, display, children }) => {
    const location = useLocation()
    const { isCloud, isOpenSource, isEnterpriseLicensed } = useConfig()
    const { hasPermission } = useAuth()

    // For Open Source Users, only display items that doesn't have 'display' property
    if (isOpenSource) {
        if (!display) return children
        return <Navigate to='/unauthorized' replace />
    }

    // For Cloud Users, only display items that doesn't have 'display' property OR has 'cloud' in display property
    else if (isCloud) {
        if (!display) return children
        if (display.includes('cloud')) {
            return children
        }
        return <Navigate to='/unauthorized' replace />
    }

    // For Enterprise Users, only display items that doesn't have 'display' property OR has 'enterprise' in display property
    else if (isEnterpriseLicensed) {
        // check if user is logged in
        const currentUser = AuthUtils.getCurrentUser()
        if (!currentUser) {
            // Route to resolved login page to redirect to org setup page if no owner exists
            return <Navigate to='/login' replace />
        }

        // check if user is admin
        const isUserAdmin = AuthUtils.isUserAdmin()
        if (isUserAdmin) {
            if (!display) return children
            if (display.includes('enterprise')) {
                return children
            }
        }

        // check if user has permission
        const userPermissions = AuthUtils.getRolePermissions()
        if (userPermissions.length === 0) {
            return <Navigate to='/unauthorized' replace state={{ path: location.pathname }} />
        }

        if (!permission || hasPermission(permission)) {
            if (!display) return children
            if (display.includes('enterprise')) {
                return children
            }
        }

        return <Navigate to='/unauthorized' replace state={{ path: location.pathname }} />
    }

    return children
}

RequireAuth.propTypes = {
    permission: PropTypes.string,
    display: PropTypes.array,
    children: PropTypes.element
}
