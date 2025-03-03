import express from 'express'
import authController from '../../controllers/auth'
const router = express.Router()

router.post(['/', '/logout'], authController.logout)

// user management
router.get(['/', '/users'], authController.getAllUsers)
router.get(['/', '/users/:id'], authController.getUserById)
router.delete(['/', '/users/:id'], authController.deleteUser)

router.post(['/', '/users'], authController.createUser)
router.post(['/', '/users/invite'], authController.inviteUser)
router.post(['/', '/users/register'], authController.registerUser)

router.put(['/', '/users/:id'], authController.updateUser)
router.put(['/', '/update-user-role/:id'], authController.updateUserRole)

// UPDATE
router.put(['/', '/users/:id/details'], authController.updateDetails)
router.post(['/', '/users-search'], authController.findUsers)
router.post(['/', '/password-token'], authController.forgotPassword)
router.post(['/', '/password-reset'], authController.resetCurrentPassword)

// ROLES
router.get(['/', '/roles'], authController.getAllRoles)
router.post(['/', '/roles'], authController.createRole)
router.put(['/', '/roles/:id'], authController.updateRole)
router.get(['/', '/roles/name/:name'], authController.getRoleByName)
router.delete(['/', '/roles/:id'], authController.deleteRole)

// RBAC
router.get(['/', '/permissions'], authController.getAllPermissions)
export default router
