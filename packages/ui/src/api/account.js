import client from './client'

const getAccountData = () => client.get('/account')

const getBillingData = () => client.get('/account/billing')

const updateOrgData = (body) => client.post(`/account/org`, body)

const updateProfileData = (body) => client.post(`/account/profile`, body)

const updatePassword = (body) => client.post(`/account/password`, body)

const logout = () => client.get('/account/logout')

const getSettings = () => client.get('/settings')

export default {
    getAccountData,
    getBillingData,
    logout,
    updateOrgData,
    updateProfileData,
    updatePassword,
    getSettings
}
