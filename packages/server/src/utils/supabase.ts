import type { Request, Response } from 'express'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'
import { ICommonObject } from 'flowise-components'
import { jwtDecode } from 'jwt-decode'
import { getRunningExpressApp } from './getRunningExpressApp'

const createClient = async ({
    req,
    res
}: {
    req: Request
    res: Response
}): Promise<{ client: SupabaseClient; jwtPayload: ICommonObject | undefined }> => {
    let jwtPayload
    const serverApp = getRunningExpressApp()
    const supabaseUrlSecret = await serverApp.secretClient.getSecret('supabase-url')
    const supabaseAnonKeySecret = await serverApp.secretClient.getSecret('supabase-anon-key')

    const getSubdomain = (url: string) => {
        // Remove the protocol (http:// or https://)
        const withoutProtocol = url.replace(/^https?:\/\//, '')

        // Split the remaining string by dots
        const parts = withoutProtocol.split('.')

        // The subdomain is the first part
        return parts[0]
    }

    const subdomain = getSubdomain(supabaseUrlSecret?.value as string)

    const getCombinedTokenValue = (
        cookies: {
            name: string
            value: string
        }[]
    ) => {
        // Find all relevant cookies
        const tokenCookies = cookies.filter(
            (cookie) => cookie.name === `sb-${subdomain}-auth-token` || cookie.name.startsWith(`sb-${subdomain}-auth-token.`)
        )

        if (tokenCookies.length === 0) {
            return null
        }

        // Sort cookies by name to ensure correct order
        tokenCookies.sort((a, b) => a.name.localeCompare(b.name))

        // Combine the values
        const combinedValue = tokenCookies.map((cookie) => cookie.value).join('')

        return combinedValue
    }

    const supasbaseClient = createServerClient(supabaseUrlSecret?.value as string, supabaseAnonKeySecret?.value as string, {
        cookies: {
            getAll: () => {
                const cookieHeaders = parseCookieHeader(req.headers.cookie ?? '')

                const cookieValue = getCombinedTokenValue(cookieHeaders) || ''

                if (cookieValue.startsWith('base64-')) {
                    jwtPayload = jwtDecode(cookieValue.replace('base64-', ''), { header: true })
                } else {
                    try {
                        jwtPayload = JSON.parse(decodeURIComponent(cookieValue))
                    } catch (error) {
                        // error parsing jwtPayload
                    }
                }

                return cookieHeaders
            },
            setAll: (cookiesToSet) => {
                if (res.headersSent) {
                    return
                }
                cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: any }) => {
                    try {
                        res.appendHeader(
                            'Set-Cookie',
                            serializeCookieHeader(name, value, {
                                ...options,
                                sameSite: 'lax',
                                httpOnly: true,
                                domain: process.env.NODE_ENV === 'production' ? '.flowiseai.com' : 'localhost'
                            })
                        )
                    } catch (error) {
                        console.error('Error setting cookie:', error)
                    }
                })
            }
        }
    })
    return { client: supasbaseClient, jwtPayload }
}

export { createClient }
