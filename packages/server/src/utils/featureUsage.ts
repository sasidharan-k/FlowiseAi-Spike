import { SupabaseClient } from '@supabase/supabase-js'
import { getRunningExpressApp } from './getRunningExpressApp'
import Stripe from 'stripe'
import { ICommonObject } from 'flowise-components'
import { getOrgData } from '.'
import { InternalFlowiseError } from '../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import { MODE } from '../Interface'

export const updatePredictionsUsage = async (subdomain: string) => {
    // TODO: remove appServer
    // For now, return if running in queue mode as we will be getting rid of the supabase dependency in horizontal design
    if (process.env.MODE === MODE.QUEUE) return

    const server = getRunningExpressApp()
    if (!server.identityManager.isCloud()) return
    const supabase = server.app.locals.supabase as SupabaseClient
    const stripe = server.app.locals.stripe as Stripe
    const { data: orgData, error: orgError } = await supabase
        .from('organization')
        .select('customerId,id,usage')
        .eq('subdomain', subdomain)
        .single()

    if (orgError) {
        console.error('Error fetching organization data', orgError.message)
        return
    }

    const usage = Object.assign({}, orgData?.usage, {
        predictions: {
            usage: orgData?.usage?.predictions?.usage + 1,
            limit: orgData?.usage?.predictions?.limit
        }
    })

    await supabase.from('organization').update({ usage }).eq('id', orgData?.id)

    await stripe.billing.meterEvents.create({
        event_name: 'predictions',
        payload: {
            value: '1',
            stripe_customer_id: orgData?.customerId
        }
    })
}

export const updateStorageUsage = async (subdomain: string, totalSize: number) => {
    // TODO: remove appServer
    // For now, return if running in queue mode as we will be getting rid of the supabase dependency in horizontal design
    if (process.env.MODE === MODE.QUEUE) return

    const server = getRunningExpressApp()
    if (!server.identityManager.isCloud()) return
    const supabase = server.app.locals.supabase as SupabaseClient
    const { data: orgData, error: orgError } = await supabase
        .from('organization')
        .select('customerId,id,usage')
        .eq('subdomain', subdomain)
        .single()

    if (orgError) {
        console.error('Error fetching organization data', orgError.message)
        return
    }

    const updatedUsage = Object.assign({}, orgData?.usage, {
        storage: {
            usage: parseFloat(totalSize.toFixed(2)),
            limit: orgData?.usage?.storage?.limit
        }
    })

    // save new usage to supabase
    await supabase.from('organization').update({ usage: updatedUsage }).eq('id', orgData?.id).select().single()
}

export const checkStorage = async (orgData?: ICommonObject) => {
    // TODO: remove appServer
    // For now, return if running in queue mode as we will be getting rid of the supabase dependency in horizontal design
    if (process.env.MODE === MODE.QUEUE) return

    const appServer = getRunningExpressApp()
    if (!orgData) {
        orgData = await getOrgData(appServer)
    }

    if (appServer.identityManager.isCloud()) {
        const currentUsage = orgData?.usage?.storage?.usage
        const storageLimit = orgData?.usage?.storage?.limit
        if (currentUsage >= storageLimit) {
            throw new InternalFlowiseError(StatusCodes.FORBIDDEN, 'Storage limit exceeded')
        }
    }
}
