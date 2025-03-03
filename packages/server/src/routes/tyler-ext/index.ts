import express from 'express'
import tylerExtController from '../../controllers/tyler-ext'
import { checkPermission } from '../../enterprise/rbac/PermissionCheck'
const router = express.Router()

router.post('/copy-workspace-data', checkPermission('workspace:import'), tylerExtController.copyWorkspace)

router.get('/all-chatflows', checkPermission('chatflows:view'), tylerExtController.getAllChatflows)

export default router
