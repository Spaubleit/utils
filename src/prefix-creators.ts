import type {
    ActionCreator, ActionCreatorBuilder,
    ActionCreatorTypeMetadata,
    EmptyActionCreator,
    PayloadActionCreator,
    PayloadMetaActionCreator
} from "typesafe-actions"
import { createAction } from "typesafe-actions"

export type CreatorGroup = Record<string, ActionCreator>

export type PrefixCreator<Prefix extends string, Creator extends ActionCreator | CreatorGroup> =
    Creator extends EmptyActionCreator<infer Type> ?
        EmptyActionCreator<`${Prefix}${Type}`> :
        Creator extends PayloadActionCreator<infer Type, infer Payload> ?
            PayloadActionCreator<`${Prefix}${Type}`, Payload> :
            Creator extends PayloadMetaActionCreator<infer Type, infer Payload, infer Meta> ?
                PayloadMetaActionCreator<`${Prefix}${Type}`, Payload, Meta> :
                    Creator extends PrefixGroup<infer GroupPrefix, infer Creators>?
                        PrefixGroup<`${Prefix}${GroupPrefix}`, Creators>:
                        never

export type PrefixGroup< Prefix extends string, Actions extends Record<string, ActionCreator | CreatorGroup>> = {
    [K in keyof Actions]: PrefixCreator<Prefix, Actions[K]>
}

export const prefixCreator = <Prefix extends string>(prefix: Prefix) =>
    <Creator extends ActionCreator | CreatorGroup>(creator: Creator): PrefixCreator<Prefix, Creator> => {
        if (typeof creator === "object") {
            // @ts-ignore
            return createGroup(creator)(prefix)
        }

        const type = prefix + (creator as ActionCreatorTypeMetadata<string>).getType!()

        const wrapper = ((...params: unknown[]) => ({
            // @ts-ignore
            ...creator(...params),
            type,
        })) as unknown as PrefixCreator<Prefix, Creator>
        (wrapper as ActionCreatorTypeMetadata<string>).getType = () => type

        return wrapper
    }

export const createGroup = <Creators extends Record<string, ActionCreator | CreatorGroup> | CreatorGroup>(actions: Creators) =>
    <Prefix extends string>(prefix: Prefix): PrefixGroup<Prefix, Creators> => {
        const addPrefix = prefixCreator(prefix)
        return Object.fromEntries(Object
            .entries(actions)
            .map(([key, creator]) => [key, addPrefix(creator)])
        ) as PrefixGroup<Prefix, Creators>
    }

export type AsyncAction<Prefix extends string, R, S, F> = PrefixGroup< `${Prefix}_`, {
    request: ActionCreatorBuilder<"REQUEST", R>,
    success: ActionCreatorBuilder<"SUCCESS", S>,
    failure: ActionCreatorBuilder<"FAILURE", F>,
}>

export const createAsyncAction = <Prefix extends string>(prefix: Prefix) =>
    <R = undefined, S = undefined, F = undefined>() =>
        createGroup({
            request: createAction("REQUEST")<R>(),
            success: createAction("SUCCESS")<S>(),
            failure: createAction("FAILURE")<F>(),
        })(prefix + "_") as AsyncAction<Prefix, R, S, F>