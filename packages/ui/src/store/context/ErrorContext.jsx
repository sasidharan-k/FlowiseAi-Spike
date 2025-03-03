import { createContext, useContext, useState } from 'react'
import { redirectWhenUnauthorized } from '@/utils/genericHelper'
import PropTypes from 'prop-types'
import { useNavigate } from 'react-router-dom'
import { useConfig } from '@/store/context/ConfigContext'
import { store } from '@/store'
import { logoutSuccess } from '@/store/reducers/authSlice'
import { ErrorMessage } from '../constant'

const ErrorContext = createContext()

export const ErrorProvider = ({ children }) => {
    const [error, setError] = useState(null)
    const [isLoginDialogOpen, setLoginDialogOpen] = useState(false)
    const [loginDialogProps, setLoginDialogProps] = useState({})
    const navigate = useNavigate()
    const { isEnterpriseLicensed } = useConfig()

    const handleError = async (err) => {
        if (err?.response?.status === 403) {
            if (ErrorMessage.FORBIDDEN === err?.response?.data?.message) {
                navigate('/unauthorized')
            }
            store.dispatch(logoutSuccess())
            navigate('/login')
        } else if (err?.response?.status === 401) {
            if (isEnterpriseLicensed || ErrorMessage.INVALID_MISSING_TOKEN === err?.response?.data?.message) {
                store.dispatch(logoutSuccess())
                navigate('/login')
            } else {
                const isRedirect = err?.response?.data?.redirectTo && err?.response?.data?.error

                /*
                 * If the error response contains redirectTo and error, it means the user is unauthorized and
                 * needs to be redirected to the login page.
                 *
                 * If the redirectTo is not present, it means the user is unauthorized and needs to be shown a login form.
                 */
                if (isRedirect) {
                    // TODO: Redirect to login page if cloud, show login form if enterprise
                    redirectWhenUnauthorized({
                        error: err.response.data.error,
                        redirectTo: err.response.data.redirectTo
                    })
                } else {
                    setLoginDialogProps({
                        title: 'Login',
                        confirmButtonName: 'Login'
                    })
                    setLoginDialogOpen(true)
                }
            }
        } else setError(err)
    }

    return (
        <ErrorContext.Provider
            value={{
                error,
                setError,
                handleError,
                isLoginDialogOpen,
                setLoginDialogOpen,
                loginDialogProps,
                setLoginDialogProps
            }}
        >
            {children}
        </ErrorContext.Provider>
    )
}

export const useError = () => useContext(ErrorContext)

ErrorProvider.propTypes = {
    children: PropTypes.any
}
