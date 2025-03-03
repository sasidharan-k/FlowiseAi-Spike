import Stripe from 'stripe'
import { getRunningExpressApp } from './getRunningExpressApp'

export const initializeStripeClient = async () => {
    const serverApp = getRunningExpressApp()
    const stripeSecret = await serverApp.secretClient.getSecret('stripe-secret-key')
    const stripe = new Stripe(stripeSecret?.value as string)
    return stripe
}
