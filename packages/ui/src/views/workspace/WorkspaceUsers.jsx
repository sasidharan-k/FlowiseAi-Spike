import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import moment from 'moment'

// material-ui
import {
    IconButton,
    Checkbox,
    Skeleton,
    Box,
    TableRow,
    TableContainer,
    Paper,
    Table,
    TableHead,
    TableBody,
    Button,
    Stack,
    Chip
} from '@mui/material'
import { useTheme } from '@mui/material/styles'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import { StyledTableCell, StyledTableRow } from '@/ui-component/table/TableStyles'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import ErrorBoundary from '@/ErrorBoundary'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import { PermissionButton, StyledPermissionButton } from '@/ui-component/button/RBACButtons'
import InviteUsersDialog from '@/ui-component/dialog/InviteUsersDialog'
import EditUserDialog from '@/views/users/EditUserDialog'

// API
import workspaceApi from '@/api/workspace'

// Hooks
import useApi from '@/hooks/useApi'
import useNotifier from '@/utils/useNotifier'
import useConfirm from '@/hooks/useConfirm'

// icons
import empty_datasetSVG from '@/assets/images/empty_datasets.svg'
import { IconEdit, IconX, IconUnlink, IconUserPlus } from '@tabler/icons-react'

// store
import { useError } from '@/store/context/ErrorContext'
import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'
import { store } from '@/store'
import { workspacesUpdated } from '@/store/reducers/authSlice'

const WorkspaceDetails = () => {
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)
    const dispatch = useDispatch()
    useNotifier()
    const { error, setError } = useError()

    const [search, setSearch] = useState('')
    const [workspace, setWorkspace] = useState({})
    const [workspaceUsers, setWorkspaceUsers] = useState([])
    const [isLoading, setLoading] = useState(true)
    const [usersSelected, setUsersSelected] = useState([])

    const [showAddUserDialog, setShowAddUserDialog] = useState(false)
    const [dialogProps, setDialogProps] = useState({})
    const [showEditDialog, setShowEditDialog] = useState(false)
    const [editDialogProps, setEditDialogProps] = useState({})

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const { confirm } = useConfirm()

    const getWorkspaceUsersApi = useApi(workspaceApi.getWorkspaceUsers)

    const URLpath = document.location.pathname.toString().split('/')
    const workspaceId = URLpath[URLpath.length - 1] === 'workspace-users' ? '' : URLpath[URLpath.length - 1]

    const onUsersSelectAllClick = (event) => {
        if (event.target.checked) {
            const newSelected = (workspaceUsers || []).map((n) => n.id)
            setUsersSelected(newSelected)
            return
        }
        setUsersSelected([])
    }

    const handleUserSelect = (event, id) => {
        const selectedIndex = usersSelected.indexOf(id)
        let newSelected = []

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(usersSelected, id)
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(usersSelected.slice(1))
        } else if (selectedIndex === usersSelected.length - 1) {
            newSelected = newSelected.concat(usersSelected.slice(0, -1))
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(usersSelected.slice(0, selectedIndex), usersSelected.slice(selectedIndex + 1))
        }
        setUsersSelected(newSelected)
    }

    const addUser = () => {
        const dialogProp = {
            type: 'ADD',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Send Invite',
            data: workspace
        }
        setDialogProps(dialogProp)
        setShowAddUserDialog(true)
    }

    const onEditClick = (user) => {
        if (user.status.toUpperCase() === 'INVITED') {
            editInvite(user)
        } else {
            editUser(user)
        }
    }

    const editInvite = (user) => {
        const userObj = {
            ...user,
            assignedRoles: [
                {
                    role: user.role,
                    active: true
                }
            ],
            activeWorkspaceId: workspaceId
        }
        const dialogProp = {
            type: 'EDIT',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Update Invite',
            data: userObj,
            disableWorkspaceSelection: true
        }
        setDialogProps(dialogProp)
        setShowAddUserDialog(true)
    }

    const editUser = (user) => {
        const userObj = {
            ...user,
            assignedRoles: [
                {
                    role: user.role,
                    active: true
                }
            ],
            activeWorkspaceId: workspaceId
        }
        const dialogProp = {
            type: 'EDIT',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Save',
            data: userObj
        }
        setEditDialogProps(dialogProp)
        setShowEditDialog(true)
    }

    const unlinkUser = async () => {
        const confirmPayload = {
            title: `Unlink`,
            description: `Remove selected users from the workspace?`,
            confirmButtonName: 'Unlink',
            cancelButtonName: 'Cancel'
        }
        //before unlinking, loop through the selected users and check if any of them is the org owner
        const orgOwner = workspaceUsers.find((user) => usersSelected.includes(user.id) && user.isOrgOwner === true)
        if (orgOwner) {
            enqueueSnackbar({
                message: `Organization owner cannot be removed from workspace.`,
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
            return
        }

        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            try {
                const resp = await workspaceApi.unlinkUsers(workspaceId, { workspaceId, userIds: usersSelected })
                if (resp.data) {
                    if (resp.data instanceof Array) {
                        store.dispatch(workspacesUpdated(resp.data))
                    }
                    enqueueSnackbar({
                        message: `${usersSelected.length} User(s) removed from workspace.`,
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
                    onConfirm()
                }
            } catch (error) {
                enqueueSnackbar({
                    message: `Failed to unlink users: ${
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
            setUsersSelected([])
        }
    }

    const onConfirm = () => {
        setShowAddUserDialog(false)
        setShowEditDialog(false)
        getWorkspaceUsersApi.request(workspaceId)
    }

    const onSearchChange = (event) => {
        setSearch(event.target.value)
    }

    function filterUsers(data) {
        return data.name?.toLowerCase().indexOf(search.toLowerCase()) > -1 || data.email?.toLowerCase().indexOf(search.toLowerCase()) > -1
    }

    useEffect(() => {
        getWorkspaceUsersApi.request(workspaceId)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getWorkspaceUsersApi.data) {
            const workspace = getWorkspaceUsersApi.data
            setWorkspace(workspace)
            const workSpaceUsers = workspace.users || []
            const orgAdmin = workSpaceUsers.find((user) => user.isOrgOwner === true)
            if (orgAdmin) {
                workSpaceUsers.splice(workSpaceUsers.indexOf(orgAdmin), 1)
                workSpaceUsers.unshift(orgAdmin)
            }
            setWorkspaceUsers(workSpaceUsers)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getWorkspaceUsersApi.data])

    useEffect(() => {
        if (getWorkspaceUsersApi.error) {
            setError(getWorkspaceUsersApi.error)
        }
    }, [getWorkspaceUsersApi.error, setError])

    useEffect(() => {
        setLoading(getWorkspaceUsersApi.loading)
    }, [getWorkspaceUsersApi.loading])

    return (
        <>
            <MainCard>
                {error ? (
                    <ErrorBoundary error={error} />
                ) : (
                    <Stack flexDirection='column' sx={{ gap: 3 }}>
                        <ViewHeader
                            isBackButton={true}
                            isEditButton={false}
                            onBack={() => window.history.back()}
                            search={workspaceUsers.length > 0}
                            onSearchChange={onSearchChange}
                            searchPlaceholder={'Search Users'}
                            title={workspace?.name + ': Workspace Users'}
                            description={'Manage workspace users and permissions.'}
                        >
                            {workspaceUsers.length > 0 && (
                                <>
                                    <PermissionButton
                                        permissionId={'workspace:unlink-user'}
                                        sx={{ borderRadius: 2, height: '100%' }}
                                        variant='outlined'
                                        disabled={usersSelected.length === 0}
                                        onClick={unlinkUser}
                                        startIcon={<IconUnlink />}
                                    >
                                        Unlink Selected
                                    </PermissionButton>
                                    <StyledPermissionButton
                                        permissionId={'workspace:add-user'}
                                        variant='contained'
                                        sx={{ borderRadius: 2, height: '100%' }}
                                        onClick={addUser}
                                        startIcon={<IconUserPlus />}
                                    >
                                        Add User
                                    </StyledPermissionButton>
                                </>
                            )}
                        </ViewHeader>
                        {!isLoading && workspaceUsers?.length <= 0 ? (
                            <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                                <Box sx={{ p: 2, height: 'auto' }}>
                                    <img
                                        style={{ objectFit: 'cover', height: '20vh', width: 'auto' }}
                                        src={empty_datasetSVG}
                                        alt='empty_datasetSVG'
                                    />
                                </Box>
                                <div>No Assigned Users Yet</div>
                                <StyledPermissionButton
                                    permissionId={'workspace:add-user'}
                                    variant='contained'
                                    sx={{ borderRadius: 2, height: '100%', mt: 2, color: 'white' }}
                                    startIcon={<IconUserPlus />}
                                    onClick={addUser}
                                >
                                    Add User
                                </StyledPermissionButton>
                            </Stack>
                        ) : (
                            <>
                                <TableContainer
                                    sx={{ border: 1, borderColor: theme.palette.grey[900] + 25, borderRadius: 2 }}
                                    component={Paper}
                                >
                                    <Table sx={{ minWidth: 650 }} aria-label='simple table'>
                                        <TableHead
                                            sx={{
                                                backgroundColor: customization.isDarkMode
                                                    ? theme.palette.common.black
                                                    : theme.palette.grey[100],
                                                height: 56
                                            }}
                                        >
                                            <TableRow>
                                                <StyledTableCell padding='checkbox'>
                                                    <Checkbox
                                                        color='primary'
                                                        checked={usersSelected.length === (workspaceUsers || []).length}
                                                        onChange={onUsersSelectAllClick}
                                                        inputProps={{
                                                            'aria-label': 'select all'
                                                        }}
                                                    />
                                                </StyledTableCell>
                                                <StyledTableCell>Email/Name</StyledTableCell>
                                                <StyledTableCell>Role</StyledTableCell>
                                                <StyledTableCell>Status</StyledTableCell>
                                                <StyledTableCell>Last Login</StyledTableCell>
                                                <StyledTableCell> </StyledTableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {isLoading ? (
                                                <>
                                                    <StyledTableRow>
                                                        <StyledTableCell>
                                                            <Skeleton variant='text' />
                                                        </StyledTableCell>
                                                        <StyledTableCell>
                                                            <Skeleton variant='text' />
                                                        </StyledTableCell>
                                                        <StyledTableCell>
                                                            <Skeleton variant='text' />
                                                        </StyledTableCell>
                                                        <StyledTableCell>
                                                            <Skeleton variant='text' />
                                                        </StyledTableCell>
                                                        <StyledTableCell>
                                                            <Skeleton variant='text' />
                                                        </StyledTableCell>
                                                        <StyledTableCell>
                                                            <Skeleton variant='text' />
                                                        </StyledTableCell>
                                                    </StyledTableRow>
                                                    <StyledTableRow>
                                                        <StyledTableCell>
                                                            <Skeleton variant='text' />
                                                        </StyledTableCell>
                                                        <StyledTableCell>
                                                            <Skeleton variant='text' />
                                                        </StyledTableCell>
                                                        <StyledTableCell>
                                                            <Skeleton variant='text' />
                                                        </StyledTableCell>
                                                        <StyledTableCell>
                                                            <Skeleton variant='text' />
                                                        </StyledTableCell>
                                                        <StyledTableCell>
                                                            <Skeleton variant='text' />
                                                        </StyledTableCell>
                                                        <StyledTableCell>
                                                            <Skeleton variant='text' />
                                                        </StyledTableCell>
                                                    </StyledTableRow>
                                                </>
                                            ) : (
                                                <>
                                                    {(workspaceUsers || []).filter(filterUsers).map((item, index) => (
                                                        <StyledTableRow
                                                            hover
                                                            key={index}
                                                            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                                        >
                                                            <StyledTableCell padding='checkbox'>
                                                                <Checkbox
                                                                    color='primary'
                                                                    checked={usersSelected.indexOf(item.id) !== -1}
                                                                    onChange={(event) => handleUserSelect(event, item.id)}
                                                                    inputProps={{
                                                                        'aria-labelledby': item.id
                                                                    }}
                                                                />
                                                            </StyledTableCell>
                                                            <StyledTableCell>
                                                                {item.email}
                                                                {item.name && (
                                                                    <>
                                                                        <br />
                                                                        {item.name}
                                                                    </>
                                                                )}
                                                                {item.isOrgOwner && (
                                                                    <>
                                                                        {' '}
                                                                        <br />
                                                                        <Chip size='small' label={'ORGANIZATION OWNER'} />{' '}
                                                                    </>
                                                                )}
                                                            </StyledTableCell>
                                                            <StyledTableCell>{item.role}</StyledTableCell>
                                                            <StyledTableCell>
                                                                {'ACTIVE' === item.status.toUpperCase() && (
                                                                    <Chip color={'success'} label={item.status.toUpperCase()} />
                                                                )}
                                                                {'INVITED' === item.status.toUpperCase() && (
                                                                    <Chip color={'warning'} label={item.status.toUpperCase()} />
                                                                )}
                                                                {'INACTIVE' === item.status.toUpperCase() && (
                                                                    <Chip color={'error'} label={item.status.toUpperCase()} />
                                                                )}
                                                            </StyledTableCell>
                                                            <StyledTableCell>
                                                                {!item.lastLogin
                                                                    ? 'Never'
                                                                    : moment(item.lastLogin).format('DD/MM/YYYY HH:mm')}
                                                            </StyledTableCell>
                                                            <StyledTableCell>
                                                                <IconButton title='Edit' color='primary' onClick={() => onEditClick(item)}>
                                                                    <IconEdit />
                                                                </IconButton>
                                                            </StyledTableCell>
                                                        </StyledTableRow>
                                                    ))}
                                                </>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </>
                        )}
                    </Stack>
                )}
            </MainCard>
            {showAddUserDialog && (
                <InviteUsersDialog
                    show={showAddUserDialog}
                    dialogProps={dialogProps}
                    onCancel={() => setShowAddUserDialog(false)}
                    onConfirm={onConfirm}
                ></InviteUsersDialog>
            )}
            {showEditDialog && (
                <EditUserDialog
                    show={showEditDialog}
                    dialogProps={editDialogProps}
                    onCancel={() => setShowEditDialog(false)}
                    onConfirm={onConfirm}
                    setError={setError}
                ></EditUserDialog>
            )}
            <ConfirmDialog />
        </>
    )
}

export default WorkspaceDetails
