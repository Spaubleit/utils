export type Action<T extends string, A = unknown> = {
    type: T,
} & A

export type AnyAction = Action<string>

export interface WithPayload<P> {
    payload: P,
}

interface WithMeta<M> {
    meta: M,
}

interface WithPayloadMeta<P, M> {
    payload: P,
    meta: M,
}

export interface ActionCreator<T extends string = string, P extends Array<unknown> = [], R = unknown> {
    (...params: P): Action<T, R>,
    type: T,
}

export type AnyCreator = ActionCreator<string, any, any>

export const payload = <P>() => (payload: P): WithPayload<P> => ({
    payload,
})

export const meta = <M>() => (meta: M): WithMeta<M> => ({
    meta,
})

export const payloadMeta = <P, M>() => (...[payload, meta]: [payload: P, meta: M]): WithPayloadMeta<P, M> => ({
    payload,
    meta,
})

export const actionCreator = <T extends string, R, P extends Array<unknown> = []>(type: T, builder?: (...params: P) => R): ActionCreator<T, P, R> => {
    const creator = (...params: P): Action<T, R> => ({
        type,
        ...builder?.(...params)
    }) as Action<T, R>
    creator.type = type

    return creator
}

export type CreatorGroup = Record<string, any>

const prefixCreator = <Prefix extends string, T extends string, P extends Array<unknown>, R>(prefix: Prefix, creator: ActionCreator<T, P, R>): ActionCreator<`${Prefix}${T}`, P, R> => {
        const wrapper = (...params: P) => ({
            ...creator(...params),
            type: prefix + creator.type
        })

        wrapper.type = prefix + creator.type

        return wrapper as ActionCreator<`${Prefix}${T}`, P, R>
    }

const prefixGroup = <Group extends CreatorGroup>(group: Group) => <Prefix extends string>(prefix: Prefix): PrefixGroup<Prefix, Group> => {
    return Object.fromEntries(Object.entries(group).map(([key, creator]) => [key, prefixCreator(prefix, creator)])) as PrefixGroup<Prefix, Group>
}

export type PrefixGroup<Prefix extends string, Creators extends Record<string, ActionCreator | CreatorGroup>> = {
    [K in keyof Creators]: PrefixCreator<Prefix, Creators[K]>
}

export type PrefixCreator<Prefix extends string, Creator extends ActionCreator | CreatorGroup> =
    Creator extends ActionCreator<infer T, infer P, infer R>?
        ActionCreator<`${Prefix}${T}`, P, R>:
            Creator extends CreatorGroup?
                PrefixGroup<Prefix, Creator>:
                    Creator extends PrefixGroup<infer T, infer Creators>?
                        PrefixGroup<`${Prefix}${T}`, Creators>:
                        never

export type Reducer<S, A> = (state: S, action: A) => S

export declare type Handler<TState, TAction> = (prevState: TState, action: TAction) => TState

export type HandlerMap<TState, TAction extends AnyAction> = Record<TAction["type"], Handler<TState, TAction>>

export type InferActionFromMap<Map extends HandlerMap<any, any>> = Map extends HandlerMap<any, infer T> ? T : never;

type InferActionFromCreator<TActionCreator> = TActionCreator extends ActionCreator<infer T, any, infer A> ? Action<T, A> : never;

type CreateHandlerMap<TState> = <
    TCreator extends AnyCreator,
    TAction extends AnyAction = InferActionFromCreator<TCreator>
    >(
    actionCreators: TCreator | TCreator[],
    handler: Handler<TState, TAction>
) => HandlerMap<TState, TAction>;

export const merge = <T>(...objs: T[]): any => Object.assign({}, ...objs)

export function createHandlerMap<
    TCreator extends ActionCreator<string, any, any>,
    TState,
    TAction extends AnyAction = InferActionFromCreator<TCreator>
    >(
    actionCreators: TCreator | TCreator[],
    handler: Handler<TState, TAction>,
): HandlerMap<TState, TAction> {
    return (Array.isArray(actionCreators) ? actionCreators : [actionCreators])
        .map(creator => creator.type)
        .reduce<HandlerMap<TState, TAction>>((acc, type) => {
            (acc as any)[type] = handler
            return acc
        }, {} as any)
}

export function createReducer<State, THandlerMap extends HandlerMap<State, any>>(
    defaultState: State,
    handlerMapsCreator: (handle: CreateHandlerMap<State>) => THandlerMap[],
): Reducer<State, InferActionFromMap<THandlerMap>> {
    const handlerMap: HandlerMap<State, any> = merge(...handlerMapsCreator(createHandlerMap))

    return (state = defaultState, action): State => {
        const handler = handlerMap[action.type]

        return handler ? handler(state, action) : state
    }
}

const actions = prefixGroup( {
    emptyAction: actionCreator("empty"),
    payloadAction: actionCreator("payload", payload<string>()),
    metaAction: actionCreator("meta", meta<number>()),
    payloadMetaAction: actionCreator("payload-meta", payloadMeta<string, number>()),
    nested: prefixGroup({
        creator: actionCreator("xxx", payload<number>())
    })("group_")
})("root_")

const reducer = createReducer("", handler => [
    handler([actions.payloadAction, actions.payloadMetaAction], (state, action) => action.payload)
])