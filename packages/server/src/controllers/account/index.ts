import { Request, Response, NextFunction } from 'express'
import { SupabaseClient } from '@supabase/supabase-js'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import Stripe from 'stripe'

const getAccountData = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const server = getRunningExpressApp()
        const supabase = server.app.locals.supabase as SupabaseClient
        const stripe = server.app.locals.stripe as Stripe

        const {
            data: { user },
            error: authError
        } = await supabase.auth.getUser()
        if (authError) {
            console.error('auth error test')
            console.error('authError =', authError.message)
            next(authError)
        }

        const { data: profileData, error: profileError } = await supabase
            .from('profile')
            .select('email,name,organization')
            .eq('id', user?.id)
            .single()

        if (profileError) {
            console.error('profileError =', profileError.message)
            next(profileError)
        }

        const { data: orgData, error: orgError } = await supabase
            .from('organization')
            .select('customerId,details,plan,subdomain,subscriptionId,usage')
            .eq('id', profileData?.organization)
            .single()

        if (orgError) {
            console.error('orgError =', orgError.message)
            next(orgError)
        }

        const paymentMethods = await stripe.customers.listPaymentMethods(orgData?.customerId)
        const subscription = await stripe.subscriptions.retrieve(orgData?.subscriptionId)
        const paymentMethodExists = paymentMethods.data.length > 0

        let trialDaysLeft
        if (subscription.status === 'trialing' && subscription.trial_end) {
            const trialEnd = new Date(subscription.trial_end * 1000)
            const today = new Date()
            const diffTime = trialEnd.getTime() - today.getTime()
            const diffDays = diffTime / (1000 * 3600 * 24)
            trialDaysLeft = Math.round(diffDays)
        } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
            return res.status(401).json({
                error: 'subscription_canceled',
                redirectTo: `${process.env.SITE_URL}/auth/login`
            })
        }

        if (orgError) {
            next(orgError)
        }

        return res.json({
            org: {
                name: orgData?.details.orgName,
                paymentMethodExists,
                trialDaysLeft,
                usage: orgData?.usage,
                plan: orgData?.plan
            },
            user: { email: profileData?.email, name: profileData?.name, provider: user?.app_metadata.provider }
        })
    } catch (error) {
        next(error)
    }
}

const logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const server = getRunningExpressApp()
        const supabase = server.app.locals.supabase as SupabaseClient
        await supabase.auth.signOut()
        return res.status(200).json({ message: 'logged_out', redirectTo: `${process.env.SITE_URL}/auth/login` })
    } catch (error) {
        next(error)
    }
}

const updateProfileData = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const server = getRunningExpressApp()
        const supabase = server.app.locals.supabase as SupabaseClient
        const {
            data: { user },
            error
        } = await supabase.auth.getUser()
        if (error) {
            next(error)
        }
        const body = req.body
        const name = body.name
        const email = body.email

        const { error: profileError } = await supabase.from('profile').update({ name, email }).eq('id', user?.id)

        if (profileError) {
            next(profileError)
        }

        res.json({ message: 'profile_updated' })
    } catch (error) {
        next(error)
    }
}

const updatePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const server = getRunningExpressApp()
        const supabase = server.app.locals.supabase as SupabaseClient
        const { error } = await supabase.auth.getUser()
        if (error) {
            next(error)
        }
        const body = req.body
        const password = body.password

        const { error: authError } = await supabase.auth.updateUser({ password })

        if (authError) {
            next(authError)
        }

        res.json({ message: 'password_updated' })
    } catch (error) {
        next(error)
    }
}

const updateOrgData = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const server = getRunningExpressApp()
        const supabase = server.app.locals.supabase as SupabaseClient
        const {
            data: { user },
            error
        } = await supabase.auth.getUser()
        if (error) {
            next(error)
        }
        const body = req.body
        const orgName = body.orgName
        const { data: profileData, error: profileError } = await supabase.from('profile').select('organization').eq('id', user?.id).single()

        if (profileError) {
            next(profileError)
        }
        const { data: orgData } = await supabase.from('organization').select('details,id').eq('id', profileData?.organization).single()

        const { error: orgError } = await supabase
            .from('organization')
            .update({ details: { ...orgData?.details, name: orgName } })
            .eq('id', orgData?.id)

        if (orgError) {
            next(orgError)
        }

        res.json({ message: 'org_updated' })
    } catch (error) {
        next(error)
    }
}

const createStripeCustomerPortalSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const server = getRunningExpressApp()
        const supabase = server.app.locals.supabase as SupabaseClient
        const stripe = server.app.locals.stripe as Stripe
        const {
            data: { user },
            error
        } = await supabase.auth.getUser()
        if (error) {
            next(error)
        }
        const { data: profileData, error: profileError } = await supabase
            .from('profile')
            .select('email,name,organization')
            .eq('id', user?.id)
            .single()

        if (profileError) {
            next(profileError)
        }

        const { data: orgData, error: orgError } = await supabase
            .from('organization')
            .select('customerId,details,plan,subdomain,usage')
            .eq('id', profileData?.organization)
            .single()

        if (orgError) {
            next(orgError)
        }

        const customerId = orgData?.customerId
        if (!customerId) {
            next(new Error('No customer id found'))
        }

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `https://${process.env.DEFAULT_ORG_SUBDOMAIN}${process.env.HOST_DOMAIN}/account`
        })

        res.json({ url: portalSession.url })
    } catch (error) {
        next(error)
    }
}

export default {
    createStripeCustomerPortalSession,
    getAccountData,
    logout,
    updateOrgData,
    updateProfileData,
    updatePassword
}
