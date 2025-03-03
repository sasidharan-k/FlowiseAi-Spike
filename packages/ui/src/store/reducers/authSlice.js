// authSlice.js
import { createSlice } from '@reduxjs/toolkit'
import AuthUtils from '@/utils/authUtils'

const initialState = {
    user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null,
    isAuthenticated: 'true' === localStorage.getItem('isAuthenticated'),
    isGlobal: 'true' === localStorage.getItem('isGlobal'),
    token: null,
    permissions:
        localStorage.getItem('permissions') && localStorage.getItem('permissions') !== 'undefined'
            ? JSON.parse(localStorage.getItem('permissions'))
            : null
}

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        loginSuccess: (state, action) => {
            state.token = action.payload.token
            state.permissions = action.payload.permissions
            const user = _extractUser(action.payload)
            state.user = user
            state.isAuthenticated = true
            state.isGlobal = user.isOrganizationAdmin
            localStorage.setItem('isAuthenticated', 'true')
            localStorage.setItem('isGlobal', state.isGlobal)
            localStorage.setItem('isSSO', state.user.isSSO)
            localStorage.setItem('user', JSON.stringify(user))
            localStorage.setItem('permissions', JSON.stringify(action.payload.permissions))
        },
        logoutSuccess: (state) => {
            state.user = null
            state.token = null
            state.permissions = null
            state.isAuthenticated = false
            AuthUtils.removeCurrentUser()
        },
        workspaceSwitchSuccess: (state, action) => {
            state.token = action.payload.token
            state.permissions = action.payload.permissions
            const user = _extractUser(action.payload)
            state.user = user
            state.isAuthenticated = true
            state.isGlobal = user.isOrganizationAdmin
            localStorage.setItem('isAuthenticated', 'true')
            localStorage.setItem('isGlobal', state.isGlobal)
            localStorage.setItem('isSSO', state.user.isSSO)
            localStorage.setItem('user', JSON.stringify(user))
            localStorage.setItem('permissions', JSON.stringify(action.payload.permissions))
        },
        userProfileUpdated: (state, action) => {
            const user = _extractUser(action.payload)
            // only update the name
            state.user.name = user.name
            AuthUtils.updateCurrentUser(state.user)
        },
        workspacesUpdated: (state, action) => {
            const workspaces = action.payload
            state.user.assignedWorkspaces = workspaces
            AuthUtils.updateCurrentUser(state.user)
        }
    }
})

const _extractUser = (payload) => {
    const user = {
        id: payload.id,
        email: payload.email,
        name: payload.name,
        status: payload.status,
        role: payload.role,
        isSSO: payload.isSSO,
        activeWorkspaceId: payload.activeWorkspaceId,
        lastLogin: payload.lastLogin,
        isOrganizationAdmin: payload.isOrganizationAdmin,
        assignedWorkspaces: payload.assignedWorkspaces
    }
    return user
}

export const { loginSuccess, logoutSuccess, workspaceSwitchSuccess, userProfileUpdated, workspacesUpdated } = authSlice.actions
export default authSlice.reducer
