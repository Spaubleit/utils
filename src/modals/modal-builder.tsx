import React, { useEffect } from "react"
import { showModal } from "./modal-provider"
import { noop } from "rxjs"

type OptionalParam<T> = [...T extends undefined? []: [T]]

export interface Modal<Props, InitProps> {
    useIt: (...props: OptionalParam<Props>) => void,
    show: (...props: OptionalParam<InitProps>) => () => void,
    showImmediately: (...props: [...OptionalParam<Props>, ...OptionalParam<InitProps>]) => () => void,
}

export const buildModal = <Props extends unknown = undefined, InitialProps = undefined>(builder: (...props: [...OptionalParam<Props>, ...OptionalParam<InitialProps>, (() => void)]) => JSX.Element): Modal<Props, InitialProps> => {
    let props: OptionalParam<Props> | undefined
    const useIt: Modal<Props, InitialProps>["useIt"] = (..._props) => {
        useEffect(() => {
            props = _props
            return () => {
                props = undefined
            }
        }, [_props])
    }

    const showImmediately: Modal<Props, InitialProps>["showImmediately"] = (...props) => {
        let result: () => void = noop
        showModal(close => {
            result = close
            return builder(...props, close)
        })
        return result
    }

    const show: Modal<Props, InitialProps>["show"] = (...initialProps) => {
        return props? showImmediately(...props, ...initialProps): noop
    }

    return {
        useIt,
        show,
        showImmediately,
    }
}