import { stringify } from "query-string"

export type StaticSegment<Children extends Record<string, Segment>,
    Query extends Record<string, string | number> | undefined = undefined> = {
    _path: string,
    _build: Query extends undefined ? (() => string) : ((query: Query) => string),
} & {
    [K in keyof Children]: Children[K]
}

export type DynamicSegment<Children extends Record<string, Segment>,
    Param extends string | number = string,
    Query extends Record<string, string | number> | undefined = undefined> = {
    _path: string,
    (param: Param): StaticSegment<Children, Query>,
} & {
    [K in keyof Children]: Children[K]
}

export type Segment<Children extends Record<string, Segment> = {}> = StaticSegment<Children> | DynamicSegment<Children>

export type StaticRoute<Children extends Record<string, Route> = {}, Query extends Record<string, string | number> | undefined = undefined> = {
    path?: string,
    dynamic?: false,
    children: Children,
}

export type DynamicRoute<Children extends Record<string, Route>,
    Param extends string | number = string,
    Query extends Record<string, string | number> | undefined = undefined> = {
    path?: string,
    dynamic: true,
    children: Children,
}

export type Route<Children extends Record<string, Route> = {}> = StaticRoute<Children> | DynamicRoute<Children>

export type RouteToSegment<T extends Route> = T extends StaticRoute<infer Children, infer Query> ?
    StaticSegment<{ [K in keyof Children]: RouteToSegment<Children[K]> }, Query> :
    T extends DynamicRoute<infer Children, infer Param, infer Query> ?
        DynamicSegment<{ [K in keyof Children]: RouteToSegment<Children[K]> }, Param, Query> : never

export const dive = <T extends Route>(route: T): RouteToSegment<T> => {
    return new Proxy(
        (param = "") => {
            return dive({
                ...route,
                path: route.path?.replace(/:\w+$/, param),
            })
        },
        {
            get: (target: unknown, key: string) => {
                const child = (route.children as Record<string, Route>)[key]
                if (child) {
                    return dive({
                        ...child,
                        path: `${route.path ?? ""}/${child.dynamic ? ":" : ""}${key}`,
                    })
                } else {
                    if (key === "_path") {
                        return route.path
                    }
                    if (key === "_build") {
                        return (query: Record<string, unknown> = {}) => {
                            const queryString = stringify(query)
                            return (route.path ?? "/") + (queryString ? "?" + (queryString) : "")
                        }
                    }
                }
            }
        }
    ) as RouteToSegment<T>
}

export const route = <T extends Record<string, Route> = {}>(children?: T) =>
    <Query extends Record<string, string | number> | undefined = undefined>(): StaticRoute<T, Query> => ({
    children: children ?? {}
}) as unknown as StaticRoute<T>

export const dynamicRoute = <T extends Record<string, Route>>(children?: T) =>
    <Param extends string | number, Query extends Record<string, string | number> | undefined = undefined>(): DynamicRoute<T, Param, Query> => ({
    children: children ?? {}
}) as unknown as DynamicRoute<T, Param>

interface BuildParams {
    route: typeof route,
    dynamicRoute: typeof dynamicRoute,
}

export const buildRoutes = <R extends Route>(builder: (params: BuildParams) => R): RouteToSegment<R> => {
    return dive(builder({route, dynamicRoute}))
}