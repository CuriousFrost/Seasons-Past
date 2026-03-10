import * as React from "react"

const MOBILE_BREAKPOINT = 768

function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  )

  React.useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)

    onChange()
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [query])

  return matches
}

export function useIsLandscapeMobile() {
  const isLandscape = useMediaQuery("(orientation: landscape)")
  const shortViewport = useMediaQuery("(max-height: 1080px)")
  return isLandscape && shortViewport
}

export function useIsMobile() {
  const isPortraitMobile = useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  const isLandscapeMobile = useIsLandscapeMobile()
  return isPortraitMobile || isLandscapeMobile
}

export function useIsSmallDevice(): boolean {
  const [small] = React.useState(
    () =>
      typeof window !== "undefined"
        ? Math.min(window.screen.width, window.screen.height) < 1024 &&
          window.matchMedia("(pointer: coarse)").matches
        : false,
  )
  return small
}
