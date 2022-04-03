import React, { useEffect } from "react"
import { showModal } from "./modal-provider"
import { noop } from "rxjs"

type OptionalParam<T> = [...T extends undefined? []: [T]]

export interface Modal<Props, InitProps> {
    useIt: (...props: OptionalParam<Props>) => void,
    show: (...props: OptionalParam<InitProps>) => () => void,
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

    const show: Modal<Props, InitialProps>["show"] = (...initialProps) => {
        let result: () => void = noop
        if (props) {
            showModal(close => {
                result = close
                return builder(...props as OptionalParam<Props>, ...initialProps, close)
            })
        }
        return result
    }

    return {
        useIt,
        show,
    }
}