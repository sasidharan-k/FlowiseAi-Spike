import express from 'express'
import ssoController from '../../controllers/sso'
const router = express.Router()

router.get(['/', '/providers'], ssoController.getSSOProviders)
router.get(['/', '/config'], ssoController.getSSOConfig)
router.post(['/', '/config'], ssoController.updateSSOConfig)
router.post(['/', '/test'], ssoController.testSSOConfig)
export default router
