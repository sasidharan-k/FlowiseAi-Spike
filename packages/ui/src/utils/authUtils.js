const getRolePermissions = () => {
    if (!localStorage.getItem('permissions')) return []
    if (localStorage.getItem('permissions') === 'undefined') return []
    return JSON.parse(localStorage.getItem('permissions'))
}

const getCurrentUser = () => {
    if (!localStorage.getItem('user') || localStorage.getItem('user') === 'undefined') return undefined
    return JSON.parse(localStorage.getItem('user'))
}

const updateRolePermissions = (permissions) => {
    localStorage.setItem('permissions', JSON.stringify(permissions))
}

const updateCurrentUser = (user) => {
    let stringifiedUser = user
    if (typeof user === 'object') {
        stringifiedUser = JSON.stringify(user)
    }
    localStorage.setItem('user', stringifiedUser)
}

const isUserAdmin = () => {
    const user = getCurrentUser()
    // this takes care of the case where the multiuser is not enabled, open source version
    if (!user) return true
    return user && user.role?.indexOf('admin') > -1
}

const removeCurrentUser = () => {
    _removeFromStorage()
    clearAllCookies()
}

const _removeFromStorage = () => {
    localStorage.removeItem('isAuthenticated')
    localStorage.removeItem('isGlobal')
    localStorage.removeItem('user')
    localStorage.removeItem('permissions')
    localStorage.removeItem('isSSO')
}

const clearAllCookies = () => {
    document.cookie.split(';').forEach((cookie) => {
        const name = cookie.split('=')[0].trim()
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`
    })
}

const AuthUtils = {
    getCurrentUser,
    updateCurrentUser,
    removeCurrentUser,
    isUserAdmin,
    updateRolePermissions,
    getRolePermissions
}

export default AuthUtils
