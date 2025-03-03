import { useEffect, useMemo, useState } from 'react'
import { useDispatch } from 'react-redux'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'

// utils
import useNotifier from '@/utils/useNotifier'

// material-ui
import { Button, Box, LinearProgress, OutlinedInput, Skeleton, Stack, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import { gridSpacing } from '@/store/constant'
import { StyledButton } from '@/ui-component/button/StyledButton'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import ErrorBoundary from '@/ErrorBoundary'
import SettingsSection from '@/ui-component/form/settings'

// Icons
import { IconExternalLink, IconX } from '@tabler/icons-react'

// API
import accountApi from '@/api/account'

// Hooks
import useApi from '@/hooks/useApi'
import { useError } from '@/store/context/ErrorContext'
import { useConfig } from '@/store/context/ConfigContext'

// ==============================|| ACCOUNT SETTINGS ||============================== //

const calculatePercentage = (count, total) => {
    return (count / total) * 100
}

const AccountSettings = () => {
    const theme = useTheme()
    const dispatch = useDispatch()
    useNotifier()
    const { error, setError } = useError()
    const { isCloud } = useConfig()

    const [isLoading, setLoading] = useState(true)
    const [profileName, setProfileName] = useState('')
    const [email, setEmail] = useState('')
    const [orgName, setOrgName] = useState('')
    const [provider, setProvider] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [usage, setUsage] = useState(null)
    const [billingPortalUrl, setBillingPortalUrl] = useState('')
    const predictionsUsageInPercent = useMemo(() => {
        return usage ? calculatePercentage(usage.predictions?.usage, usage.predictions?.limit) : 0
    }, [usage])
    const storageUsageInPercent = useMemo(() => {
        return usage ? calculatePercentage(usage.storage?.usage, usage.storage?.limit) : 0
    }, [usage])

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const getAccountDataApi = useApi(accountApi.getAccountData)
    const getBillingDataApi = useApi(accountApi.getBillingData)

    useEffect(() => {
        if (isCloud) {
            getAccountDataApi.request()
            getBillingDataApi.request()
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        setLoading(getAccountDataApi.loading)
    }, [getAccountDataApi.loading])

    useEffect(() => {
        try {
            if (getAccountDataApi.data) {
                setProfileName(getAccountDataApi.data?.user?.name || '')
                setEmail(getAccountDataApi.data?.user?.email)
                setOrgName(getAccountDataApi.data?.org?.name)
                setProvider(getAccountDataApi.data?.user?.provider)
                setUsage(getAccountDataApi.data?.org?.usage)
            }
        } catch (e) {
            console.error(e)
        }
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

    const saveProfileData = async () => {
        try {
            const obj = {
                name: profileName
            }
            const saveProfileResp = await accountApi.updateProfileData(obj)
            if (saveProfileResp.data) {
                enqueueSnackbar({
                    message: 'Profile updated',
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
            }
        } catch (error) {
            setError(error)
            enqueueSnackbar({
                message: `Failed to update profile: ${
                    typeof error.response.data === 'object' ? error.response.data.message : error.response.data
                }`,
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    persist: true,
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
        }
    }

    const savePassword = async () => {
        try {
            const obj = {
                password: newPassword
            }
            const saveProfileResp = await accountApi.updatePassword(obj)
            if (saveProfileResp.data) {
                enqueueSnackbar({
                    message: 'Password updated',
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
            }
        } catch (error) {
            setError(error)
            enqueueSnackbar({
                message: `Failed to update password: ${
                    typeof error.response.data === 'object' ? error.response.data.message : error.response.data
                }`,
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    persist: true,
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
        }
    }

    const saveOrgData = async () => {
        try {
            const obj = {
                name: orgName
            }
            const saveOrgResp = await accountApi.updateOrgData(obj)
            if (saveOrgResp.data) {
                enqueueSnackbar({
                    message: 'Organization updated',
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
            }
        } catch (error) {
            setError(error)
            enqueueSnackbar({
                message: `Failed to update organization: ${
                    typeof error.response.data === 'object' ? error.response.data.message : error.response.data
                }`,
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    persist: true,
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
        }
    }

    return (
        <MainCard maxWidth='md'>
            {error ? (
                <ErrorBoundary error={error} />
            ) : (
                <Stack flexDirection='column' sx={{ gap: 4 }}>
                    <ViewHeader title='Account Settings' />
                    {isLoading && !getAccountDataApi.data ? (
                        <Box display='flex' flexDirection='column' gap={gridSpacing}>
                            <Skeleton width='25%' height={32} />
                            <Box display='flex' flexDirection='column' gap={2}>
                                <Skeleton width='20%' />
                                <Skeleton variant='rounded' height={56} />
                            </Box>
                            <Box display='flex' flexDirection='column' gap={2}>
                                <Skeleton width='20%' />
                                <Skeleton variant='rounded' height={56} />
                            </Box>
                            <Box display='flex' flexDirection='column' gap={2}>
                                <Skeleton width='20%' />
                                <Skeleton variant='rounded' height={56} />
                            </Box>
                        </Box>
                    ) : (
                        <>
                            <SettingsSection
                                action={
                                    <StyledButton onClick={saveProfileData} sx={{ borderRadius: 2, height: 40 }} variant='contained'>
                                        Save
                                    </StyledButton>
                                }
                                title='Profile'
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: gridSpacing,
                                        px: 2.5,
                                        py: 2
                                    }}
                                >
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        <Typography variant='body1'>Name</Typography>
                                        <OutlinedInput
                                            id='name'
                                            type='string'
                                            fullWidth
                                            placeholder='Your Name'
                                            name='name'
                                            onChange={(e) => setProfileName(e.target.value)}
                                            value={profileName}
                                        />
                                    </Box>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        <Typography variant='body1'>Email Address</Typography>
                                        <OutlinedInput
                                            id='email'
                                            type='string'
                                            fullWidth
                                            placeholder='Email Address'
                                            name='email'
                                            onChange={(e) => setEmail(e.target.value)}
                                            value={email}
                                            disabled
                                        />
                                    </Box>
                                </Box>
                            </SettingsSection>
                            <SettingsSection
                                action={
                                    <StyledButton onClick={saveOrgData} sx={{ borderRadius: 2, height: 40 }} variant='contained'>
                                        Save
                                    </StyledButton>
                                }
                                title='Organization'
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: gridSpacing,
                                        px: 2.5,
                                        py: 2
                                    }}
                                >
                                    <Box
                                        sx={{
                                            gridColumn: 'span 2 / span 2',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 1
                                        }}
                                    >
                                        <Typography variant='body1'>Name</Typography>
                                        <OutlinedInput
                                            id='orgName'
                                            type='string'
                                            fullWidth
                                            placeholder='Organization Name'
                                            name='orgName'
                                            onChange={(e) => setOrgName(e.target.value)}
                                            value={orgName}
                                        />
                                    </Box>
                                </Box>
                            </SettingsSection>
                            <SettingsSection title='Usage'>
                                <Box
                                    sx={{
                                        width: '100%',
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(2, 1fr)'
                                    }}
                                >
                                    <Box sx={{ p: 2.5, borderRight: 1, borderColor: theme.palette.grey[900] + 25 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <Typography variant='h3'>Predictions</Typography>
                                            <Typography variant='body2' color='text.secondary'>
                                                {`${usage?.predictions?.usage || 0} / ${usage?.predictions?.limit || 0}`}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                                            <Box sx={{ width: '100%', mr: 1 }}>
                                                <LinearProgress
                                                    sx={{
                                                        height: 10,
                                                        borderRadius: 5,
                                                        '& .MuiLinearProgress-bar': {
                                                            backgroundColor: predictionsUsageInPercent > 100 ? theme.palette.error.main : ''
                                                        }
                                                    }}
                                                    value={predictionsUsageInPercent > 100 ? 100 : predictionsUsageInPercent}
                                                    variant='determinate'
                                                />
                                            </Box>
                                            <Typography variant='body2' color='text.secondary'>{`${predictionsUsageInPercent.toFixed(
                                                2
                                            )}%`}</Typography>
                                        </Box>
                                    </Box>
                                    <Box sx={{ p: 2.5 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <Typography variant='h3'>Storage</Typography>
                                            <Typography variant='body2' color='text.secondary'>
                                                {`${usage?.storage?.usage || 0}MB / ${usage?.storage?.limit || 0}MB`}
                                            </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                                            <Box sx={{ width: '100%', mr: 1 }}>
                                                <LinearProgress
                                                    sx={{
                                                        height: 10,
                                                        borderRadius: 5,
                                                        '& .MuiLinearProgress-bar': {
                                                            backgroundColor: storageUsageInPercent > 100 ? theme.palette.error.main : ''
                                                        }
                                                    }}
                                                    value={storageUsageInPercent > 100 ? 100 : storageUsageInPercent}
                                                    variant='determinate'
                                                />
                                            </Box>
                                            <Typography variant='body2' color='text.secondary'>{`${storageUsageInPercent.toFixed(
                                                2
                                            )}%`}</Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            </SettingsSection>
                            {provider === 'email' && (
                                <SettingsSection
                                    action={
                                        <StyledButton
                                            disabled={!newPassword || !confirmPassword || newPassword !== confirmPassword}
                                            onClick={savePassword}
                                            sx={{ borderRadius: 2, height: 40 }}
                                            variant='contained'
                                        >
                                            Save
                                        </StyledButton>
                                    }
                                    title='Security'
                                >
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: gridSpacing,
                                            px: 2.5,
                                            py: 2
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                gridColumn: 'span 2 / span 2',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 1
                                            }}
                                        >
                                            <Typography variant='body1'>New Password</Typography>
                                            <OutlinedInput
                                                id='newPassword'
                                                type='password'
                                                fullWidth
                                                placeholder='New Password'
                                                name='newPassword'
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                value={newPassword}
                                            />
                                        </Box>
                                        <Box
                                            sx={{
                                                gridColumn: 'span 2 / span 2',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 1
                                            }}
                                        >
                                            <Typography variant='body1'>Confirm Password</Typography>
                                            <OutlinedInput
                                                id='confirmPassword'
                                                type='password'
                                                fullWidth
                                                placeholder='Confirm Password'
                                                name='confirmPassword'
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                value={confirmPassword}
                                            />
                                        </Box>
                                    </Box>
                                </SettingsSection>
                            )}
                            <SettingsSection title='Subscription & Billing'>
                                <Box
                                    sx={{
                                        width: '100%',
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(3, 1fr)'
                                    }}
                                >
                                    <Box
                                        sx={{
                                            gridColumn: 'span 2 / span 2',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'start',
                                            justifyContent: 'center',
                                            gap: 1,
                                            px: 2.5,
                                            py: 2
                                        }}
                                    >
                                        <Typography variant='h4'>View and manage your billing details</Typography>
                                        <Typography variant='body2' color='text.secondary'>
                                            View and edit your billing details, as well as manage your subscription.
                                        </Typography>
                                    </Box>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'end',
                                            px: 2.5,
                                            py: 2
                                        }}
                                    >
                                        <a href={billingPortalUrl} target='_blank' rel='noreferrer'>
                                            <StyledButton
                                                variant='contained'
                                                endIcon={<IconExternalLink />}
                                                sx={{ borderRadius: 2, height: 40 }}
                                            >
                                                Billing Portal
                                            </StyledButton>
                                        </a>
                                    </Box>
                                </Box>
                            </SettingsSection>
                        </>
                    )}
                </Stack>
            )}
        </MainCard>
    )
}

export default AccountSettings
