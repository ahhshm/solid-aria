import { JSX } from "solid-js";

/**
 * Call the handler with the event.
 * Simpler way to call a JSX.EventHandlerUnion programmatically.
 */
export function callHandler<T, E extends Event>(
  handler: JSX.EventHandlerUnion<T, E> | undefined,
  event: E & { currentTarget: T; target: Element }
) {
  if (handler) {
    if (typeof handler === "function") {
      handler(event);
    } else {
      handler[0](handler[1], event);
    }
  }

  return event?.defaultPrevented;
}

/**
 * Return a function that will call all handlers in the order they were chained with the same arguments.
 */
export function chainHandlers<T, E extends Event>(
  ...fns: Array<JSX.EventHandlerUnion<T, E> | undefined>
) {
  return function (event: E & { currentTarget: T; target: Element }) {
    fns.forEach(fn => callHandler(fn, event));
  };
}
