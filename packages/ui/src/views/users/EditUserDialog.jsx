import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'

// Material
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Box, Typography, OutlinedInput } from '@mui/material'

// Project imports
import { StyledButton } from '@/ui-component/button/StyledButton'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import { Dropdown } from '@/ui-component/dropdown/Dropdown'

// Icons
import { IconX, IconUser } from '@tabler/icons-react'

// API
import authApi from '@/api/auth'

// utils
import useNotifier from '@/utils/useNotifier'

// store
import { HIDE_CANVAS_DIALOG, SHOW_CANVAS_DIALOG } from '@/store/actions'
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction } from '@/store/actions'

const statuses = [
    {
        label: 'Active',
        name: 'active'
    },
    {
        label: 'Inactive',
        name: 'inactive'
    }
]

const EditUserDialog = ({ show, dialogProps, onCancel, onConfirm, setError }) => {
    const portalElement = document.getElementById('portal')

    const dispatch = useDispatch()

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [username, setUsername] = useState('')
    const [userEmail, setUserEmail] = useState('')
    const [status, setStatus] = useState('active')
    const [user, setUser] = useState({})

    useEffect(() => {
        if (dialogProps.type === 'EDIT' && dialogProps.data) {
            setUserEmail(dialogProps.data.email)
            setUsername(dialogProps.data.name)
            setStatus(dialogProps.data.status)
            setUser(dialogProps.data)
        }

        return () => {
            setUserEmail('')
            setUsername('')
            setStatus('active')
            setUser({})
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dialogProps])

    useEffect(() => {
        if (show) dispatch({ type: SHOW_CANVAS_DIALOG })
        else dispatch({ type: HIDE_CANVAS_DIALOG })
        return () => dispatch({ type: HIDE_CANVAS_DIALOG })
    }, [show, dispatch])

    const updateUser = async () => {
        try {
            const saveObj = {
                email: userEmail,
                name: username,
                status: status
            }

            const saveResp = await authApi.updateUser(user.id, saveObj)
            if (saveResp.data) {
                enqueueSnackbar({
                    message: 'User Details Updated',
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
                onConfirm(saveResp.data.id)
            }
        } catch (error) {
            setError(err)
            enqueueSnackbar({
                message: `Failed to update User: ${
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
            onCancel()
        }
    }

    const component = show ? (
        <Dialog
            fullWidth
            maxWidth='sm'
            open={show}
            onClose={onCancel}
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    <IconUser style={{ marginRight: '10px' }} />
                    {'Update User Details'}
                </div>
            </DialogTitle>
            <DialogContent>
                <Box sx={{ p: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                        <Typography>
                            Email<span style={{ color: 'red' }}>&nbsp;*</span>
                        </Typography>

                        <div style={{ flexGrow: 1 }}></div>
                    </div>
                    <OutlinedInput
                        size='small'
                        sx={{ mt: 1 }}
                        type='string'
                        fullWidth
                        key='userEmail'
                        onChange={(e) => setUserEmail(e.target.value)}
                        value={userEmail ?? ''}
                    />
                </Box>
                <Box sx={{ p: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                        <Typography>Username</Typography>

                        <div style={{ flexGrow: 1 }}></div>
                    </div>
                    <OutlinedInput
                        size='small'
                        sx={{ mt: 1 }}
                        type='string'
                        fullWidth
                        key='username'
                        onChange={(e) => setUsername(e.target.value)}
                        value={username ?? ''}
                    />
                </Box>
                <Box sx={{ p: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                        <Typography>
                            Account Status<span style={{ color: 'red' }}>&nbsp;*</span>
                        </Typography>
                        <div style={{ flexGrow: 1 }}></div>
                    </div>
                    <Dropdown
                        key={status}
                        name='status'
                        disabled={dialogProps?.data?.isOrgOwner}
                        options={statuses}
                        onSelect={(newValue) => setStatus(newValue)}
                        value={status ?? 'choose an option'}
                        id='dropdown_status'
                    />
                    {dialogProps?.data?.isOrgOwner && (
                        <Typography variant='caption'>
                            <i>Cannot change status of the organization owner!</i>
                        </Typography>
                    )}
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <StyledButton disabled={!userEmail} variant='contained' onClick={() => updateUser()} id='btn_confirmInviteUser'>
                    {dialogProps.confirmButtonName}
                </StyledButton>
            </DialogActions>
            <ConfirmDialog />
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

EditUserDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func,
    setError: PropTypes.func
}

export default EditUserDialog
