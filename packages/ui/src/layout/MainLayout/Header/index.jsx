import PropTypes from 'prop-types'
import { useSelector, useDispatch } from 'react-redux'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// material-ui
import { Button, Avatar, Box, ButtonBase, Switch } from '@mui/material'
import { useTheme, styled } from '@mui/material/styles'

// project imports
import LogoSection from '../LogoSection'
import ProfileSection from './ProfileSection'
import WorkspaceSwitcher from '@/layout/MainLayout/Header/WorkspaceSwitcher'

// assets
import { IconMenu2, IconX } from '@tabler/icons-react'

// store
import { store } from '@/store'
import { SET_DARKMODE } from '@/store/actions'
import { useConfig } from '@/store/context/ConfigContext'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'
import { logoutSuccess } from '@/store/reducers/authSlice'
import { workspacesUpdated } from '@/store/reducers/authSlice'

// API
import accountApi from '@/api/account'
import authApi from '@/api/auth'
import workspaceApi from '@/api/workspace'

// Hooks
import useApi from '@/hooks/useApi'
import useNotifier from '@/utils/useNotifier'

// ==============================|| MAIN NAVBAR / HEADER ||============================== //

const MaterialUISwitch = styled(Switch)(({ theme }) => ({
    width: 62,
    height: 34,
    padding: 7,
    '& .MuiSwitch-switchBase': {
        margin: 1,
        padding: 0,
        transform: 'translateX(6px)',
        '&.Mui-checked': {
            color: '#fff',
            transform: 'translateX(22px)',
            '& .MuiSwitch-thumb:before': {
                backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 20 20"><path fill="${encodeURIComponent(
                    '#fff'
                )}" d="M4.2 2.5l-.7 1.8-1.8.7 1.8.7.7 1.8.6-1.8L6.7 5l-1.9-.7-.6-1.8zm15 8.3a6.7 6.7 0 11-6.6-6.6 5.8 5.8 0 006.6 6.6z"/></svg>')`
            },
            '& + .MuiSwitch-track': {
                opacity: 1,
                backgroundColor: theme.palette.mode === 'dark' ? '#8796A5' : '#aab4be'
            }
        }
    },
    '& .MuiSwitch-thumb': {
        backgroundColor: theme.palette.mode === 'dark' ? '#003892' : '#001e3c',
        width: 32,
        height: 32,
        '&:before': {
            content: "''",
            position: 'absolute',
            width: '100%',
            height: '100%',
            left: 0,
            top: 0,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 20 20"><path fill="${encodeURIComponent(
                '#fff'
            )}" d="M9.305 1.667V3.75h1.389V1.667h-1.39zm-4.707 1.95l-.982.982L5.09 6.072l.982-.982-1.473-1.473zm10.802 0L13.927 5.09l.982.982 1.473-1.473-.982-.982zM10 5.139a4.872 4.872 0 00-4.862 4.86A4.872 4.872 0 0010 14.862 4.872 4.872 0 0014.86 10 4.872 4.872 0 0010 5.139zm0 1.389A3.462 3.462 0 0113.471 10a3.462 3.462 0 01-3.473 3.472A3.462 3.462 0 016.527 10 3.462 3.462 0 0110 6.528zM1.665 9.305v1.39h2.083v-1.39H1.666zm14.583 0v1.39h2.084v-1.39h-2.084zM5.09 13.928L3.616 15.4l.982.982 1.473-1.473-.982-.982zm9.82 0l-.982.982 1.473 1.473.982-.982-1.473-1.473zM9.305 16.25v2.083h1.389V16.25h-1.39z"/></svg>')`
        }
    },
    '& .MuiSwitch-track': {
        opacity: 1,
        backgroundColor: theme.palette.mode === 'dark' ? '#8796A5' : '#aab4be',
        borderRadius: 20 / 2
    }
}))

const Header = ({ handleLeftDrawerToggle }) => {
    const theme = useTheme()
    const navigate = useNavigate()

    const customization = useSelector((state) => state.customization)
    const logoutApi = useApi(accountApi.logout)
    const logoutAuthApi = useApi(authApi.logout)
    const assignedWorkspacesForUser = useApi(workspaceApi.getAssignedWorkspacesForUser)

    const [isDark, setIsDark] = useState(customization.isDarkMode)
    const dispatch = useDispatch()
    const { isCloud, isEnterpriseLicensed } = useConfig()
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const changeDarkMode = () => {
        dispatch({ type: SET_DARKMODE, isDarkMode: !isDark })
        setIsDark((isDark) => !isDark)
        localStorage.setItem('isDarkMode', !isDark)
    }

    const signOutClicked = () => {
        if (isEnterpriseLicensed) {
            logoutAuthApi.request({})
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
        } else if (isCloud) {
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
            store.dispatch(logoutSuccess())
            navigate('/', { replace: true })
            navigate(0)
        }
    }

    useEffect(() => {
        // Fetch Assigned Workspaces For User at Every reload
        const fetchAssignedWorkspacesForUser = async () => {
            await assignedWorkspacesForUser.request()
        }
        fetchAssignedWorkspacesForUser()
    }, [])

    useEffect(() => {
        // Update Assigned Workspaces For User in Redux Store at Every Time
        if (assignedWorkspacesForUser?.data instanceof Array) {
            store.dispatch(workspacesUpdated(assignedWorkspacesForUser.data))
        }
    }, [assignedWorkspacesForUser.data])

    useEffect(() => {
        try {
            if (logoutAuthApi.data) {
                store.dispatch(logoutSuccess())
                window.location.href = '/login'
            }
        } catch (e) {
            console.error(e)
        }
    }, [logoutAuthApi.data])

    useEffect(() => {
        try {
            if (logoutApi.data && logoutApi.data.message === 'logged_out') {
                window.location.href = logoutApi.data.redirectTo
            }
        } catch (e) {
            console.error(e)
        }
    }, [logoutApi.data])

    return (
        <>
            <Box
                sx={{
                    width: 228,
                    display: 'flex',
                    [theme.breakpoints.down('md')]: {
                        width: 'auto'
                    }
                }}
            >
                <Box component='span' sx={{ display: { xs: 'none', md: 'block' }, flexGrow: 1 }}>
                    <LogoSection />
                </Box>
                {(!isEnterpriseLicensed || (isEnterpriseLicensed && isAuthenticated)) && (
                    <ButtonBase sx={{ borderRadius: '12px', overflow: 'hidden' }}>
                        <Avatar
                            variant='rounded'
                            sx={{
                                ...theme.typography.commonAvatar,
                                ...theme.typography.mediumAvatar,
                                transition: 'all .2s ease-in-out',
                                background: theme.palette.secondary.light,
                                color: theme.palette.secondary.dark,
                                '&:hover': {
                                    background: theme.palette.secondary.dark,
                                    color: theme.palette.secondary.light
                                }
                            }}
                            onClick={handleLeftDrawerToggle}
                            color='inherit'
                        >
                            <IconMenu2 stroke={1.5} size='1.3rem' />
                        </Avatar>
                    </ButtonBase>
                )}
            </Box>
            <Box sx={{ flexGrow: 1 }} />
            {isEnterpriseLicensed && isAuthenticated && <WorkspaceSwitcher />}
            <MaterialUISwitch checked={isDark} onChange={changeDarkMode} />
            <Box sx={{ ml: 2 }}></Box>
            <ProfileSection handleLogout={signOutClicked} />
        </>
    )
}

Header.propTypes = {
    handleLeftDrawerToggle: PropTypes.func
}

export default Header
