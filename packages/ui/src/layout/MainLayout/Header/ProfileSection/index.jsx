import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import PropTypes from 'prop-types'

import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction, REMOVE_DIRTY } from '@/store/actions'
import useNotifier from '@/utils/useNotifier'
import { exportData, stringify } from '@/utils/exportImport'

// material-ui
import {
    Avatar,
    Box,
    Button,
    ButtonBase,
    ClickAwayListener,
    Divider,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Paper,
    Popper,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    Stack,
    FormControlLabel,
    Checkbox,
    DialogActions
} from '@mui/material'
import { useTheme } from '@mui/material/styles'

// third-party
import PerfectScrollbar from 'react-perfect-scrollbar'
import moment from 'moment/moment'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import AboutDialog from '@/ui-component/dialog/AboutDialog'
import Transitions from '@/ui-component/extended/Transitions'
import { PermissionListItemButton } from '@/ui-component/button/RBACButtons'

// assets
import { IconUserEdit, IconFileExport, IconFileUpload, IconLogout, IconX, IconSettings, IconInfoCircle } from '@tabler/icons-react'
import './index.css'
import ExportingGIF from '@/assets/images/Exporting.gif'

// API
import accountApi from '@/api/account'
import exportImportApi from '@/api/exportimport'

// Hooks
import useApi from '@/hooks/useApi'
import { useConfig } from '@/store/context/ConfigContext'
import { getErrorMessage } from '@/utils/errorHandler'

const dataToExport = ['Chatflows', 'Agentflows', 'Tools', 'Variables', 'Assistants']

const ExportDialog = ({ show, onCancel, onExport }) => {
    const portalElement = document.getElementById('portal')

    const [selectedData, setSelectedData] = useState(['Chatflows', 'Agentflows', 'Tools', 'Variables', 'Assistants'])
    const [isExporting, setIsExporting] = useState(false)

    useEffect(() => {
        if (show) setIsExporting(false)

        return () => {
            setIsExporting(false)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show])

    const component = show ? (
        <Dialog
            onClose={!isExporting ? onCancel : undefined}
            open={show}
            fullWidth
            maxWidth='sm'
            aria-labelledby='export-dialog-title'
            aria-describedby='export-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='export-dialog-title'>
                {!isExporting ? 'Select Data to Export' : 'Exporting..'}
            </DialogTitle>
            <DialogContent>
                {!isExporting && (
                    <Stack direction='row' sx={{ gap: 1, flexWrap: 'wrap' }}>
                        {dataToExport.map((data, index) => (
                            <FormControlLabel
                                key={index}
                                size='small'
                                control={
                                    <Checkbox
                                        color='success'
                                        checked={selectedData.includes(data)}
                                        onChange={(event) => {
                                            setSelectedData(
                                                event.target.checked
                                                    ? [...selectedData, data]
                                                    : selectedData.filter((item) => item !== data)
                                            )
                                        }}
                                    />
                                }
                                label={data}
                            />
                        ))}
                    </Stack>
                )}
                {isExporting && (
                    <Box sx={{ height: 'auto', display: 'flex', justifyContent: 'center', mb: 3 }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <img
                                style={{
                                    objectFit: 'cover',
                                    height: 'auto',
                                    width: 'auto'
                                }}
                                src={ExportingGIF}
                                alt='ExportingGIF'
                            />
                            <span>Exporting data might takes a while</span>
                        </div>
                    </Box>
                )}
            </DialogContent>
            {!isExporting && (
                <DialogActions>
                    <Button onClick={onCancel}>Cancel</Button>
                    <Button
                        disabled={selectedData.length === 0}
                        variant='contained'
                        onClick={() => {
                            setIsExporting(true)
                            onExport(selectedData)
                        }}
                    >
                        Export
                    </Button>
                </DialogActions>
            )}
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

ExportDialog.propTypes = {
    show: PropTypes.bool,
    onCancel: PropTypes.func,
    onExport: PropTypes.func
}

// ==============================|| PROFILE MENU ||============================== //

const ProfileSection = ({ handleLogout }) => {
    const theme = useTheme()

    const customization = useSelector((state) => state.customization)
    const getAccountDataApi = useApi(accountApi.getAccountData)

    const [open, setOpen] = useState(false)
    const [aboutDialogOpen, setAboutDialogOpen] = useState(false)

    const [profileName, setProfileName] = useState('')
    const [email, setEmail] = useState('')
    const [exportDialogOpen, setExportDialogOpen] = useState(false)

    const { isCloud, isEnterpriseLicensed } = useConfig()
    const anchorRef = useRef(null)
    const inputRef = useRef()

    const navigate = useNavigate()
    const user = useSelector((state) => state.auth.user)
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)

    const importAllApi = useApi(exportImportApi.importData)
    const exportAllApi = useApi(exportImportApi.exportData)
    const prevOpen = useRef(open)

    // ==============================|| Snackbar ||============================== //

    useNotifier()
    const dispatch = useDispatch()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const handleClose = (event) => {
        if (anchorRef.current && anchorRef.current.contains(event.target)) {
            return
        }
        setOpen(false)
    }

    const handleChangePassword = () => {
        navigate('/change-password')
    }

    const handleToggle = () => {
        setOpen((prevOpen) => !prevOpen)
    }

    const errorFailed = (message) => {
        enqueueSnackbar({
            message: message,
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

    const fileChange = (e) => {
        if (!e.target.files) return

        const file = e.target.files[0]

        const reader = new FileReader()
        reader.onload = (evt) => {
            if (!evt?.target?.result) {
                return
            }
            const body = JSON.parse(evt.target.result)
            importAllApi.request(body)
        }
        reader.readAsText(file)
    }

    const importAllSuccess = () => {
        dispatch({ type: REMOVE_DIRTY })
        enqueueSnackbar({
            message: `Import All successful`,
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

    const importAll = () => {
        inputRef.current.click()
    }

    const onExport = (data) => {
        const body = {}
        if (data.includes('Chatflows')) body.chatflow = true
        if (data.includes('Agentflows')) body.agentflow = true
        if (data.includes('Tools')) body.tool = true
        if (data.includes('Variables')) body.variable = true
        if (data.includes('Assistants')) body.assistant = true

        exportAllApi.request(body)
    }

    useEffect(() => {
        if (importAllApi.data) {
            importAllSuccess()
            navigate(0)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [importAllApi.data])

    useEffect(() => {
        if (importAllApi.error) {
            let errMsg = 'Invalid Imported File'
            let error = importAllApi.error
            if (error?.response?.data) {
                errMsg = typeof error.response.data === 'object' ? error.response.data.message : error.response.data
            }
            errorFailed(`Failed to import: ${errMsg}`)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [importAllApi.error])

    useEffect(() => {
        if (exportAllApi.data) {
            setExportDialogOpen(false)
            try {
                const dataStr = stringify(exportData(exportAllApi.data))
                //const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
                const blob = new Blob([dataStr], { type: 'application/json' })
                const dataUri = URL.createObjectURL(blob)

                const linkElement = document.createElement('a')
                linkElement.setAttribute('href', dataUri)
                linkElement.setAttribute('download', exportAllApi.data.FileDefaultName)
                linkElement.click()
            } catch (error) {
                errorFailed(`Failed to export all: ${getErrorMessage(error)}`)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [exportAllApi.data])

    useEffect(() => {
        if (exportAllApi.error) {
            setExportDialogOpen(false)
            let errMsg = 'Internal Server Error'
            let error = exportAllApi.error
            if (error?.response?.data) {
                errMsg = typeof error.response.data === 'object' ? error.response.data.message : error.response.data
            }
            errorFailed(`Failed to export: ${errMsg}`)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [exportAllApi.error])

    useEffect(() => {
        if (prevOpen.current === true && open === false) {
            anchorRef.current.focus()
        }
        prevOpen.current = open
    }, [open])

    useEffect(() => {
        if (getAccountDataApi.data) {
            setProfileName(getAccountDataApi.data?.user?.name || '')
            setEmail(getAccountDataApi.data?.user?.email)
        }
    }, [getAccountDataApi.data])

    useEffect(() => {
        if (isCloud) {
            getAccountDataApi.request()
        } else {
            const userName = localStorage.getItem('username')
            setProfileName(userName || 'user')
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCloud])

    const renderName = () => {
        if (isCloud) {
            return profileName || email
        } else {
            return profileName || 'user'
        }
    }

    return (
        <>
            <ButtonBase ref={anchorRef} sx={{ borderRadius: '12px', overflow: 'hidden' }}>
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
                    onClick={handleToggle}
                    color='inherit'
                >
                    <IconSettings stroke={1.5} size='1.3rem' />
                </Avatar>
            </ButtonBase>
            <Popper
                placement='bottom-end'
                open={open}
                anchorEl={anchorRef.current}
                role={undefined}
                transition
                disablePortal
                popperOptions={{
                    modifiers: [
                        {
                            name: 'offset',
                            options: {
                                offset: [0, 14]
                            }
                        }
                    ]
                }}
            >
                {({ TransitionProps }) => (
                    <Transitions in={open} {...TransitionProps}>
                        <Paper>
                            <ClickAwayListener onClickAway={handleClose}>
                                <MainCard border={false} elevation={16} content={false} boxShadow shadow={theme.shadows[16]}>
                                    {isEnterpriseLicensed && isAuthenticated && user ? (
                                        <Box sx={{ p: 2 }}>
                                            <Typography component='span' variant='h4'>
                                                {user.name}
                                            </Typography>
                                            <Typography component='span' variant='caption'>
                                                <br />
                                                {!user.lastLogin ? 'First Login' : moment(user.lastLogin).format('DD-MMM-YYYY HH:mm')}
                                            </Typography>
                                        </Box>
                                    ) : (
                                        <Box sx={{ p: 2 }}>
                                            <Typography component='span' variant='h4'>
                                                {renderName()}
                                            </Typography>
                                        </Box>
                                    )}
                                    <PerfectScrollbar style={{ height: '100%', maxHeight: 'calc(100vh - 250px)', overflowX: 'hidden' }}>
                                        <Box sx={{ p: 2 }}>
                                            <Divider />
                                            <List
                                                component='nav'
                                                sx={{
                                                    width: '100%',
                                                    maxWidth: 250,
                                                    minWidth: 200,
                                                    backgroundColor: theme.palette.background.paper,
                                                    borderRadius: '10px',
                                                    [theme.breakpoints.down('md')]: {
                                                        minWidth: '100%'
                                                    },
                                                    '& .MuiListItemButton-root': {
                                                        mt: 0.5
                                                    }
                                                }}
                                            >
                                                <PermissionListItemButton
                                                    permissionId='workspace:export'
                                                    sx={{ borderRadius: `${customization.borderRadius}px` }}
                                                    onClick={() => {
                                                        setExportDialogOpen(true)
                                                    }}
                                                >
                                                    <ListItemIcon>
                                                        <IconFileExport stroke={1.5} size='1.3rem' />
                                                    </ListItemIcon>
                                                    <ListItemText primary={<Typography variant='body2'>Export</Typography>} />
                                                </PermissionListItemButton>
                                                <PermissionListItemButton
                                                    permissionId='workspace:import'
                                                    sx={{ borderRadius: `${customization.borderRadius}px` }}
                                                    onClick={() => {
                                                        importAll()
                                                    }}
                                                >
                                                    <ListItemIcon>
                                                        <IconFileUpload stroke={1.5} size='1.3rem' />
                                                    </ListItemIcon>
                                                    <ListItemText primary={<Typography variant='body2'>Import</Typography>} />
                                                </PermissionListItemButton>
                                                <input ref={inputRef} type='file' hidden onChange={fileChange} accept='.json' />
                                                <ListItemButton
                                                    sx={{ borderRadius: `${customization.borderRadius}px` }}
                                                    onClick={() => {
                                                        setOpen(false)
                                                        setAboutDialogOpen(true)
                                                    }}
                                                >
                                                    <ListItemIcon>
                                                        <IconInfoCircle stroke={1.5} size='1.3rem' />
                                                    </ListItemIcon>
                                                    <ListItemText primary={<Typography variant='body2'>Version</Typography>} />
                                                </ListItemButton>
                                                {isEnterpriseLicensed && isAuthenticated && !user.isSSO && (
                                                    <ListItemButton
                                                        sx={{ borderRadius: `${customization.borderRadius}px` }}
                                                        onClick={handleChangePassword}
                                                    >
                                                        <ListItemIcon>
                                                            <IconUserEdit stroke={1.5} size='1.3rem' />
                                                        </ListItemIcon>
                                                        <ListItemText primary={<Typography variant='body2'>Update Profile</Typography>} />
                                                    </ListItemButton>
                                                )}
                                                <ListItemButton
                                                    sx={{ borderRadius: `${customization.borderRadius}px` }}
                                                    onClick={handleLogout}
                                                >
                                                    <ListItemIcon>
                                                        <IconLogout stroke={1.5} size='1.3rem' />
                                                    </ListItemIcon>
                                                    <ListItemText primary={<Typography variant='body2'>Logout</Typography>} />
                                                </ListItemButton>
                                            </List>
                                        </Box>
                                    </PerfectScrollbar>
                                </MainCard>
                            </ClickAwayListener>
                        </Paper>
                    </Transitions>
                )}
            </Popper>
            <AboutDialog show={aboutDialogOpen} onCancel={() => setAboutDialogOpen(false)} />
            <ExportDialog show={exportDialogOpen} onCancel={() => setExportDialogOpen(false)} onExport={(data) => onExport(data)} />
        </>
    )
}

ProfileSection.propTypes = {
    handleLogout: PropTypes.func
}

export default ProfileSection
