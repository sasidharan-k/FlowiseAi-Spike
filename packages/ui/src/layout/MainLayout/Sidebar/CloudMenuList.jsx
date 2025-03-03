import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'
import { store } from '@/store'

// material-ui
import { Divider, Box, Button, List, ListItemButton, ListItemIcon, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

// project imports
import TrialInfo from '@/layout/MainLayout/Sidebar/TrialInfo'
import useNotifier from '@/utils/useNotifier'
import { useConfig } from '@/store/context/ConfigContext'

// API
import accountApi from '@/api/account'
import { logoutSuccess } from '@/store/reducers/authSlice'

// Hooks
import useApi from '@/hooks/useApi'

// icons
import { IconFileText, IconLogout, IconX } from '@tabler/icons-react'

const CloudMenuList = () => {
    const customization = useSelector((state) => state.customization)
    const dispatch = useDispatch()
    useNotifier()
    const theme = useTheme()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [isLoading, setLoading] = useState(true)
    const [billingPortalUrl, setBillingPortalUrl] = useState('')
    const [paymentMethodExists, setPaymentMethodExists] = useState(false)
    const [trialDaysLeft, setTrialDaysLeft] = useState(0)

    const getAccountDataApi = useApi(accountApi.getAccountData)
    const getBillingDataApi = useApi(accountApi.getBillingData)
    const logoutApi = useApi(accountApi.logout)
    const { isEnterpriseLicensed, isCloud } = useConfig()

    const logout = () => {
        if (isCloud) {
            enqueueSnackbar({
                message: 'Logging out...',
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'success',
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
            logoutApi.request()
        } else {
            localStorage.removeItem('username')
            localStorage.removeItem('password')
            navigate('/', { replace: true })
            navigate(0)
        }
    }

    useEffect(() => {
        if (isCloud) {
            getAccountDataApi.request()
            getBillingDataApi.request()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCloud])

    useEffect(() => {
        setLoading(getAccountDataApi.loading)
    }, [getAccountDataApi.loading])

    useEffect(() => {
        try {
            if (getAccountDataApi.data) {
                setPaymentMethodExists(getAccountDataApi.data?.org?.paymentMethodExists)
                setTrialDaysLeft(getAccountDataApi.data?.org?.trialDaysLeft)
            }
        } catch (e) {
            console.error(e)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getAccountDataApi.data])

    useEffect(() => {
        if (getBillingDataApi.data) {
            try {
                setBillingPortalUrl(getBillingDataApi.data?.url || '')
            } catch (e) {
                console.error(e)
            }
        }
    }, [getBillingDataApi.data])

    useEffect(() => {
        try {
            if (logoutApi.data && isEnterpriseLicensed) {
                store.dispatch(logoutSuccess())
            }
            if (logoutApi.data && logoutApi.data.message === 'logged_out') {
                window.location.href = logoutApi.data.redirectTo
            }
        } catch (e) {
            console.error(e)
        }
    }, [logoutApi.data, isEnterpriseLicensed])

    return (
        <>
            {isCloud && (
                <Box>
                    {trialDaysLeft || isLoading ? (
                        <TrialInfo
                            billingPortalUrl={billingPortalUrl}
                            isLoading={isLoading}
                            paymentMethodExists={paymentMethodExists}
                            trialDaysLeft={trialDaysLeft}
                        />
                    ) : (
                        <Divider sx={{ height: '1px', borderColor: theme.palette.grey[900] + 25, my: 0 }} />
                    )}
                    <List sx={{ p: '16px', py: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <a href='https://docs.flowiseai.com' target='_blank' rel='noreferrer' style={{ textDecoration: 'none' }}>
                            <ListItemButton
                                sx={{
                                    borderRadius: `${customization.borderRadius}px`,
                                    alignItems: 'flex-start',
                                    backgroundColor: 'inherit',
                                    py: 1.25,
                                    pl: '24px'
                                }}
                            >
                                <ListItemIcon sx={{ my: 'auto', minWidth: 36 }}>
                                    <IconFileText size='1.3rem' strokeWidth='1.5' />
                                </ListItemIcon>
                                <Typography variant='body1' color='inherit' sx={{ my: 0.5 }}>
                                    Documentation
                                </Typography>
                            </ListItemButton>
                        </a>
                        <ListItemButton
                            onClick={logout}
                            sx={{
                                borderRadius: `${customization.borderRadius}px`,
                                alignItems: 'flex-start',
                                backgroundColor: 'inherit',
                                py: 1.25,
                                pl: '24px'
                            }}
                        >
                            <ListItemIcon sx={{ my: 'auto', minWidth: 36 }}>
                                <IconLogout size='1.3rem' strokeWidth='1.5' />
                            </ListItemIcon>
                            <Typography variant='body1' color='inherit' sx={{ my: 0.5 }}>
                                Logout
                            </Typography>
                        </ListItemButton>
                    </List>
                </Box>
            )}
        </>
    )
}

export default CloudMenuList
