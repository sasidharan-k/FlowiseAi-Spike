import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'

// material-ui
import { Popover, IconButton, Stack, Typography, Box, OutlinedInput, Button, Tabs, Tab, Divider } from '@mui/material'
import { useTheme } from '@mui/material/styles'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import ErrorBoundary from '@/ErrorBoundary'
import { BackdropLoader } from '@/ui-component/loading/BackdropLoader'
import { SwitchInput } from '@/ui-component/switch/Switch'

// API
import ssoApi from '@/api/sso'
import useApi from '@/hooks/useApi'

// utils
import useNotifier from '@/utils/useNotifier'
import { useError } from '@/store/context/ErrorContext'

// Icons
import { IconAlertTriangle, IconX, IconCopy } from '@tabler/icons-react'
import MicrosoftSVG from '@/assets/images/microsoft-azure.svg'
import GoogleSVG from '@/assets/images/google.svg'
import Auth0SVG from '@/assets/images/auth0.svg'

// const
import { gridSpacing } from '@/store/constant'
import { StyledButton } from '@/ui-component/button/StyledButton'
import { TabPanel } from '@/ui-component/tabs/TabPanel'

const SSOConfigPage = () => {
    useNotifier()
    const { error, setError } = useError()
    const theme = useTheme()

    const dispatch = useDispatch()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [azureConfigEnabled, setAzureConfigEnabled] = useState(false)
    const [azureTenantID, setAzureTenantID] = useState('')
    const [azureClientID, setAzureClientID] = useState('')
    const [azureClientSecret, setAzureClientSecret] = useState('')
    const [azureCallbackURL, setAzureCallbackURL] = useState('')

    const [googleConfigEnabled, setGoogleConfigEnabled] = useState(false)
    const [googleClientID, setGoogleClientID] = useState('')
    const [googleClientSecret, setGoogleClientSecret] = useState('')
    const [googleCallbackURL, setGoogleCallbackURL] = useState('')

    const [auth0ConfigEnabled, setAuth0ConfigEnabled] = useState(false)
    const [auth0Domain, setAuth0Domain] = useState('')
    const [auth0ClientID, setAuth0ClientID] = useState('')
    const [auth0ClientSecret, setAuth0ClientSecret] = useState('')
    const [auth0CallbackURL, setAuth0CallbackURL] = useState('')

    const [loading, setLoading] = useState(false)
    const [authErrors, setAuthErrors] = useState([])

    const getSSOConfig = useApi(ssoApi.getConfig)
    const [tabValue, setTabValue] = useState(0)

    const [copyAnchorEl, setCopyAnchorEl] = useState(null)
    const openCopyPopOver = Boolean(copyAnchorEl)

    const handleCloseCopyPopOver = () => {
        setCopyAnchorEl(null)
    }

    const validateAzureFields = (validationErrors) => {
        if (!azureTenantID) {
            validationErrors.push('Azure TenantID cannot be left blank!')
        }
        if (!azureClientID) {
            validationErrors.push('Azure ClientID cannot be left blank!')
        }
        if (!azureClientSecret) {
            validationErrors.push('Azure Client Secret cannot be left blank!')
        }
    }
    const validateGoogleFields = (validationErrors) => {
        if (!googleClientID) {
            validationErrors.push('Google ClientID cannot be left blank!')
        }
        if (!googleClientSecret) {
            validationErrors.push('Google Client Secret cannot be left blank!')
        }
    }
    const validateAuth0Fields = (validationErrors) => {
        if (!auth0Domain) {
            validationErrors.push('Auth0 Domain cannot be left blank!')
        }
        if (!auth0ClientID) {
            validationErrors.push('Auth0 ClientID cannot be left blank!')
        }
        if (!auth0ClientSecret) {
            validationErrors.push('Auth0 Client Secret cannot be left blank!')
        }
    }

    const validateFields = () => {
        const validationErrors = []
        setAuthErrors([])
        if (azureConfigEnabled) {
            validateAzureFields(validationErrors)
        }
        if (googleConfigEnabled) {
            validateGoogleFields(validationErrors)
        }
        if (auth0ConfigEnabled) {
            validateAuth0Fields(validationErrors)
        }
        return validationErrors
    }

    function constructRequestBody() {
        const body = {
            providers: [
                {
                    providerLabel: 'Microsoft',
                    providerName: 'azure',
                    tenantID: azureTenantID,
                    clientID: azureClientID,
                    clientSecret: azureClientSecret,
                    configEnabled: azureConfigEnabled
                },
                {
                    providerLabel: 'Google',
                    providerName: 'google',
                    clientID: googleClientID,
                    clientSecret: googleClientSecret,
                    configEnabled: googleConfigEnabled
                },
                {
                    providerLabel: 'Auth0',
                    providerName: 'auth0',
                    domain: auth0Domain,
                    clientID: auth0ClientID,
                    clientSecret: auth0ClientSecret,
                    configEnabled: auth0ConfigEnabled
                }
            ]
        }
        return body
    }

    const validateAndSubmit = async () => {
        const validationErrors = validateFields()
        if (validationErrors.length > 0) {
            setAuthErrors(validationErrors)
            return
        }
        const body = constructRequestBody()
        setLoading(true)
        try {
            const updateResponse = await ssoApi.saveConfig(body)
            setAuthErrors([])
            setLoading(false)
            if (updateResponse.data) {
                enqueueSnackbar({
                    message: 'SSO Configuration Updated!',
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
                message: `Failed to update SSO Configuration.`,
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

    const validateAndTest = async (providerName) => {
        let validationErrors = []
        switch (providerName) {
            case 'Azure':
                validateAzureFields(validationErrors)
                break
            case 'Google':
                validateGoogleFields(validationErrors)
                break
            case 'Auth0':
                validateAuth0Fields(validationErrors)
                break
        }
        if (validationErrors.length > 0) {
            setAuthErrors(validationErrors)
            return
        }
        const body = constructRequestBody()
        // depending on the tab value, we need to set the provider name and remove the other provider
        body.providers = [body.providers[tabValue]]
        body.providerName = providerName.toLowerCase()
        setLoading(true)
        try {
            const updateResponse = await ssoApi.testConfig(body)
            setAuthErrors([])
            setLoading(false)
            if (updateResponse.data?.message) {
                enqueueSnackbar({
                    message: `${getSelectedProviderName()} SSO Configuration is Valid!`,
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
            if (updateResponse.data.error) {
                enqueueSnackbar({
                    message: `${updateResponse.data.error}`,
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
        } catch (error) {
            setLoading(false)
            setAuthErrors([typeof error.response.data === 'object' ? error.response.data.message : error.response.data])
            enqueueSnackbar({
                message: `Failed to verify ${getSelectedProviderName()} SSO Configuration.`,
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

    const handleAzureChange = (value) => {
        setAzureConfigEnabled(value)
    }

    const handleGoogleChange = (value) => {
        setGoogleConfigEnabled(value)
    }

    const handleAuth0Change = (value) => {
        setAuth0ConfigEnabled(value)
    }

    const getSelectedProviderName = () => {
        switch (tabValue) {
            case 0:
                return 'Azure'
            case 1:
                return 'Google'
            case 2:
                return 'Auth0'
        }
    }

    useEffect(() => {
        if (getSSOConfig.data) {
            const azureConfig = getSSOConfig.data.providers.find((provider) => provider.providerName === 'azure')
            const azureCallback = getSSOConfig.data.callbacks.find((callback) => callback.providerName === 'azure')
            if (azureCallback) {
                setAzureCallbackURL(azureCallback.callbackURL)
            }
            if (azureConfig) {
                setAzureTenantID(azureConfig.tenantID)
                setAzureClientID(azureConfig.clientID)
                setAzureClientSecret(azureConfig.clientSecret)
                setAzureConfigEnabled(azureConfig.configEnabled)
            }
            const googleConfig = getSSOConfig.data.providers.find((provider) => provider.providerName === 'google')
            const googleCallback = getSSOConfig.data.callbacks.find((callback) => callback.providerName === 'google')
            if (googleCallback) {
                setGoogleCallbackURL(googleCallback.callbackURL)
            }
            if (googleConfig) {
                setGoogleClientID(googleConfig.clientID)
                setGoogleClientSecret(googleConfig.clientSecret)
                setGoogleConfigEnabled(googleConfig.configEnabled)
            }
            const auth0Config = getSSOConfig.data.providers.find((provider) => provider.providerName === 'auth0')
            const auth0Callback = getSSOConfig.data.callbacks.find((callback) => callback.providerName === 'auth0')
            if (auth0Callback) {
                setAuth0CallbackURL(auth0Callback.callbackURL)
            }

            if (auth0Config) {
                setAuth0Domain(auth0Config.domain)
                setAuth0ClientID(auth0Config.clientID)
                setAuth0ClientSecret(auth0Config.clientSecret)
                setAuth0ConfigEnabled(auth0Config.configEnabled)
            }
            setLoading(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSSOConfig.data])

    useEffect(() => {
        if (getSSOConfig.error) {
            setLoading(false)
            setError(getSSOConfig.error)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSSOConfig.error])

    useEffect(() => {
        setLoading(true)
        getSSOConfig.request()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <>
            <MainCard>
                {error ? (
                    <ErrorBoundary error={error} />
                ) : (
                    <Stack flexDirection='column' sx={{ gap: 3 }}>
                        <ViewHeader search={false} title='Configure SSO' />
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
                                <Box sx={{ pl: 2 }}>
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
                        <Tabs value={tabValue} textColor='primary' onChange={(event, val) => setTabValue(val)} aria-label='tabs'>
                            <Tab
                                iconPosition='start'
                                icon={<img alt='MS_SSO' src={MicrosoftSVG} width={24} height={24} />}
                                sx={{
                                    minHeight: '40px',
                                    height: '40px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    mb: 1
                                }}
                                value={0}
                                label={
                                    <>
                                        Microsoft
                                        {azureConfigEnabled && (
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'row',
                                                    alignContent: 'center',
                                                    alignItems: 'center',
                                                    background: '#d8f3dc',
                                                    borderRadius: 15,
                                                    padding: 3,
                                                    paddingLeft: 7,
                                                    paddingRight: 7,
                                                    marginRight: 7,
                                                    marginLeft: 7
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: 15,
                                                        height: 15,
                                                        borderRadius: '50%',
                                                        backgroundColor: '#70e000'
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </>
                                }
                            />
                            <Tab
                                iconPosition='start'
                                icon={<img alt='Google_SSO' src={GoogleSVG} width={24} height={24} />}
                                sx={{
                                    minHeight: '40px',
                                    height: '40px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    mb: 1
                                }}
                                value={1}
                                label={
                                    <>
                                        Google
                                        {googleConfigEnabled && (
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'row',
                                                    alignContent: 'center',
                                                    alignItems: 'center',
                                                    background: '#d8f3dc',
                                                    borderRadius: 15,
                                                    padding: 3,
                                                    paddingLeft: 7,
                                                    paddingRight: 7,
                                                    marginRight: 7,
                                                    marginLeft: 7
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: 15,
                                                        height: 15,
                                                        borderRadius: '50%',
                                                        backgroundColor: '#70e000'
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </>
                                }
                            />
                            <Tab
                                iconPosition='start'
                                icon={<img alt='Auth0_SSO' src={Auth0SVG} width={24} height={24} />}
                                sx={{
                                    minHeight: '40px',
                                    height: '40px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    mb: 1
                                }}
                                value={2}
                                label={
                                    <>
                                        Auth0
                                        {auth0ConfigEnabled && (
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'row',
                                                    alignContent: 'center',
                                                    alignItems: 'center',
                                                    background: '#d8f3dc',
                                                    borderRadius: 15,
                                                    padding: 3,
                                                    paddingLeft: 7,
                                                    paddingRight: 7,
                                                    marginRight: 7,
                                                    marginLeft: 7
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: 15,
                                                        height: 15,
                                                        borderRadius: '50%',
                                                        backgroundColor: '#70e000'
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </>
                                }
                            />
                        </Tabs>
                        <TabPanel index={0} value={tabValue}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: gridSpacing
                                }}
                            >
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Typography style={{ verticalAlign: 'middle', width: '50%' }}> Enable SSO Login</Typography>
                                    <SwitchInput
                                        style={{ verticalAlign: 'middle', width: '50%' }}
                                        onChange={handleAzureChange}
                                        value={azureConfigEnabled}
                                    />
                                </Box>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Stack direction='row'>
                                        <Typography
                                            sx={{
                                                p: 1,
                                                borderRadius: 10,
                                                backgroundColor: theme.palette.primary.light,
                                                width: 'max-content',
                                                height: 'max-content'
                                            }}
                                            variant='h5'
                                        >
                                            {azureCallbackURL}
                                        </Typography>
                                        <IconButton
                                            title='Copy Callback URL'
                                            color='success'
                                            onClick={(event) => {
                                                navigator.clipboard.writeText(azureCallbackURL)
                                                setCopyAnchorEl(event.currentTarget)
                                                setTimeout(() => {
                                                    handleCloseCopyPopOver()
                                                }, 1500)
                                            }}
                                        >
                                            <IconCopy />
                                        </IconButton>
                                    </Stack>
                                </Box>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                                        <Typography>Tenant ID</Typography>
                                        <div style={{ flexGrow: 1 }}></div>
                                    </div>
                                    <OutlinedInput
                                        id='email'
                                        type='string'
                                        fullWidth
                                        size='small'
                                        placeholder='Tenant ID'
                                        name='azureTenantID'
                                        onChange={(e) => setAzureTenantID(e.target.value)}
                                        value={azureTenantID}
                                    />
                                </Box>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                                        <Typography>
                                            Client ID<span style={{ color: 'red' }}>&nbsp;*</span>
                                        </Typography>
                                        <div style={{ flexGrow: 1 }}></div>
                                    </div>
                                    <OutlinedInput
                                        id='name'
                                        type='string'
                                        fullWidth
                                        size='small'
                                        placeholder='Client ID'
                                        name='azureClientID'
                                        onChange={(e) => setAzureClientID(e.target.value)}
                                        value={azureClientID}
                                    />
                                </Box>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                                        <Typography>
                                            Client Secret<span style={{ color: 'red' }}>&nbsp;*</span>
                                        </Typography>
                                        <div style={{ flexGrow: 1 }}></div>
                                    </div>
                                    <OutlinedInput
                                        id='name'
                                        type='password'
                                        fullWidth
                                        size='small'
                                        placeholder='Client Secret'
                                        name='azureClientSecret'
                                        onChange={(e) => setAzureClientSecret(e.target.value)}
                                        value={azureClientSecret}
                                    />
                                </Box>
                            </Box>
                        </TabPanel>
                        <TabPanel index={1} value={tabValue}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: gridSpacing
                                }}
                            >
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Typography style={{ verticalAlign: 'middle', width: '50%' }}> Enable SSO Login</Typography>
                                    <SwitchInput
                                        style={{ verticalAlign: 'middle', width: '50%' }}
                                        onChange={handleGoogleChange}
                                        value={googleConfigEnabled}
                                    />
                                </Box>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Stack direction='row'>
                                        <Typography
                                            sx={{
                                                p: 1,
                                                borderRadius: 10,
                                                backgroundColor: theme.palette.primary.light,
                                                width: 'max-content',
                                                height: 'max-content'
                                            }}
                                            variant='h5'
                                        >
                                            {googleCallbackURL}
                                        </Typography>
                                        <IconButton
                                            title='Copy Callback URL'
                                            color='success'
                                            onClick={(event) => {
                                                navigator.clipboard.writeText(googleCallbackURL)
                                                setCopyAnchorEl(event.currentTarget)
                                                setTimeout(() => {
                                                    handleCloseCopyPopOver()
                                                }, 1500)
                                            }}
                                        >
                                            <IconCopy />
                                        </IconButton>
                                    </Stack>
                                </Box>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                                        <Typography>
                                            Client ID<span style={{ color: 'red' }}>&nbsp;*</span>
                                        </Typography>
                                        <div style={{ flexGrow: 1 }}></div>
                                    </div>
                                    <OutlinedInput
                                        id='name'
                                        type='string'
                                        fullWidth
                                        size='small'
                                        placeholder='Client ID'
                                        name='googleClientID'
                                        onChange={(e) => setGoogleClientID(e.target.value)}
                                        value={googleClientID}
                                    />
                                </Box>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                                        <Typography>
                                            Client Secret<span style={{ color: 'red' }}>&nbsp;*</span>
                                        </Typography>
                                        <div style={{ flexGrow: 1 }}></div>
                                    </div>
                                    <OutlinedInput
                                        id='name'
                                        type='password'
                                        fullWidth
                                        size='small'
                                        placeholder='Client Secret'
                                        name='googleClientSecret'
                                        onChange={(e) => setGoogleClientSecret(e.target.value)}
                                        value={googleClientSecret}
                                    />
                                </Box>
                            </Box>
                        </TabPanel>
                        <TabPanel index={2} value={tabValue}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: gridSpacing
                                }}
                            >
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Typography style={{ verticalAlign: 'middle', width: '50%' }}> Enable SSO Login</Typography>
                                    <SwitchInput
                                        style={{ verticalAlign: 'middle', width: '50%' }}
                                        onChange={handleAuth0Change}
                                        value={auth0ConfigEnabled}
                                    />
                                </Box>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Stack direction='row'>
                                        <Typography
                                            sx={{
                                                p: 1,
                                                borderRadius: 10,
                                                backgroundColor: theme.palette.primary.light,
                                                width: 'max-content',
                                                height: 'max-content'
                                            }}
                                            variant='h5'
                                        >
                                            {auth0CallbackURL}
                                        </Typography>
                                        <IconButton
                                            title='Copy Callback URL'
                                            color='success'
                                            onClick={(event) => {
                                                navigator.clipboard.writeText(auth0CallbackURL)
                                                setCopyAnchorEl(event.currentTarget)
                                                setTimeout(() => {
                                                    handleCloseCopyPopOver()
                                                }, 1500)
                                            }}
                                        >
                                            <IconCopy />
                                        </IconButton>
                                    </Stack>
                                </Box>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                                        <Typography>Auth0 Domain</Typography>
                                        <div style={{ flexGrow: 1 }}></div>
                                    </div>
                                    <OutlinedInput
                                        id='email'
                                        type='string'
                                        fullWidth
                                        size='small'
                                        placeholder='Auth0 Domain'
                                        name='auth0Domain'
                                        onChange={(e) => setAuth0Domain(e.target.value)}
                                        value={auth0Domain}
                                    />
                                </Box>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                                        <Typography>
                                            Client ID<span style={{ color: 'red' }}>&nbsp;*</span>
                                        </Typography>
                                        <div style={{ flexGrow: 1 }}></div>
                                    </div>
                                    <OutlinedInput
                                        id='name'
                                        type='string'
                                        fullWidth
                                        size='small'
                                        placeholder='Client ID'
                                        name='auth0ClientID'
                                        onChange={(e) => setAuth0ClientID(e.target.value)}
                                        value={auth0ClientID}
                                    />
                                </Box>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                                        <Typography>
                                            Client Secret<span style={{ color: 'red' }}>&nbsp;*</span>
                                        </Typography>
                                        <div style={{ flexGrow: 1 }}></div>
                                    </div>
                                    <OutlinedInput
                                        id='name'
                                        type='password'
                                        fullWidth
                                        size='small'
                                        placeholder='Client Secret'
                                        name='auth0ClientSecret'
                                        onChange={(e) => setAuth0ClientSecret(e.target.value)}
                                        value={auth0ClientSecret}
                                    />
                                </Box>
                            </Box>
                        </TabPanel>

                        <Divider />
                        <Box sx={{ gridColumn: 'span 2 / span 2' }}>
                            <Button
                                variant='outlined'
                                style={{ marginBottom: 10, marginTop: 10, marginRight: 10 }}
                                onClick={() => validateAndTest(getSelectedProviderName())}
                            >
                                {'Test ' + getSelectedProviderName() + ' Configuration'}
                            </Button>

                            <StyledButton
                                style={{ marginBottom: 10, marginTop: 10 }}
                                variant='contained'
                                onClick={() => validateAndSubmit()}
                            >
                                Save
                            </StyledButton>
                        </Box>
                    </Stack>
                )}
            </MainCard>
            {loading && <BackdropLoader open={loading} />}
            <Popover
                open={openCopyPopOver}
                anchorEl={copyAnchorEl}
                onClose={handleCloseCopyPopOver}
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right'
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left'
                }}
            >
                <Typography variant='h6' sx={{ pl: 1, pr: 1, color: 'white', background: theme.palette.success.dark }}>
                    Copied!
                </Typography>
            </Popover>
        </>
    )
}

export default SSOConfigPage
