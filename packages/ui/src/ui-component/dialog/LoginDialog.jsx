import { useState } from 'react'
import { useError } from '@/store/context/ErrorContext'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material'
import { useNavigate } from 'react-router-dom'

export const LoginDialog = () => {
    const { isLoginDialogOpen, setLoginDialogOpen, loginDialogProps } = useError()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const navigate = useNavigate()

    const handleLogin = () => {
        setLoginDialogOpen(false)
        localStorage.setItem('username', username)
        localStorage.setItem('password', password)
        navigate(0)
    }

    return (
        <Dialog
            onKeyUp={(e) => {
                if (e.key === 'Enter') {
                    handleLogin(username, password)
                }
            }}
            open={isLoginDialogOpen}
        >
            <DialogTitle>{loginDialogProps.title || 'Login'}</DialogTitle>
            <DialogContent>
                <TextField
                    // eslint-disable-next-line
                    autoFocus
                    margin='dense'
                    label='Username'
                    type='text'
                    fullWidth
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <TextField
                    margin='dense'
                    label='Password'
                    type='password'
                    fullWidth
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
            </DialogContent>
            <DialogActions>
                <Button disabled={!username || !password} onClick={handleLogin}>
                    {loginDialogProps.confirmButtonName || 'Login'}
                </Button>
            </DialogActions>
        </Dialog>
    )
}
