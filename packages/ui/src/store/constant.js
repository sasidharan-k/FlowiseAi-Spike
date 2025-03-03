// constant
export const gridSpacing = 3
export const drawerWidth = 260
export const appDrawerWidth = 320
export const headerHeight = 80
export const maxScroll = 100000
export const baseURL = import.meta.env.VITE_API_BASE_URL || window.location.origin
export const uiBaseURL = import.meta.env.VITE_UI_BASE_URL || window.location.origin
export const FLOWISE_CREDENTIAL_ID = 'FLOWISE_CREDENTIAL_ID'
export const REDACTED_CREDENTIAL_VALUE = '_FLOWISE_BLANK_07167752-1a71-43b1-bf8f-4f32252165db'
export const ErrorMessage = {
    INVALID_MISSING_TOKEN: 'Invalid or Missing token',
    TOKEN_EXPIRED: 'Token Expired',
    REFRESH_TOKEN_EXPIRED: 'Refresh Token Expired',
    FORBIDDEN: 'Forbidden',
    UNKNOWN_USER: 'Unknown Username or Password',
    INCORRECT_PASSWORD: 'Incorrect Password',
    INACTIVE_USER: 'Inactive User',
    INVALID_WORKSPACE: 'No Workspace Assigned',
    UNKNOWN_ERROR: 'Unknown Error'
}
