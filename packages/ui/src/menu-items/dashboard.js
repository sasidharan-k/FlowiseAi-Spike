// assets
import {
    IconList,
    IconUsersGroup,
    IconHierarchy,
    IconBuildingStore,
    IconKey,
    IconTool,
    IconLock,
    IconRobot,
    IconSettings,
    IconVariable,
    IconFiles,
    IconTestPipe,
    IconMicroscope,
    IconDatabase,
    IconChartHistogram,
    IconUserEdit,
    IconFileUpload,
    IconClipboardList,
    IconStack2,
    IconUsers,
    IconLockCheck,
    IconFileDatabase,
    IconShieldLock
} from '@tabler/icons-react'

// constant
const icons = {
    IconHierarchy,
    IconUsersGroup,
    IconBuildingStore,
    IconList,
    IconKey,
    IconTool,
    IconLock,
    IconRobot,
    IconSettings,
    IconVariable,
    IconFiles,
    IconTestPipe,
    IconMicroscope,
    IconDatabase,
    IconUserEdit,
    IconChartHistogram,
    IconFileUpload,
    IconClipboardList,
    IconStack2,
    IconUsers,
    IconLockCheck,
    IconFileDatabase,
    IconShieldLock
}

// ==============================|| DASHBOARD MENU ITEMS ||============================== //

const dashboard = {
    id: 'dashboard',
    title: '',
    type: 'group',
    children: [
        {
            id: 'primary',
            title: '',
            type: 'group',
            children: [
                {
                    id: 'chatflows',
                    title: 'Chatflows',
                    type: 'item',
                    url: '/chatflows',
                    icon: icons.IconHierarchy,
                    breadcrumbs: true,
                    permission: 'chatflows:view'
                },
                {
                    id: 'agentflows',
                    title: 'Agentflows',
                    type: 'item',
                    url: '/agentflows',
                    icon: icons.IconUsersGroup,
                    breadcrumbs: true,
                    permission: 'agentflows:view'
                },
                {
                    id: 'assistants',
                    title: 'Assistants',
                    type: 'item',
                    url: '/assistants',
                    icon: icons.IconRobot,
                    breadcrumbs: true,
                    permission: 'assistants:view'
                },
                {
                    id: 'marketplaces',
                    title: 'Marketplaces',
                    type: 'item',
                    url: '/marketplaces',
                    icon: icons.IconBuildingStore,
                    breadcrumbs: true,
                    permission: 'templates:marketplace,templates:custom'
                },
                {
                    id: 'tools',
                    title: 'Tools',
                    type: 'item',
                    url: '/tools',
                    icon: icons.IconTool,
                    breadcrumbs: true,
                    permission: 'tools:view'
                },
                {
                    id: 'credentials',
                    title: 'Credentials',
                    type: 'item',
                    url: '/credentials',
                    icon: icons.IconLock,
                    breadcrumbs: true,
                    permission: 'credentials:view'
                },
                {
                    id: 'variables',
                    title: 'Variables',
                    type: 'item',
                    url: '/variables',
                    icon: icons.IconVariable,
                    breadcrumbs: true,
                    permission: 'variables:view'
                },
                {
                    id: 'apikey',
                    title: 'API Keys',
                    type: 'item',
                    url: '/apikey',
                    icon: icons.IconKey,
                    breadcrumbs: true,
                    permission: 'apikeys:view'
                },
                {
                    id: 'document-stores',
                    title: 'Document Stores',
                    type: 'item',
                    url: '/document-stores',
                    icon: icons.IconFiles,
                    breadcrumbs: true,
                    permission: 'documentStores:view'
                }
            ]
        },
        {
            id: 'evaluations',
            title: 'Evaluations',
            type: 'group',
            children: [
                {
                    id: 'datasets',
                    title: 'Datasets',
                    type: 'item',
                    url: '/datasets',
                    icon: icons.IconDatabase,
                    breadcrumbs: true,
                    display: ['cloud', 'enterprise'],
                    permission: 'datasets:view'
                },
                {
                    id: 'evaluators',
                    title: 'Evaluators',
                    type: 'item',
                    url: '/evaluators',
                    icon: icons.IconTestPipe,
                    breadcrumbs: true,
                    display: ['cloud', 'enterprise'],
                    permission: 'evaluators:view'
                },
                {
                    id: 'evaluations',
                    title: 'Evaluations',
                    type: 'item',
                    url: '/evaluations',
                    icon: icons.IconChartHistogram,
                    breadcrumbs: true,
                    display: ['cloud', 'enterprise'],
                    permission: 'evaluations:view'
                }
            ]
        },
        {
            id: 'management',
            title: 'User & Workspace Management',
            type: 'group',
            children: [
                {
                    id: 'sso',
                    title: 'SSO Config',
                    type: 'item',
                    url: '/sso-config',
                    icon: icons.IconShieldLock,
                    breadcrumbs: true,
                    display: ['enterprise'],
                    permission: 'users:manage'
                },
                {
                    id: 'roles',
                    title: 'Roles',
                    type: 'item',
                    url: '/roles',
                    icon: icons.IconLockCheck,
                    breadcrumbs: true,
                    display: ['enterprise'],
                    permission: 'roles:manage'
                },
                {
                    id: 'users',
                    title: 'Users',
                    type: 'item',
                    url: '/users',
                    icon: icons.IconUsers,
                    breadcrumbs: true,
                    display: ['enterprise'],
                    permission: 'users:manage'
                },
                {
                    id: 'workspaces',
                    title: 'Workspaces',
                    type: 'item',
                    url: '/workspaces',
                    icon: icons.IconStack2,
                    breadcrumbs: true,
                    display: ['enterprise'],
                    permission: 'workspace:view'
                },
                {
                    id: 'login-activity',
                    title: 'Login Activity',
                    type: 'item',
                    url: '/login-activity',
                    icon: icons.IconClipboardList,
                    breadcrumbs: true,
                    display: ['enterprise'],
                    permission: 'loginActivity:view'
                }
            ]
        },
        {
            id: 'others',
            title: 'Others',
            type: 'group',
            children: [
                {
                    id: 'logs',
                    title: 'Logs',
                    type: 'item',
                    url: '/logs',
                    icon: icons.IconList,
                    breadcrumbs: true,
                    display: ['cloud', 'enterprise'],
                    permission: 'logs:view'
                },
                {
                    id: 'files',
                    title: 'Files',
                    type: 'item',
                    url: '/files',
                    icon: icons.IconFileDatabase,
                    breadcrumbs: true,
                    display: ['cloud']
                },
                {
                    id: 'account',
                    title: 'Account Settings',
                    type: 'item',
                    url: '/account',
                    icon: icons.IconSettings,
                    breadcrumbs: true,
                    display: ['cloud']
                }
            ]
        }
    ]
}

export default dashboard
