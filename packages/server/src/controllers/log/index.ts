import { Request, Response, NextFunction } from 'express'
import logService from '../../services/log'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { SupabaseClient } from '@supabase/supabase-js'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'

// Get logs
const getLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const server = getRunningExpressApp()
        const startDate = req.query?.startDate as string

        if (server.identityManager.isCloud()) {
            const supabase = server.app.locals.supabase as SupabaseClient
            const {
                data: { user },
                error: authError
            } = await supabase.auth.getUser()
            if (authError) {
                console.error('authError =', authError)
                next(authError)
            }

            const { data: profileData, error: profileError } = await supabase
                .from('profile')
                .select('email,name,organization')
                .eq('id', user?.id)
                .single()

            if (profileError) {
                console.error('profileError =', profileError)
                next(profileError)
            }

            const { data: orgData, error: orgError } = await supabase
                .from('organization')
                .select('customerId,details,subdomain,plan,subscriptionId,usage')
                .eq('id', profileData?.organization)
                .single()

            if (orgError) {
                console.error('orgError =', orgError)
                next(orgError)
            }

            const userPlan = orgData?.plan || 'starter_monthly'
            if (userPlan === 'starter_monthly' && startDate.includes('-')) {
                const parts = startDate.split('-')
                const year = parseInt(parts[0], 10)
                const month = parseInt(parts[1], 10) - 1 // JS months are zero-indexed
                const day = parseInt(parts[2], 10)
                const hour = parseInt(parts[3], 10)

                const date = new Date(year, month, day, hour)
                const currentDate = new Date()

                // Create a new date representing 7 days earlier than today
                let checkDate = new Date(currentDate.getTime())
                checkDate.setDate(checkDate.getDate() - 7)
                checkDate.setHours(0, 0, 0, 0)

                // Compare if the given date is less than the calculated date
                if (date < checkDate) {
                    throw new InternalFlowiseError(
                        StatusCodes.PRECONDITION_FAILED,
                        `Error: logController.getLogs - 'Date is more than 7 days earlier than today'`
                    )
                }
            } else if (userPlan === 'pro_monthly' && startDate.includes('-')) {
                const parts = startDate.split('-')
                const year = parseInt(parts[0], 10)
                const month = parseInt(parts[1], 10) - 1 // JS months are zero-indexed
                const day = parseInt(parts[2], 10)
                const hour = parseInt(parts[3], 10)

                const date = new Date(year, month, day, hour)
                const currentDate = new Date()

                // Create a new date representing 3 months earlier than today
                let checkDate = new Date(currentDate.getTime())
                checkDate.setMonth(checkDate.getMonth() - 3)
                checkDate.setHours(0, 0, 0, 0)

                // Compare if the given date is less than the calculated date
                if (date < checkDate) {
                    throw new InternalFlowiseError(
                        StatusCodes.PRECONDITION_FAILED,
                        `Error: logController.getLogs - 'Date is more than 3 months earlier than today'`
                    )
                }
            }

            const apiResponse = await logService.getLogs(req.query?.startDate as string, req.query?.endDate as string)
            res.send(apiResponse)
        } else {
            const apiResponse = await logService.getLogs(req.query?.startDate as string, req.query?.endDate as string)
            res.send(apiResponse)
        }
    } catch (error) {
        next(error)
    }
}

export default {
    getLogs
}
