export type NavDirection = "forward" | "back";

export function withViewTransition(
  direction: NavDirection,
  fn: () => void,
): void {
  if (typeof document === "undefined") {
    fn();
    return;
  }
  const start = (document as Document & {
    startViewTransition?: (callback: () => void) => unknown;
  }).startViewTransition;
  if (typeof start !== "function") {
    fn();
    return;
  }
  document.body.dataset.direction = direction;
  start.call(document, fn);
}

export function goForward(fn: () => void): void {
  withViewTransition("forward", fn);
}

export function goBack(fn: () => void): void {
  withViewTransition("back", fn);
}
