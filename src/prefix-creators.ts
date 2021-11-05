import type {
    ActionCreator, ActionCreatorBuilder,
    ActionCreatorTypeMetadata,
    EmptyActionCreator,
    PayloadActionCreator,
    PayloadMetaActionCreator
} from "typesafe-actions"
import { createAction } from "typesafe-actions"

export type PrefixCreator<Creator extends ActionCreator, Prefix extends string, Divider extends string = "/"> =
    Creator extends EmptyActionCreator<infer Type> ?
        EmptyActionCreator<`${Prefix}${Divider}${Type}`> :
        Creator extends PayloadActionCreator<infer Type, infer Payload> ?
            PayloadActionCreator<`${Prefix}${Divider}${Type}`, Payload> :
            Creator extends PayloadMetaActionCreator<infer Type, infer Payload, infer Meta> ?
                PayloadMetaActionCreator<`${Prefix}${Divider}${Type}`, Payload, Meta> :
                never

export type PrefixGroup<Actions extends Record<string, ActionCreator>, Prefix extends string, Divider extends string = "/"> = {
    [K in keyof Actions]: PrefixCreator<Actions[K], Prefix, Divider>
}

export const prefixCreator = <Prefix extends string, Divider extends string = "/">(prefix: Prefix, divider = "/" as Divider) =>
    <Creator extends ActionCreator>(creator: Creator): PrefixCreator<Creator, Prefix, Divider> => {
        const type = prefix + divider + (creator as ActionCreatorTypeMetadata<string>).getType!()

        const wrapper = ((...params: unknown[]) => ({
            ...creator(...params),
            type,
        })) as unknown as PrefixCreator<Creator, Prefix, Divider>
        (wrapper as ActionCreatorTypeMetadata<string>).getType = () => type

        return wrapper
    }

export const createGroup = <Creators extends Record<string, ActionCreator>>(actions: Creators) =>
    <Prefix extends string, Divider extends string = "/">(prefix: Prefix, divider = "/" as Divider): PrefixGroup<Creators, Prefix, Divider> => {
        const addPrefix = prefixCreator(prefix, divider)
        return Object.fromEntries(Object
            .entries(actions)
            .map(([key, creator]) => [key, addPrefix(creator)])
        ) as PrefixGroup<Creators, Prefix, Divider>
    }

export const createAsyncAction = <Prefix extends string>(prefix: Prefix) =>
    <R = undefined, S = undefined, F = undefined>() =>
        createGroup({
            request: createAction("REQUEST")<R>(),
            success: createAction("SUCCESS")<S>(),
            failure: createAction("REQUEST")<F>(),
        })(prefix, "_") as unknown as PrefixGroup<{
            request: ActionCreatorBuilder<"REQUEST", R>,
            success: ActionCreatorBuilder<"SUCCESS", S>,
            failure: ActionCreatorBuilder<"FAILURE", F>,
        }, Prefix, "_">