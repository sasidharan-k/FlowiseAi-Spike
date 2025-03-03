import express from 'express'
import workspaceController from '../../controllers/workspace'
const router = express.Router()

// get all Workspaces
router.get('/', workspaceController.getAllWorkspaces)
router.get('/assigned-workspaces', workspaceController.getAssignedWorkspacesForUser)

// get new Workspace
router.get(['/', '/:id'], workspaceController.getWorkspaceById)
router.get(['/details', '/details/:id'], workspaceController.getWorkspaceWithContentsById)
router.get(['/shared', '/shared/:id'], workspaceController.getSharedWorkspacesForItem)
router.post(['/shared', '/shared/:id'], workspaceController.setSharedWorkspacesForItem)

router.post(['/unlink-users', '/unlink-users/:id'], workspaceController.unlinkUsersFromWorkspace)
router.post(['/link-users', '/link-users/:id'], workspaceController.linkUsersToWorkspace)
router.post(['/switch', '/switch/:id'], workspaceController.switchWorkspace)

// Create new Workspace
router.post(['/', '/:id'], workspaceController.createWorkspace)

// Update Workspace
router.put(['', '/:id'], workspaceController.updateWorkspace)

// Delete Workspace via id
router.delete(['/', '/:id'], workspaceController.deleteWorkspace)

export default router
