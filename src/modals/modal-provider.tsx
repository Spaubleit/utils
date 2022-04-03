import React from "react"
import { createContext, FC, Fragment, useCallback, useState } from "react"
import { noop, Subject } from "rxjs"
import { append } from "fp-ts/ReadonlyArray"
import { useSubscription } from "observable-hooks"

export function* createIdGenerator(): Generator<number, number, number> {
    let index = 0
    while (true) {
        index++
        yield index
    }
}

type Builder = (close: () => void) => JSX.Element
type ModalContext = (builder: Builder) => void

interface Data {
    id: number,
    content: JSX.Element,
}

export const modalContext = createContext<ModalContext>(() => noop)

const modalIdGenerator = createIdGenerator()

const modals$$ = new Subject<Builder>()

const ModalProvider: FC = ({children}) => {
    const [modals, setModals] = useState<ReadonlyArray<Data>>([]);

    const createModal = useCallback((builder: Builder) => {
        const id = modalIdGenerator.next().value
        const close = () => setModals(dialogs => dialogs.filter(dialog => dialog.id !== id))
        setModals(append({
            id,
            content: builder(close)
        }))
    }, [])

    useSubscription(modals$$, createModal)

    return <modalContext.Provider value={createModal}>
        {children}
        {modals.map(dialog => <Fragment key={dialog.id}>
            {dialog.content}
        </Fragment>)}
    </modalContext.Provider>
}

export const showModal = (builder: Builder): void => modals$$.next(builder)

export default ModalProvider