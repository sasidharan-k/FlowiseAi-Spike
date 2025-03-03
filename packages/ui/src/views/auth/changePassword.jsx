import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'

// material-ui
import { Stack, Typography, Box, OutlinedInput, Button } from '@mui/material'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import { StyledButton } from '@/ui-component/button/StyledButton'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import ErrorBoundary from '@/ErrorBoundary'
import { BackdropLoader } from '@/ui-component/loading/BackdropLoader'
import SettingsSection from '@/ui-component/form/settings'

// API
import authApi from '@/api/auth'
import useApi from '@/hooks/useApi'
import { userProfileUpdated } from '@/store/reducers/authSlice'
import { store } from '@/store'

// utils
import useNotifier from '@/utils/useNotifier'
import { useError } from '@/store/context/ErrorContext'

// Icons
import { IconAlertTriangle, IconX } from '@tabler/icons-react'

// const
import { gridSpacing } from '@/store/constant'

const ChangePasswordPage = () => {
    useNotifier()
    const { error, setError } = useError()

    const dispatch = useDispatch()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const currentUser = useSelector((state) => state.auth.user)
    const [emailVal, setEmailVal] = useState('')

    const [passwordVal, setPasswordVal] = useState('')
    const [newPasswordVal, setNewPasswordVal] = useState('')
    const [confirmPasswordVal, setConfirmPasswordVal] = useState('')
    const [usernameVal, setUsernameVal] = useState('')

    const [loading, setLoading] = useState(false)
    const [authErrors, setAuthErrors] = useState([])

    const getUserApi = useApi(authApi.getUserById)

    const validateAndSubmit = async () => {
        const validationErrors = []
        setAuthErrors([])
        if (!usernameVal) {
            // name cannot be empty
            validationErrors.push('Name cannot be left blank!')
        }
        if (!passwordVal && (newPasswordVal || confirmPasswordVal)) {
            // password cannot be empty
            validationErrors.push('Current password is mandatory')
        }
        if (passwordVal && newPasswordVal !== confirmPasswordVal) {
            validationErrors.push('New Password and Confirm Password do not match')
        }
        if (passwordVal && newPasswordVal.length < 8) {
            validationErrors.push('New Password must be at least 8 characters long')
        }
        if (passwordVal && newPasswordVal && !/[A-Z]/.test(newPasswordVal)) {
            validationErrors.push('New Password must contain at least one uppercase letter')
        }
        if (passwordVal && newPasswordVal && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+/.test(newPasswordVal)) {
            validationErrors.push('New Password must contain at least one special character')
        }
        if (validationErrors.length > 0) {
            setAuthErrors(validationErrors)
            return
        }
        const body = {
            name: usernameVal,
            oldPassword: passwordVal,
            updatedPassword: newPasswordVal
        }
        setLoading(true)
        try {
            const updateResponse = await authApi.updateDetails(currentUser.id, body)
            setAuthErrors([])
            setLoading(false)
            if (updateResponse.data) {
                store.dispatch(userProfileUpdated(updateResponse.data))
                enqueueSnackbar({
                    message: 'User Details Updated!',
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
            setLoading(false)
            setAuthErrors([typeof error.response.data === 'object' ? error.response.data.message : error.response.data])
            enqueueSnackbar({
                message: `Failed to update user details`,
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

    useEffect(() => {
        if (getUserApi.data) {
            const user = getUserApi.data
            setEmailVal(user.email)
            setUsernameVal(user.name)
            setLoading(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getUserApi.data])

    useEffect(() => {
        if (getUserApi.error) {
            setLoading(false)
            setError(getUserApi.error)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getUserApi.error])

    useEffect(() => {
        setLoading(true)
        getUserApi.request(currentUser.id)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <>
            <MainCard>
                {error ? (
                    <ErrorBoundary error={error} />
                ) : (
                    <Stack flexDirection='column' sx={{ gap: 3 }}>
                        <ViewHeader search={false} title='Settings' />
                        {authErrors && authErrors.length > 0 && (
                            <div
                                style={{
                                    position: 'relative',
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    borderRadius: 10,
                                    background: 'rgb(254,252,191)',
                                    padding: 10,
                                    paddingTop: 15,
                                    marginTop: 10,
                                    marginBottom: 10
                                }}
                            >
                                <Box sx={{ p: 2 }}>
                                    <IconAlertTriangle size={25} color='orange' />
                                </Box>
                                <Stack flexDirection='column'>
                                    <span style={{ color: 'rgb(116,66,16)' }}>
                                        <ul>
                                            {authErrors.map((msg, key) => (
                                                <strong key={key}>
                                                    <li>{msg}</li>
                                                </strong>
                                            ))}
                                        </ul>
                                    </span>
                                </Stack>
                            </div>
                        )}
                        <SettingsSection
                            action={
                                <StyledButton variant='contained' style={{ borderRadius: 2, height: 40 }} onClick={validateAndSubmit}>
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
                                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                                        <Typography>Email</Typography>
                                        <div style={{ flexGrow: 1 }}></div>
                                    </div>
                                    <OutlinedInput
                                        id='email'
                                        type='string'
                                        fullWidth
                                        size='small'
                                        placeholder='Your login Id'
                                        disabled={true}
                                        name='name'
                                        onChange={(e) => setEmailVal(e.target.value)}
                                        value={emailVal}
                                    />
                                    <Typography variant='caption'>
                                        <i>Your login Id. Contact your administrator to update your email.</i>
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                                        <Typography>
                                            Full Name<span style={{ color: 'red' }}>&nbsp;*</span>
                                        </Typography>
                                        <div style={{ flexGrow: 1 }}></div>
                                    </div>
                                    <OutlinedInput
                                        id='name'
                                        type='string'
                                        fullWidth
                                        size='small'
                                        placeholder='Your Name'
                                        name='name'
                                        onChange={(e) => setUsernameVal(e.target.value)}
                                        value={usernameVal}
                                    />
                                </Box>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                                        <Typography>
                                            Current Password<span style={{ color: 'red' }}>&nbsp;*</span>
                                        </Typography>
                                        <div style={{ flexGrow: 1 }}></div>
                                    </div>
                                    <OutlinedInput
                                        id='name'
                                        type='password'
                                        fullWidth
                                        size='small'
                                        name='name'
                                        onChange={(e) => setPasswordVal(e.target.value)}
                                        value={passwordVal}
                                    />
                                    <Typography variant='caption'>
                                        <i>Your existing password. Mandatory only if you type in the new or confirm password.</i>
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                                        <Typography>
                                            New Password<span style={{ color: 'red' }}>&nbsp;*</span>
                                        </Typography>
                                        <div style={{ flexGrow: 1 }}></div>
                                    </div>
                                    <OutlinedInput
                                        id='np'
                                        type='password'
                                        fullWidth
                                        size='small'
                                        name='new_password'
                                        onChange={(e) => setNewPasswordVal(e.target.value)}
                                        value={newPasswordVal}
                                    />
                                    <Typography variant='caption'>
                                        <i>Minimum 8 chars. (1) Capital Letter and (1) Special character is needed.</i>
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                                        <Typography>
                                            Confirm Password<span style={{ color: 'red' }}>&nbsp;*</span>
                                        </Typography>
                                        <div style={{ flexGrow: 1 }}></div>
                                    </div>
                                    <OutlinedInput
                                        id='npc'
                                        type='password'
                                        fullWidth
                                        size='small'
                                        name='new_cnf_password'
                                        onChange={(e) => setConfirmPasswordVal(e.target.value)}
                                        value={confirmPasswordVal}
                                    />
                                    <Typography variant='caption'>
                                        <i>Retype your new password. Must match the password typed above.</i>
                                    </Typography>
                                </Box>
                            </Box>
                        </SettingsSection>
                    </Stack>
                )}
            </MainCard>
            {loading && <BackdropLoader open={loading} />}
        </>
    )
}

export default ChangePasswordPage
