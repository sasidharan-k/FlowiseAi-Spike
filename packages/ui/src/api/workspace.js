import client from './client'

const getAllWorkspaces = () => client.get('/workspace')
const getAssignedWorkspacesForUser = () => client.get('/workspace/assigned-workspaces')

const getWorkspace = (id) => client.get(`/workspace/${id}`)
const getWorkspaceUsers = (id) => client.get(`/workspace/details/${id}`)

const unlinkUsers = (id, body) => client.post(`/workspace/unlink-users/${id}`, body)
const linkUsers = (id, body) => client.post(`/workspace/link-users/${id}`, body)

const switchWorkspace = (id, body) => client.post(`/workspace/switch/${id}`, body)

const createWorkspace = (body) => client.post(`/workspace`, body)
const updateWorkspace = (id, body) => client.put(`/workspace/${id}`, body)
const deleteWorkspace = (id) => client.delete(`/workspace/${id}`)

const getSharedWorkspacesForItem = (id) => client.get(`/workspace/shared/${id}`)
const setSharedWorkspacesForItem = (id, body) => client.post(`/workspace/shared/${id}`, body)

export default {
    getAllWorkspaces,
    getAssignedWorkspacesForUser,
    getWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    getWorkspaceUsers,
    unlinkUsers,
    linkUsers,
    switchWorkspace,
    getSharedWorkspacesForItem,
    setSharedWorkspacesForItem
}
