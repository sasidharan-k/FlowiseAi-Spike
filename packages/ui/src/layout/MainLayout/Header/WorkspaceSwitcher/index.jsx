import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

// material-ui
import { alpha, styled } from '@mui/material/styles'
import { ListItemText, Button, ListItemIcon, MenuItem, Menu } from '@mui/material'
import { Check } from '@mui/icons-material'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'

// api
import workspaceApi from '@/api/workspace'
import useApi from '@/hooks/useApi'

// store
import { store } from '@/store'
import { workspaceSwitchSuccess } from '@/store/reducers/authSlice'

// ==============================|| WORKSPACE SWITCHER ||============================== //

const StyledMenu = styled((props) => (
    <Menu
        elevation={0}
        anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right'
        }}
        transformOrigin={{
            vertical: 'top',
            horizontal: 'right'
        }}
        {...props}
    />
))(({ theme }) => ({
    '& .MuiPaper-root': {
        borderRadius: 6,
        marginTop: theme.spacing(1),
        minWidth: 180,
        boxShadow:
            'rgb(255, 255, 255) 0px 0px 0px 0px, rgba(0, 0, 0, 0.05) 0px 0px 0px 1px, rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px',
        '& .MuiMenu-list': {
            padding: '4px 0'
        },
        '& .MuiMenuItem-root': {
            '& .MuiSvgIcon-root': {
                fontSize: 18,
                color: theme.palette.text.secondary,
                marginRight: theme.spacing(1.5)
            },
            '&:active': {
                backgroundColor: alpha(theme.palette.primary.main, theme.palette.action.selectedOpacity)
            }
        }
    }
}))

const WorkspaceSwitcher = () => {
    const navigate = useNavigate()

    const user = useSelector((state) => state.auth.user)
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)

    const [anchorEl, setAnchorEl] = useState(null)
    const open = Boolean(anchorEl)
    const prevOpen = useRef(open)

    const [activeWorkspace, setActiveWorkspace] = useState(undefined)
    const switchWorkspaceApi = useApi(workspaceApi.switchWorkspace)

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget)
    }

    const handleClose = () => {
        setAnchorEl(null)
    }

    const switchWorkspace = async (id, name) => {
        setAnchorEl(null)
        if (activeWorkspace !== name) {
            switchWorkspaceApi.request(id, { workspaceId: id })
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

    useEffect(() => {
        if (user?.assignedWorkspaces) {
            const activeWorkspace = user.assignedWorkspaces.find((ws) => ws.id === user.activeWorkspaceId)

            if (activeWorkspace) {
                setActiveWorkspace(activeWorkspace.name)
            } else if (user.activeWorkspaceId === null) {
                setActiveWorkspace('')
            }
        }

        prevOpen.current = open
    }, [open, user])

    return (
        <>
            {isAuthenticated && user && user.assignedWorkspaces?.length > 1 ? (
                <>
                    <Button
                        sx={{ mr: 4 }}
                        id='workspace-switcher'
                        aria-controls={open ? 'workspace-switcher-menu' : undefined}
                        aria-haspopup='true'
                        aria-expanded={open ? 'true' : undefined}
                        disableElevation
                        onClick={handleClick}
                        endIcon={<KeyboardArrowDownIcon />}
                    >
                        {'Workspace: ' + activeWorkspace}
                    </Button>
                    <StyledMenu
                        id='workspace-switcher-menu'
                        MenuListProps={{
                            'aria-labelledby': 'workspace-switcher'
                        }}
                        anchorEl={anchorEl}
                        open={open}
                        onClose={handleClose}
                    >
                        {user.assignedWorkspaces.map((workspace, index) => (
                            <MenuItem
                                onClick={() => {
                                    switchWorkspace(workspace.id, workspace.name)
                                }}
                                key={index}
                                disableRipple
                            >
                                {workspace.id === user.activeWorkspaceId ? (
                                    <>
                                        <ListItemIcon>
                                            <Check />
                                        </ListItemIcon>
                                        <ListItemText>{workspace.name}</ListItemText>
                                    </>
                                ) : (
                                    <ListItemText inset>{workspace.name}</ListItemText>
                                )}
                            </MenuItem>
                        ))}
                    </StyledMenu>
                </>
            ) : (
                <Button id='workspace-switcher' sx={{ mr: 4 }} disableElevation>
                    {'Workspace: ' + activeWorkspace}
                </Button>
            )}
        </>
    )
}

WorkspaceSwitcher.propTypes = {}

export default WorkspaceSwitcher
