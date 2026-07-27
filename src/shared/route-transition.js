export function resetScrollForInstantViewChange({
  documentRef = document,
  windowRef = window,
  scheduleFrame = requestAnimationFrame
} = {}) {
  const page = documentRef.documentElement;
  const previousScrollBehavior = page.style.scrollBehavior;
  page.style.scrollBehavior = 'auto';
  windowRef.scrollTo(0, 0);
  scheduleFrame(() => {
    page.style.scrollBehavior = previousScrollBehavior;
  });
}
