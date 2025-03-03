import client from './client'

// auth
const logout = (body) => client.post('/auth/logout', body)
const resolveLogin = (body) => client.post(`/auth/resolve`, body)
const login = (body) => client.post(`/auth/login`, body)
const forgetPassword = (body) => client.post(`/auth/password-token`, body)
const resetPassword = (body) => client.post(`/auth/password-reset`, body)

// users
const inviteUser = (body) => client.post(`/auth/users/invite`, body)
const registerUser = (body) => client.post(`/auth/users/register`, body)
const findUsers = (body) => client.post(`/auth/users-search`, body)
const updateUser = (id, body) => client.put(`/auth/users/${id}`, body)
const updateDetails = (id, body) => client.put(`/auth/users/${id}/details`, body)
const deleteUser = (id) => client.delete(`/auth/users/${id}`)
const getAllUsers = () => client.get(`/auth/users`)
const getUserById = (id) => client.get(`/auth/users/${id}`)

// roles
const getAllRoles = () => client.get(`/auth/roles`)
const getRoleById = (id) => client.get(`/auth/roles/${id}`)
const createRole = (body) => client.post(`/auth/roles`, body)
const updateRole = (id, body) => client.put(`/auth/roles/${id}`, body)
const getRoleByName = (name) => client.get(`/auth/roles/name/${name}`)
const deleteRole = (id) => client.delete(`/auth/roles/${id}`)

// permissions
const getAllPermissions = () => client.get(`/auth/permissions`)

// organizations
const registerOrganization = (body) => client.post(`/organizations/register`, body)

export default {
    resolveLogin,
    logout,
    login,
    updateDetails,
    getAllUsers,
    inviteUser,
    registerUser,
    updateUser,
    deleteUser,
    findUsers,
    getUserById,
    forgetPassword,
    resetPassword,
    getAllRoles,
    getRoleById,
    createRole,
    updateRole,
    getRoleByName,
    deleteRole,
    getAllPermissions,
    registerOrganization
}
