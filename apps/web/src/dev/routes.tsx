import type { RouteObject } from 'react-router'
import { ComponentsPage } from '@/dev/ComponentsPage'

export const devRoutes: RouteObject[] = [{ path: '/dev/components', element: <ComponentsPage /> }]
