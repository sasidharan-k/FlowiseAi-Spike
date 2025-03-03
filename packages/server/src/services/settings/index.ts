// TODO: add settings

import { getRunningExpressApp } from '../../utils/getRunningExpressApp'

enum UserPlan {
    CLOUD = 'cloud',
    ENTERPRISE = 'enterprise',
    OPENSOURCE = 'opensource'
}

const getSettings = async () => {
    try {
        const appServer = getRunningExpressApp()
        let userPlan = UserPlan.OPENSOURCE
        if (appServer.identityManager.isCloud()) {
            userPlan = UserPlan.CLOUD
        } else if (appServer.identityManager.isEnterprise()) {
            userPlan = UserPlan.ENTERPRISE
        }
        return {
            USER_PLAN: userPlan,
            ENGINE_URL: process.env.ENGINE_URL,
            DEBUG: process.env.DEBUG,
            LOG_LEVEL: process.env.LOG_LEVEL
        }
    } catch (error) {
        return {}
    }
}

export default {
    getSettings
}
