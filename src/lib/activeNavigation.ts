export const shouldUseCompactNavigation = () =>
  typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches;

export const revealActiveSection = (
  element: HTMLElement | null,
  options: { force?: boolean; focus?: boolean; block?: ScrollLogicalPosition } = {},
) => {
  if (!element || typeof window === "undefined") return;

  window.requestAnimationFrame(() => {
    const rect = element.getBoundingClientRect();
    const isVisible = rect.top >= 88 && rect.bottom <= window.innerHeight - 24;

    if (options.force || shouldUseCompactNavigation() || !isVisible) {
      element.scrollIntoView({
        behavior: "smooth",
        block: options.block || "start",
      });
    }

    if (options.focus) {
      element.focus({ preventScroll: true });
    }
  });
};

export const setStableSearchParam = (
  params: URLSearchParams,
  key: string,
  value: string | null | undefined,
) => {
  const nextParams = new URLSearchParams(params);

  if (value) {
    nextParams.set(key, value);
  } else {
    nextParams.delete(key);
  }

  return nextParams;
};
