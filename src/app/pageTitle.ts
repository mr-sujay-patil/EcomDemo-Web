import { createContext, useContext, useEffect } from 'react'

/** The layout provides this: a page whose title is not its route's (a "Not permitted" in place of the admin console) sets its own. */
export const PageTitleContext = createContext<(title: string | null) => void>(() => undefined)

/** Sets the document title's page name while the calling component is on screen. */
export function usePageTitle(title: string) {
  const setTitle = useContext(PageTitleContext)
  useEffect(() => {
    setTitle(title)
    return () => {
      setTitle(null)
    }
  }, [setTitle, title])
}
