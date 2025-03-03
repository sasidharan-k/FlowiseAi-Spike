import client from './client'

const getSSOProviders = () => client.get(`/sso/providers`)
const ssoLogin = (providerName) => client.get(`/${providerName}/login`)
const getConfig = () => client.get(`/sso/config`)
const saveConfig = (body) => client.post(`/sso/config`, body)
const testConfig = (body) => client.post(`/sso/test`, body)

export default {
    getSSOProviders,
    ssoLogin,
    getConfig,
    saveConfig,
    testConfig
}
