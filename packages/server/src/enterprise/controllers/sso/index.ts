import { NextFunction, Request, Response } from 'express'
import { getRunningExpressApp } from '../../../utils/getRunningExpressApp'
import { InternalFlowiseError } from '../../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import organizationService from '../../services/organization'
import AzureSSO from '../../sso/AzureSSO'
import GoogleSSO from '../../sso/GoogleSSO'
import Auth0SSO from '../../sso/Auth0SSO'

const getSSOProviders = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const appServer = getRunningExpressApp()
        if (appServer.app && appServer.app.locals.Organization && appServer.app.locals.Organization.ssoConfig) {
            const ssoProvider = appServer.app.locals.Organization.ssoConfig
            const providers = ssoProvider.providers.filter((provider: any) => provider.configEnabled)
            return res.json({ providers: providers.map((provider: any) => provider.providerName) })
        }
        return res.json({ providers: [] })
    } catch (error) {
        next(error)
    }
}

const updateSSOConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const appServer = getRunningExpressApp()
        if (typeof req.body === 'undefined') {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: ssoController.updateSSOConfig - body not provided!`)
        }
        const apiResponse = await organizationService.updateSSOConfig(req.body)
        if (apiResponse === 'OK') {
            const organization = await organizationService.getOrganization()
            if (organization !== null) {
                appServer.app.locals.Organization = organization
            }
            const providers = req.body.providers
            providers.map((provider: any) => {
                const identityManager = appServer.identityManager
                identityManager.initializeSsoProvider(appServer.app, provider.providerName, provider)
            })
        }
        return res.status(200).json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getSSOConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const appServer = getRunningExpressApp()
        const org = appServer.app.locals.Organization

        const callbacks = [
            { providerName: 'azure', callbackURL: AzureSSO.getCallbackURL() },
            { providerName: 'google', callbackURL: GoogleSSO.getCallbackURL() },
            { providerName: 'auth0', callbackURL: Auth0SSO.getCallbackURL() }
        ]

        if (org && org.ssoConfig !== null && org.ssoConfig !== undefined && org.ssoConfig !== '') {
            let providers = org.ssoConfig.providers || []
            providers = providers.map((provider: any) => {
                if (provider.providerName === 'azure') {
                    provider.callbackURL = AzureSSO.getCallbackURL()
                } else if (provider.providerName === 'google') {
                    provider.callbackURL = GoogleSSO.getCallbackURL()
                } else if (provider.providerName === 'auth0') {
                    provider.callbackURL = Auth0SSO.getCallbackURL()
                }
                return provider
            })
            return res.json({ providers, callbacks })
        }
        return res.json({ providers: [], callbacks })
    } catch (error) {
        next(error)
    }
}

const testSSOConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.body === 'undefined' || req.body.providers === undefined || req.body.providerName === undefined) {
            throw new InternalFlowiseError(StatusCodes.PRECONDITION_FAILED, `Error: ssoController.testSSOConfig - body not provided!`)
        }
        const providers = req.body.providers
        if (req.body.providerName === 'azure') {
            const response = await AzureSSO.testSetup(providers[0])
            return res.json(response)
        } else if (req.body.providerName === 'google') {
            const response = await GoogleSSO.testSetup(providers[0])
            return res.json(response)
        } else if (req.body.providerName === 'auth0') {
            const response = await Auth0SSO.testSetup(providers[0])
            return res.json(response)
        } else {
            return res.json({ error: 'Provider not supported' })
        }
    } catch (error) {
        next(error)
    }
}

export default {
    getSSOProviders,
    updateSSOConfig,
    getSSOConfig,
    testSSOConfig
}
