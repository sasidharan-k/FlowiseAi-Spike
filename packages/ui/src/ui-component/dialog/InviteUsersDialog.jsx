import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { useState, useEffect, useCallback } from 'react'
import { useDispatch } from 'react-redux'

// Material
import {
    Autocomplete,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Box,
    Chip,
    Typography,
    TextField,
    Stack,
    Tooltip,
    styled,
    Popper
} from '@mui/material'
import { autocompleteClasses } from '@mui/material/Autocomplete'

// Project imports
import { StyledButton } from '@/ui-component/button/StyledButton'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'

// Icons
import { IconX, IconCircleCheck, IconUser } from '@tabler/icons-react'

// API
import workspaceApi from '@/api/workspace'
import authApi from '@/api/auth'

// Hooks
import useApi from '@/hooks/useApi'

// utils
import useNotifier from '@/utils/useNotifier'

// store
import {
    enqueueSnackbar as enqueueSnackbarAction,
    closeSnackbar as closeSnackbarAction,
    HIDE_CANVAS_DIALOG,
    SHOW_CANVAS_DIALOG
} from '@/store/actions'
import { workspacesUpdated } from '@/store/reducers/authSlice'
import { store } from '@/store'
import { debounce } from 'lodash'

const StyledChip = styled(Chip)(({ theme, chiptype }) => {
    let backgroundColor, color
    switch (chiptype) {
        case 'new':
            backgroundColor = theme.palette.success.light
            color = theme.palette.success.contrastText
            break
        case 'existing':
            backgroundColor = theme.palette.primary.main
            color = theme.palette.primary.contrastText
            break
        case 'already-in-workspace':
            backgroundColor = theme.palette.grey[300]
            color = theme.palette.text.primary
            break
        default:
            backgroundColor = theme.palette.primary.main
            color = theme.palette.primary.contrastText
    }
    return {
        backgroundColor,
        color,
        '& .MuiChip-deleteIcon': {
            color
        }
    }
})

const StyledPopper = styled(Popper)({
    boxShadow: '0px 8px 10px -5px rgb(0 0 0 / 20%), 0px 16px 24px 2px rgb(0 0 0 / 14%), 0px 6px 30px 5px rgb(0 0 0 / 12%)',
    borderRadius: '10px',
    [`& .${autocompleteClasses.listbox}`]: {
        boxSizing: 'border-box',
        '& ul': {
            padding: 10,
            margin: 10
        }
    }
})

const InviteUsersDialog = ({ show, dialogProps, onCancel, onConfirm }) => {
    const portalElement = document.getElementById('portal')

    const dispatch = useDispatch()

    // ==============================|| Snackbar ||============================== //

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [searchString, setSearchString] = useState('')
    const [workspaces, setWorkspaces] = useState([])
    const [selectedWorkspace, setSelectedWorkspace] = useState()
    const [userSearchResults, setUserSearchResults] = useState([])
    const [allUsers, setAllUsers] = useState([])
    const [selectedUsers, setSelectedUsers] = useState([])
    const [availableRoles, setAvailableRoles] = useState([])
    const [selectedRole, setSelectedRole] = useState()

    const getAllRolesApi = useApi(authApi.getAllRoles)
    const searchUsersApi = useApi(authApi.findUsers)
    const getAllWorkspacesApi = useApi(workspaceApi.getAllWorkspaces)

    useEffect(() => {
        if (getAllWorkspacesApi.data) {
            const ws = getAllWorkspacesApi.data
            const allWorkspaces = []
            for (let i = 0; i < ws.length; i += 1) {
                const workspace = ws[i]
                allWorkspaces.push({
                    id: workspace.id,
                    label: workspace.name,
                    name: workspace.name,
                    description: workspace.description
                })
            }
            setWorkspaces(allWorkspaces)
            if (dialogProps.type === 'EDIT' && dialogProps.data) {
                // when clicking on edit user in users page
                const userActiveWorkspace = allWorkspaces.find((workspace) => workspace.id === dialogProps.data.activeWorkspaceId)
                setSelectedWorkspace(userActiveWorkspace)
            }
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getAllWorkspacesApi.data])

    useEffect(() => {
        if (getAllRolesApi.data) {
            const roles = getAllRolesApi.data
            const roleList = []
            if (roles.length > 0) {
                roles.map((role) => {
                    roleList.push({
                        name: role.name,
                        label: role.name,
                        description: role.description
                    })
                })
            }
            setAvailableRoles(roleList)
            if (
                dialogProps.type === 'EDIT' &&
                dialogProps.data &&
                Array.isArray(dialogProps.data.assignedRoles) &&
                dialogProps.data.assignedRoles.length > 0
            ) {
                const userActiveRole = roleList.find((role) => role.name === dialogProps.data.assignedRoles[0].role)
                if (userActiveRole) setSelectedRole(userActiveRole)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getAllRolesApi.data])

    useEffect(() => {
        if (searchUsersApi.data) {
            setUserSearchResults(searchUsersApi.data)
        }
    }, [searchUsersApi.data])

    useEffect(() => {
        if (searchUsersApi.data) {
            setUserSearchResults(searchUsersApi.data)
            setAllUsers((prevResults) => {
                const newResults = [...prevResults]
                searchUsersApi.data.forEach((user) => {
                    if (!newResults.some((u) => u.id === user.id)) {
                        newResults.push(user)
                    }
                })
                return newResults
            })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchUsersApi.data])

    useEffect(() => {
        getAllRolesApi.request()
        getAllWorkspacesApi.request()
        setSearchString('')
        setUserSearchResults([])
        setSelectedUsers([])
        fetchInitialData()
        if (dialogProps.type === 'ADD' && dialogProps.data) {
            // when clicking on add user in workspace page
            const workspace = dialogProps.data
            setSelectedWorkspace({
                id: workspace.id,
                label: workspace.name,
                name: workspace.name,
                description: workspace.description
            })
        } else if (dialogProps.type === 'ADD' && !dialogProps.data) {
            // when clicking on add user in users page
            setSelectedWorkspace(null)
        }
        return () => {
            setSearchString('')
            setAllUsers([])
            setUserSearchResults([])
            setSelectedUsers([])
            setWorkspaces([])
            setSelectedRole(null)
            setSelectedWorkspace(null)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dialogProps])

    useEffect(() => {
        if (allUsers.length > 0) {
            if (dialogProps.type === 'EDIT' && dialogProps.data) {
                const selectedUser = allUsers.find((user) => user.id === dialogProps.data.id)
                // when clicking on edit user in users page
                handleChange(null, [selectedUser])
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allUsers])

    useEffect(() => {
        if (show) dispatch({ type: SHOW_CANVAS_DIALOG })
        else dispatch({ type: HIDE_CANVAS_DIALOG })
        return () => dispatch({ type: HIDE_CANVAS_DIALOG })
    }, [show, dispatch])

    const fetchInitialData = async () => {
        try {
            const response = await authApi.findUsers({ searchTerm: '' })
            if (response.data) {
                setUserSearchResults(() => response.data)
                setAllUsers(() => response.data) // Set original list only once
            }
        } catch (error) {
            console.error('Error fetching initial user data:', error)
        }
    }

    const calculateExistingAccounts = (selectedUsers, originalUserList) => {
        return selectedUsers
            .filter((user) => {
                // Check if the user exists in the original list
                const existingUser = originalUserList.find((originalUser) => originalUser.email === user.email)

                // Return true if the user exists and is not already in the workspace
                return existingUser && !user.alreadyInWorkspace
            })
            .map((user) => {
                // Return the full user object from the original list
                return originalUserList.find((originalUser) => originalUser.email === user.email)
            })
    }

    const addUsersToWorkspace = async () => {
        try {
            const existingAccounts = calculateExistingAccounts(selectedUsers, allUsers)
            const newUsers = selectedUsers.filter((user) => user.isNewUser)

            const saveObj = {
                userIds: existingAccounts.map((user) => user.id),
                newUsers: newUsers.map((user) => ({
                    email: user.email
                })),
                role: selectedRole
            }

            const response = await workspaceApi.linkUsers(selectedWorkspace.id, saveObj)

            if (response.data) {
                if (response.data instanceof Array) {
                    store.dispatch(workspacesUpdated(response.data))
                }
                enqueueSnackbar({
                    message: 'Users Assigned To Workspace',
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
                onConfirm(response.data.id)
            } else {
                throw new Error('No data received from the server')
            }
        } catch (error) {
            console.error('Error in addUsersToWorkspace:', error)
            enqueueSnackbar({
                message: `Failed to assign users to workspace: ${error.response?.data?.message || error.message || 'Unknown error'}`,
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

    const updateInvite = async () => {
        try {
            const saveObj = {
                id: dialogProps.data.id,
                email: dialogProps.data.email,
                role: selectedRole.name,
                activeWorkspaceId: selectedWorkspace.id
            }

            const saveResp = await authApi.inviteUser(saveObj)
            if (saveResp.data) {
                enqueueSnackbar({
                    message: 'Invite Updated',
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
            enqueueSnackbar({
                message: `Failed to update Invite: ${
                    typeof error.response?.data === 'object' ? error.response?.data?.message : error.response?.data
                }`,
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    persist: true,
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />)
                        </Button>
                    )
                }
            })
            onCancel()
        }
    }

    const validateEmail = (email) => {
        return email.match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        )
    }

    const handleChange = (event, newValue) => {
        const updatedUsers = newValue
            .filter((user) => {
                if (user.isNewUser) {
                    // For new invites, validate the email
                    return validateEmail(user.email)
                }
                return true // Keep all existing users
            })
            .map((user) => {
                if (user.isNewUser) {
                    // This is a new invite
                    return {
                        email: user.email,
                        isNewUser: true,
                        alreadyInWorkspace: false
                    }
                } else {
                    const existingUser =
                        userSearchResults.length > 0
                            ? userSearchResults.find((result) => result.email === user.email)
                            : selectedUsers.find((result) => result.email === user.email)
                    return {
                        ...existingUser,
                        isNewUser: false,
                        alreadyInWorkspace: selectedWorkspace
                            ? existingUser &&
                              existingUser.workspaceNames &&
                              existingUser.workspaceNames.some((ws) => ws.id === selectedWorkspace.id)
                            : false
                    }
                }
            })

        setSelectedUsers(updatedUsers)

        // If any invalid emails were filtered out, show a notification
        if (updatedUsers.length < newValue.length) {
            enqueueSnackbar({
                message: 'One or more invalid emails were removed.',
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'warning',
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
        }
    }

    const debouncedSearch = useCallback(
        () =>
            debounce((searchTerm) => {
                searchUsersApi.request({ searchTerm })
            }, 400),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    )

    const handleInputChange = (event, newInputValue) => {
        setSearchString(newInputValue)
        debouncedSearch(newInputValue)
    }

    const userSearchFilterOptions = (options, { inputValue }) => {
        const filteredOptions = options.filter((option) => option !== null && option !== undefined) ?? []

        const filterByNameOrEmail = filteredOptions.filter(
            (option) =>
                (option.name && option.name.toLowerCase().includes(inputValue.toLowerCase())) ||
                (option.email && option.email.toLowerCase().includes(inputValue.toLowerCase()))
        )

        // Early email detection regex
        const partialEmailRegex = /^[^\s@]+@?[^\s@]*$/

        if (filterByNameOrEmail.length === 0 && partialEmailRegex.test(inputValue)) {
            // If it looks like an email (even partially), show the invite option
            const inviteEmail = inputValue.includes('@') ? inputValue : `${inputValue}@`
            return [{ name: `Invite ${inviteEmail}`, email: inviteEmail, isNewUser: true }]
        }

        if (filterByNameOrEmail.length === 0) {
            return [{ name: 'No results found', email: '', isNoResult: true }]
        }

        return filterByNameOrEmail
    }

    const renderUserSearchInput = (params) => (
        <TextField {...params} variant='outlined' placeholder={selectedUsers.length > 0 ? '' : 'Invite users by name or email'} />
    )

    const renderUserSearchOptions = (props, option, { selected }) => (
        <li {...props}>
            {option.isNoResult ? (
                <Box
                    sx={{
                        width: '100%',
                        px: 1,
                        py: 0.5
                    }}
                >
                    <Typography color='text.secondary'>No results found</Typography>
                </Box>
            ) : option.isNewUser ? (
                <Box
                    sx={{
                        width: '100%',
                        px: 1,
                        py: 0.5
                    }}
                >
                    <Typography variant='h5' color='primary'>
                        {option.name}
                    </Typography>
                </Box>
            ) : (
                <Box
                    sx={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: 1,
                        py: 0.5
                    }}
                >
                    <Stack flexDirection='column'>
                        <Typography variant='h5'>{option.name}</Typography>
                        <Typography>{option.email}</Typography>
                    </Stack>
                    {selected ? <IconCircleCheck /> : null}
                </Box>
            )}
        </li>
    )

    const renderSelectedUsersTags = (tagValue, getTagProps) => {
        return selectedUsers.map((option, index) => {
            const chipProps = getTagProps({ index })
            let chipType = option.isNewUser ? 'new' : 'existing'
            if (option.alreadyInWorkspace) {
                chipType = 'already-in-workspace'
            }
            const ChipComponent = <StyledChip label={option.name || option.email} {...chipProps} chiptype={chipType} />

            const tooltipTitle = option.alreadyInWorkspace
                ? `${option.name || option.email} is already a member of this workspace and won't be invited again.`
                : option.isNewUser
                ? 'An invitation will be sent to this email address'
                : ''

            return tooltipTitle ? (
                <Tooltip key={chipProps.key} title={tooltipTitle} arrow>
                    {ChipComponent}
                </Tooltip>
            ) : (
                ChipComponent
            )
        })
    }

    const handleWorkspaceChange = (event, newWorkspace) => {
        setSelectedWorkspace(newWorkspace)
        setSelectedUsers((prevUsers) =>
            prevUsers.map((user) => ({
                ...user,
                alreadyInWorkspace: newWorkspace
                    ? user.workspaceNames && newWorkspace && user.workspaceNames.some((ws) => ws.id === newWorkspace.id)
                    : false
            }))
        )
    }

    const handleRoleChange = (event, newRole) => {
        setSelectedRole(newRole)
    }

    const getWorkspaceValue = () => {
        if (dialogProps.data) {
            return selectedWorkspace || {}
        }
        return selectedWorkspace || null
    }

    const getRoleValue = () => {
        if (dialogProps.data && dialogProps.type === 'ADD') {
            return selectedRole || {}
        }
        return selectedRole || null
    }

    const checkDisabled = () => {
        if (selectedUsers.length === 0 || !selectedWorkspace || !selectedRole) {
            return true
        }
        return false
    }

    const checkWorkspaceDisabled = () => {
        if (dialogProps.data && dialogProps.type === 'ADD') {
            return Boolean(selectedWorkspace)
        } else if (dialogProps.data && dialogProps.type === 'EDIT') {
            return dialogProps.disableWorkspaceSelection
        }
        return false
    }

    const component = show ? (
        <Dialog
            fullWidth
            maxWidth='md'
            open={show}
            onClose={onCancel}
            aria-labelledby='alert-dialog-title'
            aria-describedby='alert-dialog-description'
        >
            <DialogTitle sx={{ fontSize: '1rem' }} id='alert-dialog-title'>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                    <IconUser style={{ marginRight: '10px' }} />
                    Invite Users
                </div>
            </DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                    <Typography>
                        Select Users<span style={{ color: 'red' }}>&nbsp;*</span>
                    </Typography>
                    <Autocomplete
                        multiple
                        options={allUsers}
                        getOptionLabel={(option) => option.email || ''}
                        filterOptions={userSearchFilterOptions}
                        onChange={handleChange}
                        inputValue={searchString}
                        onInputChange={handleInputChange}
                        isOptionEqualToValue={(option, value) => option.email === value.email}
                        renderInput={renderUserSearchInput}
                        renderOption={renderUserSearchOptions}
                        renderTags={renderSelectedUsersTags}
                        sx={{ mt: 1 }}
                        value={selectedUsers}
                        PopperComponent={StyledPopper}
                    />
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                    <Box sx={{ gridColumn: 'span 1' }}>
                        <Typography>
                            Workspace<span style={{ color: 'red' }}>&nbsp;*</span>
                        </Typography>
                        <Autocomplete
                            disabled={checkWorkspaceDisabled()}
                            getOptionLabel={(option) => option.label || ''}
                            onChange={handleWorkspaceChange}
                            options={workspaces}
                            renderInput={(params) => <TextField {...params} variant='outlined' placeholder='Select Workspace' />}
                            sx={{ mt: 0.5 }}
                            value={getWorkspaceValue()}
                            PopperComponent={StyledPopper}
                        />
                    </Box>
                    <Box sx={{ gridColumn: 'span 1' }}>
                        <Typography>
                            Role to Assign<span style={{ color: 'red' }}>&nbsp;*</span>
                        </Typography>
                        <Autocomplete
                            getOptionLabel={(option) => option.label || ''}
                            onChange={handleRoleChange}
                            options={availableRoles}
                            renderInput={(params) => <TextField {...params} variant='outlined' placeholder='Select Role' />}
                            sx={{ mt: 0.5 }}
                            value={getRoleValue()}
                            PopperComponent={StyledPopper}
                        />
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={() => onCancel()}>{dialogProps.cancelButtonName}</Button>
                <StyledButton
                    disabled={checkDisabled()}
                    variant='contained'
                    onClick={() => (dialogProps.type === 'EDIT' ? updateInvite() : addUsersToWorkspace())}
                >
                    {dialogProps.confirmButtonName}
                </StyledButton>
            </DialogActions>
            <ConfirmDialog />
        </Dialog>
    ) : null

    return createPortal(component, portalElement)
}

InviteUsersDialog.propTypes = {
    show: PropTypes.bool,
    dialogProps: PropTypes.object,
    onCancel: PropTypes.func,
    onConfirm: PropTypes.func
}

export default InviteUsersDialog
