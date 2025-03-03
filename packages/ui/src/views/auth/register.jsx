import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'

// material-ui
import { Stack, Typography, Box, OutlinedInput, useTheme, Alert, List, ListItemText, Divider, Button, Icon } from '@mui/material'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import { StyledButton } from '@/ui-component/button/StyledButton'
import { Input } from '@/ui-component/input/Input'
import { BackdropLoader } from '@/ui-component/loading/BackdropLoader'

// API
import authApi from '@/api/auth'
import ssoApi from '@/api/sso'

// Hooks
import useApi from '@/hooks/useApi'

// utils
import useNotifier from '@/utils/useNotifier'

// Icons
import { IconCircleCheck, IconExclamationCircle } from '@tabler/icons-react'
import { store } from '@/store'
import { loginSuccess } from '@/store/reducers/authSlice'
import AzureSSOLoginIcon from '@/assets/images/microsoft-azure.svg'
import GoogleSSOLoginIcon from '@/assets/images/google.svg'
import Auth0SSOLoginIcon from '@/assets/images/auth0.svg'

// ==============================|| Register ||============================== //

// IMPORTANT: when updating this schema, update the schema on the server as well
// packages/server/src/enterprise/Interface.Enterprise.ts
const RegisterUserSchema = z
    .object({
        username: z.string().min(1, 'Name is required'),
        email: z.string().min(1, 'Email is required').email('Invalid email address'),
        password: z
            .string()
            .min(8, 'Password must be at least 8 characters')
            .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
            .regex(/[!@#$%^&*]/, 'Password must contain at least one special character'),
        confirmPassword: z.string().min(1, 'Confirm Password is required'),
        token: z.string().min(1, 'Invite Code is required')
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ['confirmPassword']
    })

const RegisterPage = () => {
    const theme = useTheme()
    useNotifier()

    const usernameInput = {
        label: 'Username',
        name: 'username',
        type: 'text',
        placeholder: 'John Doe'
    }

    const passwordInput = {
        label: 'Password',
        name: 'password',
        type: 'password',
        placeholder: '********'
    }

    const confirmPasswordInput = {
        label: 'Confirm Password',
        name: 'confirmPassword',
        type: 'password',
        placeholder: '********'
    }

    const emailInput = {
        label: 'EMail',
        name: 'email',
        type: 'email',
        placeholder: 'user@company.com'
    }

    const inviteCodeInput = {
        label: 'Invite Code',
        name: 'inviteCode',
        type: 'text'
    }

    const [params] = useSearchParams()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [token, setToken] = useState(params.get('token') ?? '')
    const [username, setUsername] = useState('')
    const [configuredSsoProviders, setConfiguredSsoProviders] = useState([])

    const [loading, setLoading] = useState(false)
    const [authError, setAuthError] = useState('')
    const [successMsg, setSuccessMsg] = useState(undefined)

    const registerApi = useApi(authApi.registerUser)
    const ssoLoginApi = useApi(ssoApi.ssoLogin)
    const getSSOProvider = useApi(ssoApi.getSSOProviders)
    const navigate = useNavigate()

    const register = async (event) => {
        event.preventDefault()
        const result = RegisterUserSchema.safeParse({
            username,
            email,
            token,
            password,
            confirmPassword
        })
        if (result.success) {
            setLoading(true)
            const body = {
                username,
                email,
                password,
                confirmPassword,
                token
            }
            await registerApi.request(body)
        } else {
            const errorMessages = result.error.errors.map((err) => err.message)
            setAuthError(errorMessages.join(', '))
        }
    }

    const signInWithSSO = (ssoProvider) => {
        //ssoLoginApi.request(ssoProvider)
        window.location.href = `/api/v1/${ssoProvider}/login`
    }

    useEffect(() => {
        if (registerApi.error) {
            setAuthError(`Error in registering user. Please contact your administrator. (${registerApi.error?.response?.data?.message})`)
            setLoading(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [registerApi.error])

    useEffect(() => {
        getSSOProvider.request()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (ssoLoginApi.data) {
            store.dispatch(loginSuccess(ssoLoginApi.data))
            localStorage.setItem('username', ssoLoginApi.data.name)
            navigate(location.state?.path || '/chatflows')
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ssoLoginApi.data])

    useEffect(() => {
        if (ssoLoginApi.error) {
            if (ssoLoginApi.error?.response?.status === 401 && ssoLoginApi.error?.response?.data.redirectUrl) {
                window.location.href = ssoLoginApi.error.response.data.redirectUrl
            } else {
                setAuthError(ssoLoginApi.error.message)
            }
        }
    }, [ssoLoginApi.error])

    useEffect(() => {
        if (getSSOProvider.data) {
            //data is an array of objects, store only the provider attribute
            setConfiguredSsoProviders(getSSOProvider.data.providers.map((provider) => provider))
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSSOProvider.data])

    useEffect(() => {
        if (registerApi.data) {
            setLoading(false)
            setAuthError(undefined)
            setConfirmPassword('')
            setPassword('')
            setToken('')
            setUsername('')
            setEmail('')
            setSuccessMsg(registerApi.data.message)
            setTimeout(() => {
                navigate('/signin')
            }, 2000)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [registerApi.data])

    return (
        <>
            <MainCard>
                <Stack flexDirection='column' sx={{ width: '480px', gap: 3 }}>
                    {authError && (
                        <Alert icon={<IconExclamationCircle />} variant='filled' severity='error'>
                            {authError.split(', ').length > 0 ? (
                                <List dense sx={{ py: 0 }}>
                                    {authError.split(', ').map((error, index) => (
                                        <ListItemText key={index} primary={error} primaryTypographyProps={{ color: '#fff !important' }} />
                                    ))}
                                </List>
                            ) : (
                                authError
                            )}
                        </Alert>
                    )}
                    {successMsg && (
                        <Alert icon={<IconCircleCheck />} variant='filled' severity='success'>
                            {successMsg}
                        </Alert>
                    )}
                    <Stack sx={{ gap: 1 }}>
                        <Typography variant='h1'>Sign Up</Typography>
                        <Typography variant='body2' sx={{ color: theme.palette.grey[600] }}>
                            Already have an account?{' '}
                            <Link style={{ color: theme.palette.primary.main }} to='/signin'>
                                Sign In
                            </Link>
                            .
                        </Typography>
                    </Stack>
                    <form onSubmit={register}>
                        <Stack sx={{ width: '100%', flexDirection: 'column', alignItems: 'left', justifyContent: 'center', gap: 2 }}>
                            <Box>
                                <div style={{ display: 'flex', flexDirection: 'row' }}>
                                    <Typography>
                                        Full Name<span style={{ color: 'red' }}>&nbsp;*</span>
                                    </Typography>
                                    <div style={{ flexGrow: 1 }}></div>
                                </div>
                                <Input
                                    inputParam={usernameInput}
                                    placeholder='Display Name'
                                    onChange={(newValue) => setUsername(newValue)}
                                    value={username}
                                    showDialog={false}
                                />
                                <Typography variant='caption'>
                                    <i>Is used for display purposes only.</i>
                                </Typography>
                            </Box>
                            <Box>
                                <div style={{ display: 'flex', flexDirection: 'row' }}>
                                    <Typography>
                                        Email<span style={{ color: 'red' }}>&nbsp;*</span>
                                    </Typography>
                                    <div style={{ flexGrow: 1 }}></div>
                                </div>
                                <Input
                                    inputParam={emailInput}
                                    onChange={(newValue) => setEmail(newValue)}
                                    value={email}
                                    showDialog={false}
                                />
                                <Typography variant='caption'>
                                    <i>Kindly use a valid email address. Will be used as login id.</i>
                                </Typography>
                            </Box>
                            <Box>
                                <div style={{ display: 'flex', flexDirection: 'row' }}>
                                    <Typography>
                                        Invite Code<span style={{ color: 'red' }}>&nbsp;*</span>
                                    </Typography>
                                    <div style={{ flexGrow: 1 }}></div>
                                </div>
                                <OutlinedInput
                                    fullWidth
                                    type='string'
                                    placeholder='Paste in the invite code.'
                                    multiline={false}
                                    inputParam={inviteCodeInput}
                                    onChange={(e) => setToken(e.target.value)}
                                    value={token}
                                />
                                <Typography variant='caption'>
                                    <i>Please copy the token you would have received in your email.</i>
                                </Typography>
                            </Box>
                            <Box>
                                <div style={{ display: 'flex', flexDirection: 'row' }}>
                                    <Typography>
                                        Password<span style={{ color: 'red' }}>&nbsp;*</span>
                                    </Typography>
                                    <div style={{ flexGrow: 1 }}></div>
                                </div>
                                <Input inputParam={passwordInput} onChange={(newValue) => setPassword(newValue)} value={password} />
                                <Typography variant='caption'>
                                    <i>Minimum 8 chars. (1) Capital Letter and (1) Special character is needed.</i>
                                </Typography>
                            </Box>
                            <Box>
                                <div style={{ display: 'flex', flexDirection: 'row' }}>
                                    <Typography>
                                        Confirm Password<span style={{ color: 'red' }}>&nbsp;*</span>
                                    </Typography>
                                    <div style={{ flexGrow: 1 }}></div>
                                </div>
                                <Input
                                    inputParam={confirmPasswordInput}
                                    onChange={(newValue) => setConfirmPassword(newValue)}
                                    value={confirmPassword}
                                />
                                <Typography variant='caption'>
                                    <i>Reconfirm your password. Must match the password typed above.</i>
                                </Typography>
                            </Box>
                            <StyledButton variant='contained' style={{ borderRadius: 12, height: 40, marginRight: 5 }} type='submit'>
                                Create Account
                            </StyledButton>
                            {configuredSsoProviders.length > 0 && <Divider sx={{ width: '100%' }}>OR</Divider>}
                            {configuredSsoProviders &&
                                configuredSsoProviders.map(
                                    (ssoProvider) =>
                                        //https://learn.microsoft.com/en-us/entra/identity-platform/howto-add-branding-in-apps
                                        ssoProvider === 'azure' && (
                                            <Button
                                                key={ssoProvider}
                                                variant='outlined'
                                                style={{ borderRadius: 12, height: 45, marginRight: 5, lineHeight: 0 }}
                                                onClick={() => signInWithSSO(ssoProvider)}
                                                startIcon={
                                                    <Icon>
                                                        <img src={AzureSSOLoginIcon} alt={'MicrosoftSSO'} width={20} height={20} />
                                                    </Icon>
                                                }
                                            >
                                                Sign In With Microsoft
                                            </Button>
                                        )
                                )}
                            {configuredSsoProviders &&
                                configuredSsoProviders.map(
                                    (ssoProvider) =>
                                        ssoProvider === 'google' && (
                                            <Button
                                                key={ssoProvider}
                                                variant='outlined'
                                                style={{ borderRadius: 12, height: 45, marginRight: 5, lineHeight: 0 }}
                                                onClick={() => signInWithSSO(ssoProvider)}
                                                startIcon={
                                                    <Icon>
                                                        <img src={GoogleSSOLoginIcon} alt={'GoogleSSO'} width={20} height={20} />
                                                    </Icon>
                                                }
                                            >
                                                Sign In With Google
                                            </Button>
                                        )
                                )}
                            {configuredSsoProviders &&
                                configuredSsoProviders.map(
                                    (ssoProvider) =>
                                        ssoProvider === 'auth0' && (
                                            <Button
                                                key={ssoProvider}
                                                variant='outlined'
                                                style={{ borderRadius: 12, height: 45, marginRight: 5, lineHeight: 0 }}
                                                onClick={() => signInWithSSO(ssoProvider)}
                                                startIcon={
                                                    <Icon>
                                                        <img src={Auth0SSOLoginIcon} alt={'Auth0SSO'} width={20} height={20} />
                                                    </Icon>
                                                }
                                            >
                                                Sign In With Auth0 by Okta
                                            </Button>
                                        )
                                )}
                        </Stack>
                    </form>
                </Stack>
            </MainCard>
            {loading && <BackdropLoader open={loading} />}
        </>
    )
}

export default RegisterPage
