import AzureSSO from '../enterprise/sso/AzureSSO'
import GoogleSSO from '../enterprise/sso/GoogleSSO'
import Auth0SSO from '../enterprise/sso/Auth0SSO'

export const WHITELIST_URLS = [
    '/api/v1/verify/apikey/',
    '/api/v1/chatflows/apikey/',
    '/api/v1/public-chatflows',
    '/api/v1/public-chatbotConfig',
    '/api/v1/prediction/',
    '/api/v1/vector/upsert/',
    '/api/v1/node-icon/',
    '/api/v1/components-credentials-icon/',
    '/api/v1/chatflows-streaming',
    '/api/v1/chatflows-uploads',
    '/api/v1/openai-assistants-file/download',
    '/api/v1/feedback',
    '/api/v1/leads',
    '/api/v1/get-upload-file',
    '/api/v1/ip',
    '/api/v1/ping',
    '/api/v1/version',
    '/api/v1/attachments',
    '/api/v1/auth/resolve',
    '/api/v1/auth/login',
    '/api/v1/auth/refreshToken',
    '/api/v1/auth/users/register',
    '/api/v1/auth/password-token',
    '/api/v1/auth/password-reset',
    '/api/v1/settings',
    '/api/v1/metrics',
    '/api/v1/organizations/register',
    '/api/v1/sso/providers',
    AzureSSO.LOGIN_URI,
    AzureSSO.LOGOUT_URI,
    AzureSSO.CALLBACK_URI,
    GoogleSSO.LOGIN_URI,
    GoogleSSO.LOGOUT_URI,
    GoogleSSO.CALLBACK_URI,
    Auth0SSO.LOGIN_URI,
    Auth0SSO.LOGOUT_URI,
    Auth0SSO.CALLBACK_URI
]

export const DOCUMENT_STORE_BASE_FOLDER = 'docustore'

export const OMIT_QUEUE_JOB_DATA = ['componentNodes', 'appDataSource', 'sseStreamer', 'telemetry', 'cachePool']

export const INPUT_PARAMS_TYPE = [
    'asyncOptions',
    'options',
    'multiOptions',
    'datagrid',
    'string',
    'number',
    'boolean',
    'password',
    'json',
    'code',
    'date',
    'file',
    'folder',
    'tabs'
]
