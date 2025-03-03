import { Fragment, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import moment from 'moment/moment'
import { useNavigate } from 'react-router-dom'
import * as PropTypes from 'prop-types'

// material-ui
import {
    Skeleton,
    Box,
    Stack,
    TableContainer,
    Paper,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    IconButton,
    Button,
    Typography,
    Drawer,
    Chip
} from '@mui/material'
import { useTheme } from '@mui/material/styles'

// project imports
import MainCard from '@/ui-component/cards/MainCard'
import ConfirmDialog from '@/ui-component/dialog/ConfirmDialog'
import AddEditWorkspaceDialog from './AddEditWorkspaceDialog'
import ViewHeader from '@/layout/MainLayout/ViewHeader'
import ErrorBoundary from '@/ErrorBoundary'
import { StyledTableCell, StyledTableRow } from '@/ui-component/table/TableStyles'
import { PermissionIconButton, StyledPermissionButton } from '@/ui-component/button/RBACButtons'

// API
import workspaceApi from '@/api/workspace'
import tylerExt from '@/api/tylerExt'

// Hooks
import useApi from '@/hooks/useApi'
import useConfirm from '@/hooks/useConfirm'

// icons
import workspaces_emptySVG from '@/assets/images/workspaces_empty.svg'
import { IconTrash, IconEdit, IconPlus, IconX, IconUsers, IconEyeOff, IconEye, IconTrashOff } from '@tabler/icons-react'

// Utils
import { truncateString } from '@/utils/genericHelper'
import useNotifier from '@/utils/useNotifier'

// Store
import { store } from '@/store'
import { closeSnackbar as closeSnackbarAction, enqueueSnackbar as enqueueSnackbarAction } from '@/store/actions'
import { useError } from '@/store/context/ErrorContext'
import { workspacesUpdated, workspaceSwitchSuccess } from '@/store/reducers/authSlice'

function ShowWorkspaceRow(props) {
    const [open, setOpen] = useState(false)
    const theme = useTheme()
    const customization = useSelector((state) => state.customization)

    return (
        <Fragment key={props.rowKey}>
            <StyledTableRow hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <StyledTableCell component='th' scope='row'>
                    {props.workspace.name}
                </StyledTableCell>
                <StyledTableCell style={{ wordWrap: 'break-word', flexWrap: 'wrap', width: '30%' }}>
                    {truncateString(props.workspace?.description, 200)}
                </StyledTableCell>
                <StyledTableCell sx={{ textAlign: 'center' }}>
                    {props.workspace.assignedUsers.length}{' '}
                    {props.workspace.assignedUsers.length > 0 && (
                        <IconButton aria-label='expand row' size='small' color='inherit' onClick={() => setOpen(!open)}>
                            {props.workspace.assignedUsers.length > 0 && open ? <IconEyeOff /> : <IconEye />}
                        </IconButton>
                    )}
                </StyledTableCell>
                <StyledTableCell>{moment(props.workspace.updatedDate).format('MMMM Do YYYY, hh:mm A')}</StyledTableCell>
                <StyledTableCell>
                    <PermissionIconButton
                        permissionId={'workspace:update'}
                        title='Edit'
                        color='primary'
                        onClick={() => props.onEditClick(props.workspace)}
                    >
                        <IconEdit />
                    </PermissionIconButton>
                    <IconButton title='Workspace Users' color='primary' onClick={() => props.onViewUsersClick(props.workspace)}>
                        <IconUsers />
                    </IconButton>
                    {props.workspace.assignedUsers?.length > 1 || props.workspace.isOrgDefault === true ? (
                        <IconButton title='Delete' disabled={true} color='error' onClick={() => props.onDeleteClick(props.workspace)}>
                            <IconTrashOff />
                        </IconButton>
                    ) : (
                        <PermissionIconButton
                            permissionId={'workspace:delete'}
                            title='Delete'
                            color='error'
                            onClick={() => props.onDeleteClick(props.workspace)}
                        >
                            <IconTrash />
                        </PermissionIconButton>
                    )}
                </StyledTableCell>
            </StyledTableRow>
            <Drawer anchor='right' open={open} onClose={() => setOpen(false)} sx={{ minWidth: 320 }}>
                <Box sx={{ p: 4, height: 'auto', width: 650 }}>
                    <Typography sx={{ textAlign: 'left', mb: 2 }} variant='h2'>
                        Users
                    </Typography>
                    <TableContainer
                        style={{ display: 'flex', flexDirection: 'row' }}
                        sx={{ border: 1, borderColor: theme.palette.grey[900] + 25, borderRadius: 2 }}
                        component={Paper}
                    >
                        <Table aria-label='workspace users table'>
                            <TableHead
                                sx={{
                                    backgroundColor: customization.isDarkMode ? theme.palette.common.black : theme.palette.grey[100],
                                    height: 56
                                }}
                            >
                                <TableRow>
                                    <StyledTableCell sx={{ width: '60%' }}>User</StyledTableCell>
                                    <StyledTableCell sx={{ width: '40%' }}>Role</StyledTableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {props.workspace.assignedUsers.map((assignment, index) => (
                                    <TableRow key={index}>
                                        <StyledTableCell>
                                            {assignment.user || assignment.email}
                                            {assignment?.isOrgOwner === true && (
                                                <>
                                                    &nbsp;
                                                    <Chip label='ORGANIZATION OWNER' size={'small'} />
                                                </>
                                            )}
                                        </StyledTableCell>
                                        <StyledTableCell>{assignment.role}</StyledTableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            </Drawer>
        </Fragment>
    )
}

ShowWorkspaceRow.propTypes = {
    rowKey: PropTypes.any,
    workspace: PropTypes.any,
    onEditClick: PropTypes.func,
    onDeleteClick: PropTypes.func,
    onViewUsersClick: PropTypes.func,
    open: PropTypes.bool,
    theme: PropTypes.any
}

// ==============================|| Workspaces ||============================== //

const Workspaces = () => {
    const navigate = useNavigate()
    const theme = useTheme()
    const { confirm } = useConfirm()
    const currentUser = useSelector((state) => state.auth.user)
    const customization = useSelector((state) => state.customization)

    useNotifier()
    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [search, setSearch] = useState('')
    const dispatch = useDispatch()
    const { error, setError } = useError()
    const [isLoading, setLoading] = useState(true)
    const [workspaces, setWorkspaces] = useState([])
    const [showWorkspaceDialog, setShowWorkspaceDialog] = useState(false)
    const [workspaceDialogProps, setWorkspaceDialogProps] = useState({})

    const getAllWorkspaces = useApi(workspaceApi.getAllWorkspaces)
    const switchWorkspaceApi = useApi(workspaceApi.switchWorkspace)

    const showWorkspaceUsers = (selectedWorkspace) => {
        navigate(`/workspace-users/${selectedWorkspace.id}`)
    }

    const copyWorkspace = async () => {
        try {
            const body = JSON.stringify({
                fromWorkspaceId: workspaces[0].id,
                toWorkspaceId: workspaces[1].id
            })
            await tylerExt.copyWorkspace(body)
            enqueueSnackbar({
                message: `Workspace copied from ${workspaces[0].name} to ${workspaces[1].name}`,
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
        } catch (error) {
            console.error(error)
        }
    }

    const onSearchChange = (event) => {
        setSearch(event.target.value)
    }

    const addNew = () => {
        const dialogProp = {
            type: 'ADD',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Add',
            data: {}
        }
        setWorkspaceDialogProps(dialogProp)
        setShowWorkspaceDialog(true)
    }

    const edit = (workspace) => {
        const dialogProp = {
            type: 'EDIT',
            cancelButtonName: 'Cancel',
            confirmButtonName: 'Save',
            data: workspace
        }
        setWorkspaceDialogProps(dialogProp)
        setShowWorkspaceDialog(true)
    }

    const deleteWorkspace = async (workspace) => {
        const confirmPayload = {
            title: `Delete Workspace ${workspace.name}`,
            description: `This is irreversible and will remove all associated data inside the workspace. Are you sure you want to delete?`,
            confirmButtonName: 'Delete',
            cancelButtonName: 'Cancel'
        }
        const isConfirmed = await confirm(confirmPayload)

        if (isConfirmed) {
            try {
                const deleteResp = await workspaceApi.deleteWorkspace(workspace.id)
                if (deleteResp.data) {
                    if (deleteResp.data instanceof Array) {
                        store.dispatch(workspacesUpdated(deleteResp.data))
                    }
                    enqueueSnackbar({
                        message: 'Workspace deleted',
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
                    onConfirm(true)
                }
            } catch (error) {
                enqueueSnackbar({
                    message: `Failed to delete workspace: ${
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
    }

    const onConfirm = (isSwitchingToDefault) => {
        setShowWorkspaceDialog(false)
        getAllWorkspaces.request()

        if (isSwitchingToDefault) {
            const assignedWorkspaces = currentUser.assignedWorkspaces
            if (assignedWorkspaces.length === 0) {
                return
            }
            const defaultWorkspace = assignedWorkspaces.find((ws) => ws.isDefault === true)
            if (defaultWorkspace) {
                const workspaceId = defaultWorkspace.id
                switchWorkspaceApi.request(workspaceId, { workspaceId })
            } else {
                const workspaceId = assignedWorkspaces[0].id
                switchWorkspaceApi.request(workspaceId, { workspaceId })
            }
        }
    }

    useEffect(() => {
        if (switchWorkspaceApi.data) {
            store.dispatch(workspaceSwitchSuccess(switchWorkspaceApi.data))

            // get the current path and navigate to the same after refresh
            navigate('/', { replace: true })
            navigate(0)
        }
    }, [switchWorkspaceApi.data, navigate])

    function filterWorkspaces(data) {
        return data.name.toLowerCase().indexOf(search.toLowerCase()) > -1
    }

    useEffect(() => {
        getAllWorkspaces.request()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getAllWorkspaces.data) {
            setWorkspaces(getAllWorkspaces.data)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getAllWorkspaces.data])

    useEffect(() => {
        setLoading(getAllWorkspaces.loading)
    }, [getAllWorkspaces.loading])

    useEffect(() => {
        if (getAllWorkspaces.error) {
            setError(getAllWorkspaces.error)
        }
    }, [getAllWorkspaces.error, setError])

    return (
        <>
            <MainCard>
                {error ? (
                    <ErrorBoundary error={error} />
                ) : (
                    <Stack flexDirection='column' sx={{ gap: 3 }}>
                        <ViewHeader
                            isBackButton={false}
                            isEditButton={false}
                            onSearchChange={onSearchChange}
                            search={true}
                            title='Workspaces'
                            searchPlaceholder='Search Workspaces'
                        >
                            <StyledPermissionButton
                                permissionId={'workspace:create'}
                                variant='contained'
                                sx={{ borderRadius: 2, height: '100%' }}
                                onClick={copyWorkspace}
                            >
                                Copy
                            </StyledPermissionButton>
                            <StyledPermissionButton
                                permissionId={'workspace:create'}
                                variant='contained'
                                sx={{ borderRadius: 2, height: '100%' }}
                                onClick={addNew}
                                startIcon={<IconPlus />}
                            >
                                Add New
                            </StyledPermissionButton>
                        </ViewHeader>
                        {!isLoading && workspaces.length <= 0 ? (
                            <Stack sx={{ alignItems: 'center', justifyContent: 'center' }} flexDirection='column'>
                                <Box sx={{ p: 2, height: 'auto' }}>
                                    <img
                                        style={{ objectFit: 'cover', height: '20vh', width: 'auto' }}
                                        src={workspaces_emptySVG}
                                        alt='workspaces_emptySVG'
                                    />
                                </Box>
                                <div>No Workspaces Yet</div>
                            </Stack>
                        ) : (
                            <TableContainer
                                sx={{ border: 1, borderColor: theme.palette.grey[900] + 25, borderRadius: 2 }}
                                component={Paper}
                            >
                                <Table sx={{ minWidth: 650 }}>
                                    <TableHead
                                        sx={{
                                            backgroundColor: customization.isDarkMode
                                                ? theme.palette.common.black
                                                : theme.palette.grey[100],
                                            height: 56
                                        }}
                                    >
                                        <TableRow>
                                            <TableCell>Name</TableCell>
                                            <TableCell>Description</TableCell>
                                            <TableCell>Users</TableCell>
                                            <TableCell>Last Updated</TableCell>
                                            <TableCell> </TableCell>
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
                                                </StyledTableRow>
                                            </>
                                        ) : (
                                            <>
                                                {workspaces.filter(filterWorkspaces).map((ds, index) => (
                                                    <ShowWorkspaceRow
                                                        key={index}
                                                        workspace={ds}
                                                        rowKey={index}
                                                        onEditClick={edit}
                                                        onDeleteClick={deleteWorkspace}
                                                        onViewUsersClick={showWorkspaceUsers}
                                                    />
                                                ))}
                                            </>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Stack>
                )}
            </MainCard>
            {showWorkspaceDialog && (
                <AddEditWorkspaceDialog
                    show={showWorkspaceDialog}
                    dialogProps={workspaceDialogProps}
                    onCancel={() => setShowWorkspaceDialog(false)}
                    onConfirm={onConfirm}
                ></AddEditWorkspaceDialog>
            )}
            <ConfirmDialog />
        </>
    )
}

export default Workspaces
