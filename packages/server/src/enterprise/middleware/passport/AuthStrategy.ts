import { ExtractJwt, JwtFromRequestFunction, Strategy as JwtStrategy, VerifiedCallback } from 'passport-jwt'
import { decryptToken } from '../../utils/tempTokenUtils'
import { Strategy } from 'passport'
import { ENTERPRISE_FEATURES, IdentityManager } from '../../../IdentityManager'
import { Request } from 'express'
import { ICommonObject } from 'flowise-components'

const _cookieExtractor = (req: any) => {
    let jwt = null

    if (req && req.cookies) {
        jwt = req.cookies['token']
    }

    return jwt
}

export const getAuthStrategy = (identityManager: IdentityManager, options: any): Strategy => {
    let jwtFromRequest: JwtFromRequestFunction
    if (identityManager.hasEnterpriseFeature(ENTERPRISE_FEATURES.AUTHORIZATION_COOKIE)) {
        jwtFromRequest = _cookieExtractor
    } else {
        jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken()
    }
    const jwtOptions = {
        jwtFromRequest: jwtFromRequest,
        passReqToCallback: true,
        ...options
    }
    const jwtVerify = async (req: Request, payload: ICommonObject, done: VerifiedCallback) => {
        try {
            const meta = decryptToken(payload.meta)
            if (!meta) {
                return done(null, false, 'Unauthorized.')
            }
            const ids = meta.split(':')
            done(null, {
                name: payload.username,
                id: ids[0],
                activeWorkspaceId: ids[1],
                role: ids[2],
                loginMode: ids[3]
            })
        } catch (error) {
            done(error, false)
        }
    }
    return new JwtStrategy(jwtOptions, jwtVerify)
}
