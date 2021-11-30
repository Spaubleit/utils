interface Action<T extends string> {
    type: T,
}

interface WithPayload<P> {
    payload: P,
}

interface WithMeta<M> {
    meta: M,
}

interface WithPayloadMeta<P, M> {
    payload: P,
    meta: M,
}

interface ActionCreator<T extends string = string, P extends Array<unknown> = [], R = unknown> {
    (...params: P): Action<T> & R,
    type: T,
}

const payload = <P>() => (payload: P): WithPayload<P> => ({
    payload,
})

const meta = <M>() => (meta: M): WithMeta<M> => ({
    meta,
})

const payloadMeta = <P, M>() => (...[payload, meta]: [payload: P, meta: M]): WithPayloadMeta<P, M> => ({
    payload,
    meta,
})

const actionCreator = <T extends string, R, P extends Array<unknown> = []>(type: T, builder?: (...params: P) => R): ActionCreator<T, P, R> => {
    const creator = (...params: P): Action<T> & R => ({
        type,
        ...builder?.(...params)
    }) as Action<T> & R
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

const prefixGroup = <Prefix extends string, Group extends CreatorGroup>(prefix: Prefix, group: Group): PrefixGroup<Prefix, Group> => {
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

// const createReducer = <T>(initial: T) => {}

const actions = prefixGroup("root_", {
    emptyAction: actionCreator("empty"),
    payloadAction: actionCreator("payload", payload<string>()),
    metaAction: actionCreator("meta", meta<number>()),
    payloadMetaAction: actionCreator("payload-meta", payloadMeta<string, number>()),
    x: prefixGroup("group_", {
        creator: actionCreator("xxx", payload<number>())
    })
})

console.log(actions)