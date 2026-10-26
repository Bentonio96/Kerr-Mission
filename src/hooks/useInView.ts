import { useEffect, useState, type RefObject } from 'react'

/** True while the element is on screen (with a margin so work starts early). */
export function useInView(
  ref: RefObject<Element | null>,
  rootMargin = '200px 0px',
): boolean {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry?.isIntersecting ?? false),
      { rootMargin },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, rootMargin])
  return inView
}
