import express from 'express'
import organizationController from '../../controllers/organization'
const router = express.Router()

router.post(['/', '/register'], organizationController.registerOrganization)

export default router
