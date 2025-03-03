import express from 'express'
import accountController from '../../controllers/account'
const router = express.Router()

// READ
router.get('/', accountController.getAccountData)
router.get(['/', '/billing'], accountController.createStripeCustomerPortalSession)
router.get(['/', '/logout'], accountController.logout)

// UPDATE
router.post(['/', '/org'], accountController.updateOrgData)
router.post(['/', '/profile'], accountController.updateProfileData)
router.post(['/', '/password'], accountController.updatePassword)

export default router
