import { lazy } from 'react'

// project imports
import Loadable from '@/ui-component/loading/Loadable'
import MinimalLayout from '@/layout/MinimalLayout'
import { RequireAuth } from '@/routes/RequireAuth'

// canvas routing
const Canvas = Loadable(lazy(() => import('@/views/canvas')))
const MarketplaceCanvas = Loadable(lazy(() => import('@/views/marketplaces/MarketplaceCanvas')))

// ==============================|| CANVAS ROUTING ||============================== //

const CanvasRoutes = {
    path: '/',
    element: <MinimalLayout />,
    children: [
        {
            path: '/canvas',
            element: (
                <RequireAuth permission={'chatflows:view'}>
                    <Canvas />
                </RequireAuth>
            )
        },
        {
            path: '/canvas/:id',
            element: (
                <RequireAuth permission={'chatflows:view'}>
                    <Canvas />
                </RequireAuth>
            )
        },
        {
            path: '/agentcanvas',
            element: (
                <RequireAuth permission={'agentflows:view'}>
                    <Canvas />
                </RequireAuth>
            )
        },
        {
            path: '/agentcanvas/:id',
            element: (
                <RequireAuth permission={'agentflows:view'}>
                    <Canvas />
                </RequireAuth>
            )
        },
        {
            path: '/marketplace/:id',
            element: (
                <RequireAuth permission={'templates:marketplace,templates:custom'}>
                    <MarketplaceCanvas />
                </RequireAuth>
            )
        }
    ]
}

export default CanvasRoutes
