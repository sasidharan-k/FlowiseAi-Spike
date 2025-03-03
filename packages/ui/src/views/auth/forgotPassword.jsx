import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

// material-ui
import { Stack, Typography, Box, useTheme, Alert } from '@mui/material'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import { StyledButton } from '@/ui-component/button/StyledButton'
import { Input } from '@/ui-component/input/Input'
import { BackdropLoader } from '@/ui-component/loading/BackdropLoader'

// API
import authApi from '@/api/auth'

// Hooks
import useApi from '@/hooks/useApi'

// utils
import useNotifier from '@/utils/useNotifier'

// Icons
import { IconCircleCheck, IconExclamationCircle } from '@tabler/icons-react'

// ==============================|| ForgotPasswordPage ||============================== //

const ForgotPasswordPage = () => {
    const theme = useTheme()
    useNotifier()

    const usernameInput = {
        label: 'Username',
        name: 'username',
        type: 'email',
        placeholder: 'user@company.com'
    }
    const [usernameVal, setUsernameVal] = useState('')

    const [isLoading, setLoading] = useState(false)
    const [responseMsg, setResponseMsg] = useState(undefined)

    const generateTokenApi = useApi(authApi.forgetPassword)

    const sendResetRequest = async (event) => {
        event.preventDefault()
        const body = {
            email: usernameVal
        }
        setLoading(true)
        await generateTokenApi.request(body)
    }

    useEffect(() => {
        if (generateTokenApi.error) {
            setResponseMsg({
                type: 'error',
                msg: 'Failed to send instructions, please contact your administrator.'
            })
            setLoading(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [generateTokenApi.error])

    useEffect(() => {
        if (generateTokenApi.data) {
            setResponseMsg({
                type: 'success',
                msg: 'Password reset instructions sent to the email.'
            })
            setLoading(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [generateTokenApi.data])

    return (
        <>
            <MainCard>
                <Stack flexDirection='column' sx={{ width: '480px', gap: 3 }}>
                    {responseMsg && responseMsg?.type === 'error' && (
                        <Alert icon={<IconExclamationCircle />} variant='filled' severity='error'>
                            {responseMsg.msg}
                        </Alert>
                    )}
                    {responseMsg && responseMsg?.type !== 'error' && (
                        <Alert icon={<IconCircleCheck />} variant='filled' severity='success'>
                            {responseMsg.msg}
                        </Alert>
                    )}
                    <Stack sx={{ gap: 1 }}>
                        <Typography variant='h1'>Forgot Password?</Typography>
                        <Typography variant='body2' sx={{ color: theme.palette.grey[600] }}>
                            Have a reset password code?{' '}
                            <Link style={{ color: theme.palette.primary.main }} to='/reset-password'>
                                Change your password here
                            </Link>
                            .
                        </Typography>
                    </Stack>
                    <form onSubmit={sendResetRequest}>
                        <Stack sx={{ width: '100%', flexDirection: 'column', alignItems: 'left', justifyContent: 'center', gap: 2 }}>
                            <Box>
                                <div style={{ display: 'flex', flexDirection: 'row' }}>
                                    <Typography>
                                        Email<span style={{ color: 'red' }}>&nbsp;*</span>
                                    </Typography>
                                    <Typography align='left'></Typography>
                                    <div style={{ flexGrow: 1 }}></div>
                                </div>
                                <Input
                                    inputParam={usernameInput}
                                    onChange={(newValue) => setUsernameVal(newValue)}
                                    value={usernameVal}
                                    showDialog={false}
                                />
                                <Typography variant='caption'>
                                    <i>If you forgot the email you used for signing up, please contact your administrator.</i>
                                </Typography>
                            </Box>
                            <StyledButton
                                variant='contained'
                                style={{ borderRadius: 12, height: 40, marginRight: 5 }}
                                disabled={!usernameVal}
                                type='submit'
                            >
                                Send Reset Password Instructions
                            </StyledButton>
                        </Stack>
                    </form>
                    <BackdropLoader open={isLoading} />
                </Stack>
            </MainCard>
        </>
    )
}

export default ForgotPasswordPage
