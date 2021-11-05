import type {
    ActionCreator, ActionCreatorBuilder,
    ActionCreatorTypeMetadata,
    EmptyActionCreator,
    PayloadActionCreator,
    PayloadMetaActionCreator
} from "typesafe-actions"
import { createAction } from "typesafe-actions"

export type PrefixCreator <Prefix extends string, Creator extends ActionCreator> =
    Creator extends EmptyActionCreator<infer Type> ?
        EmptyActionCreator<`${Prefix}/${Type}`>:
            Creator extends PayloadActionCreator<infer Type, infer Payload>?
                PayloadActionCreator<`${Prefix}/${Type}`, Payload>:
                    Creator extends PayloadMetaActionCreator<infer Type, infer Payload, infer Meta>?
                        PayloadMetaActionCreator<`${Prefix}/${Type}`, Payload, Meta>:
                            never

export type PrefixGroup <Prefix extends string, Actions extends Record<string, ActionCreator>> = {
    [K in keyof Actions]: PrefixCreator<Prefix, Actions[K]>
}

export const prefixCreator = <Prefix extends string>(prefix: Prefix) => <Creator extends ActionCreator>(creator: Creator): PrefixCreator<Prefix, Creator> => {
    const type = prefix + "/" + (creator as ActionCreatorTypeMetadata<string>).getType!();

    const wrapper =  ((...params: unknown[]) => ({
        ...creator(...params),
        type,
    })) as unknown as PrefixCreator<Prefix, Creator>
    (wrapper as ActionCreatorTypeMetadata<string>).getType = () => type

    return wrapper
}

export const createGroup = <Creators extends Record<string, ActionCreator>>(actions: Creators) =>
    <Prefix extends string>(prefix: Prefix): PrefixGroup<Prefix, Creators> =>
    {
        const addPrefix = prefixCreator(prefix)
        return Object.fromEntries(Object
            .entries(actions)
            .map(([key, creator]) => [key, addPrefix(creator)])
        ) as PrefixGroup<Prefix, Creators>
    }

export const createAsyncAction = <Prefix extends string>(prefix: Prefix) =>
    <R = undefined, S = undefined, F = undefined>() =>
        createGroup({
            request: createAction("REQUEST")<R>(),
            success: createAction("SUCCESS")<S>(),
            failure: createAction("REQUEST")<F>(),
        })(prefix) as unknown as PrefixGroup<Prefix, {
            request: ActionCreatorBuilder<"REQUEST", R>,
            success: ActionCreatorBuilder<"SUCCESS", S>,
            failure: ActionCreatorBuilder<"FAILURE", F>,
        }>