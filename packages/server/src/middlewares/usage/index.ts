import { NextFunction, Request, Response } from 'express'
import { getSubdomainFromHost } from '../../utils'
import { updatePredictionsUsage } from '../../utils/featureUsage'

async function featureUsageMiddleware(req: Request, res: Response, next: NextFunction) {
    res.on('finish', async () => {
        const host = req.headers.host as string
        const subdomain = getSubdomainFromHost(host) as string

        // if the request is successful then update the usage
        if (res.statusCode === 200) {
            await updatePredictionsUsage(subdomain)
        }
    })

    next()
}

export default featureUsageMiddleware
