import axios from 'axios'
import * as fs from 'fs'
import path from 'path'
import express from 'express'
import { Permissions } from './enterprise/rbac/Permissions'
import { getRunningExpressApp } from './utils/getRunningExpressApp'
import AzureSSO from './enterprise/sso/AzureSSO'
import GoogleSSO from './enterprise/sso/GoogleSSO'
import Auth0SSO from './enterprise/sso/Auth0SSO'
import jwt from 'jsonwebtoken'

export enum ENTERPRISE_FEATURES {
    AUTHORIZATION_COOKIE = 'cookie',
    SSO_ENABLED = 'sso',
    METRICS_PROMETHEUS = 'prometheus',
    METRICS_OPEN_TELEMETRY = 'opentelemetry'
}

export class IdentityManager {
    eeLicenseValid: boolean = false
    permissions: Permissions
    ssoProviderName: string = ''
    // create a map to store the sso provider name and the sso provider instance
    ssoProviders: Map<string, any> = new Map()

    initializeSsoProvider(app: express.Application, providerName: string, providerConfig: any) {
        if (this.ssoProviders.has(providerName)) {
            const provider = this.ssoProviders.get(providerName)
            if (provider.getSSOConfig() && provider.getSSOConfig().configEnabled === providerConfig?.configEnabled) {
                // if the provider is already initialized with the same config, return
                return
            }
            if (providerConfig && providerConfig.configEnabled === true) {
                // if false, disable the provider
                provider.setSSOConfig(providerConfig)
            } else {
                provider.setSSOConfig(undefined)
            }
        } else {
            switch (providerName) {
                case 'azure': {
                    const azureSSO = new AzureSSO(app, providerConfig)
                    azureSSO.initialize()
                    this.ssoProviders.set(providerName, azureSSO)
                    break
                }
                case 'google': {
                    const googleSSO = new GoogleSSO(app, providerConfig)
                    googleSSO.initialize()
                    this.ssoProviders.set(providerName, googleSSO)
                    break
                }
                case 'auth0': {
                    const auth0SSO = new Auth0SSO(app, providerConfig)
                    auth0SSO.initialize()
                    this.ssoProviders.set(providerName, auth0SSO)
                    break
                }
                default:
                    throw new Error(`SSO Provider ${providerName} not found`)
            }
        }
    }

    public initialize = async () => {
        if (this.isEnterprise()) {
            await this._validateLicenseKey()
        }
        this.permissions = new Permissions()
    }

    public getPermissions = () => {
        return this.permissions
    }

    public isEnterprise = () => {
        const FLOWISE_EE_LICENSE_KEY = process.env.FLOWISE_EE_LICENSE_KEY
        if (!FLOWISE_EE_LICENSE_KEY) {
            return false
        }
        return true
    }

    public isEnterpriseLicenseValid = () => {
        return this.eeLicenseValid
    }

    public isCloud = () => {
        return process.env.IS_CLOUD === 'true'
    }

    private _offlineVerifyLicense(licenseKey: string): any {
        try {
            const publicKey = fs.readFileSync(path.join(__dirname, '../', 'src/enterprise/license/public.pem'), 'utf8')
            const decoded = jwt.verify(licenseKey, publicKey, {
                algorithms: ['RS256']
            })
            return decoded
        } catch (error) {
            console.error('Error verifying license key:', error)
            return null
        }
    }

    private _validateLicenseKey = async () => {
        const LICENSE_URL = process.env.LICENSE_URL
        const FLOWISE_EE_LICENSE_KEY = process.env.FLOWISE_EE_LICENSE_KEY

        if (!FLOWISE_EE_LICENSE_KEY || !LICENSE_URL) {
            this.eeLicenseValid = false
            return
        }

        try {
            if (process.env.OFFLINE === 'true') {
                const licenseKey = process.env.FLOWISE_EE_LICENSE_KEY || ''
                const decodedLicense = this._offlineVerifyLicense(licenseKey)

                if (!decodedLicense) {
                    this.eeLicenseValid = false
                    return
                } else {
                    const issuedAtSeconds = decodedLicense.iat
                    if (!issuedAtSeconds) {
                        this.eeLicenseValid = false
                        return
                    } else {
                        const issuedAt = new Date(issuedAtSeconds * 1000)
                        const expiryDurationInMonths = decodedLicense.expiryDurationInMonths || 0

                        const expiryDate = new Date(issuedAt)
                        expiryDate.setMonth(expiryDate.getMonth() + expiryDurationInMonths)

                        if (new Date() > expiryDate) {
                            this.eeLicenseValid = false
                            return
                        } else {
                            this.eeLicenseValid = true
                            return
                        }
                    }
                }
            } else {
                const response = await axios.post(`${LICENSE_URL}/enterprise/verify`, { license: FLOWISE_EE_LICENSE_KEY })
                this.eeLicenseValid = response.data.valid
                return
            }
        } catch (error) {
            this.eeLicenseValid = false
        }
    }

    public initializeSSO = async (app: express.Application) => {
        const allSSOProviders = ['azure', 'google', 'auth0']
        if (this.isEnterprise()) {
            if (app.locals.Organization && app.locals.Organization.ssoConfig) {
                const ssoProvider = app.locals.Organization.ssoConfig
                if (ssoProvider.providers) {
                    ssoProvider.providers.map((provider: any) => {
                        if (provider.configEnabled) {
                            // if enabled, remove from the list of available allSSOProviders
                            const index = allSSOProviders.indexOf(provider.providerName)
                            if (index > -1) {
                                allSSOProviders.splice(index, 1)
                            }
                            this.initializeSsoProvider(app, provider.providerName, provider)
                        }
                    })
                }
            }
            // iterate through the remaining providers and initialize them with configEnabled as false
            allSSOProviders.map((providerName) => {
                this.initializeSsoProvider(app, providerName, undefined)
            })
        }
    }

    public hasEnterpriseFeature = (feature: ENTERPRISE_FEATURES) => {
        if (!this.isEnterprise()) {
            return false
        }
        const app = getRunningExpressApp().app
        switch (feature) {
            case ENTERPRISE_FEATURES.AUTHORIZATION_COOKIE:
                return !process.env.AUTHORIZATION_PROVIDER || process.env.AUTHORIZATION_PROVIDER === 'default'
            case ENTERPRISE_FEATURES.SSO_ENABLED:
                if (app && app.locals.Organization && app.locals.Organization.ssoConfig) {
                    const ssoProvider = app.locals.Organization.ssoConfig
                    if (ssoProvider && ssoProvider.providers) {
                        return true
                    }
                }
                return false
            case ENTERPRISE_FEATURES.METRICS_PROMETHEUS:
                return process.env.ENABLE_METRICS === 'true' && process.env.METRICS_PROVIDER === 'prometheus'
            case ENTERPRISE_FEATURES.METRICS_OPEN_TELEMETRY:
                return process.env.ENABLE_METRICS === 'true' && process.env.METRICS_PROVIDER === 'open_telemetry'
            default:
                return false
        }
    }

    async getRefreshToken(providerName: any, ssoRefreshToken: string) {
        if (!this.ssoProviders.has(providerName)) {
            throw new Error(`SSO Provider ${providerName} not found`)
        }
        return await this.ssoProviders.get(providerName).refreshToken(ssoRefreshToken)
    }
}
