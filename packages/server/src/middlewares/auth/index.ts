import { NextFunction, Request, Response } from 'express'
import { SupabaseClient } from '@supabase/supabase-js'
import { getSubdomainFromHost } from '../../utils'
import { WHITELIST_URLS } from '../../utils/constants'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'

async function authMiddleware(req: Request, res: Response, next: NextFunction) {
    // if req.url is not /api/v1/ then do not check for auth
    if (!/\/api\/v1\//i.test(req.url)) next()
    // else if, do not check for auth if the url is in whitelist
    else if (WHITELIST_URLS.some((url) => new RegExp(url, 'i').test(req.url))) {
        next()
    } else {
        // authenticate user for everything else
        const server = getRunningExpressApp()
        const supabase = server.app.locals.supabase as SupabaseClient
        const jwtPayload = server.app.locals.jwtPayload

        if (jwtPayload && jwtPayload?.user?.user_metadata?.subdomain) {
            const orgSubdomain = jwtPayload.user.user_metadata.subdomain

            const host = req.headers.host as string // https://subdomain.app.flowiseai.com
            const subdomain = getSubdomainFromHost(host)

            // if org from profile data matches org from subdomain then allow access
            if (orgSubdomain !== subdomain) {
                // if not sign out user and redirect to login page
                await supabase.auth.signOut()
                return res.status(401).json({ error: 'unauthorized', redirectTo: `${process.env.SITE_URL}/auth/login` })
            } else {
                next()
            }
        } else {
            // check if user is authenticated
            const {
                data: { user },
                error: authError
            } = await supabase.auth.getUser()

            // if not redirect to login page
            if (authError) {
                return res.status(401).json({ error: 'unauthorized', redirectTo: `${process.env.SITE_URL}/auth/login` })
            }

            // get org subdomain from user metadata
            const orgSubdomain = user?.user_metadata?.subdomain

            const host = req.headers.host as string // https://subdomain.app.flowiseai.com
            const subdomain = getSubdomainFromHost(host)

            // if org from profile data matches org from subdomain then allow access
            if (orgSubdomain !== subdomain) {
                // if not sign out user and redirect to login page
                await supabase.auth.signOut()
                return res.status(401).json({ error: 'unauthorized', redirectTo: `${process.env.SITE_URL}/auth/login` })
            } else {
                next()
            }
        }
    }
}

export default authMiddleware
