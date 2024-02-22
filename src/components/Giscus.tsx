import React, { useContext, useEffect, useRef } from "react"

import { DARK } from "~/src/constants/theme"
import useSiteMetadata from "~/src/hooks/useSiteMetadata"
import ThemeContext from "~/src/stores/themeContext"

const source = "https://giscus.app/client.js"
const giscusSelector = ".giscus-frame"
const LIGHT_THEME = "light"
const DARK_THEME = "dark"

type ThemeMode = typeof LIGHT_THEME | typeof DARK_THEME

const Giscus = () => {
  const site = useSiteMetadata()
  const { commentRepo, commentRepoId, commentCategoryId } = site ?? {
    commentRepo: undefined,
    commentRepoId: undefined,
    commentCategoryId: undefined,
  }
  const theme = useContext(ThemeContext)
  const containerReference = useRef<HTMLDivElement>(null)
  const isGiscusCreated = useRef(false)

  useEffect(() => {
    if (!commentRepo || !commentRepoId || !commentCategoryId) return
    let themeMode: ThemeMode

    if (isGiscusCreated.current) {
      themeMode = theme === DARK ? DARK_THEME : LIGHT_THEME
    } else {
      themeMode =
        document.body.dataset.theme === DARK ? DARK_THEME : LIGHT_THEME
    }

    const createGiscusElement = () => {
      const giscus = document.createElement("script")
      const attributes = {
        src: source,
        "data-repo": commentRepo,
        "data-repo-id": commentRepoId,
        "data-category": "Comments",
        "data-category-id": commentCategoryId,
        "data-mapping": "pathname",
        "data-strict": "0",
        "data-reactions-enabled": "1",
        "data-emit-metadata": "0",
        "data-input-position": "bottom",
        "data-theme": themeMode,
        "data-lang": "ko",
        crossOrigin: "anonymous",
        async: "true",
      }
      for (const [key, value] of Object.entries(attributes)) {
        giscus.setAttribute(key, value)
      }
      containerReference.current?.append(giscus)
      isGiscusCreated.current = true
    }

    const giscusElement = containerReference.current?.querySelector(
      giscusSelector,
    ) as HTMLIFrameElement

    const postThemeMessage = () => {
      if (!giscusElement) return
      const message = {
        type: "set-theme",
        theme: themeMode,
      }
      giscusElement?.contentWindow?.postMessage(message, source)
    }

    isGiscusCreated.current ? postThemeMessage() : createGiscusElement()
  }, [commentRepo, commentRepoId, commentCategoryId, theme])

  return <div className="giscus" ref={containerReference} />
}

export default Giscus
