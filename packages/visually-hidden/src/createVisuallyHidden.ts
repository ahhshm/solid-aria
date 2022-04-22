import { createFocus } from "@solid-aria/interactions";
import { DOMElements } from "@solid-aria/types";
import { access, isObject, MaybeAccessor } from "@solid-primitives/utils";
import { Accessor, createMemo, createSignal, JSX } from "solid-js";

interface AriaVisuallyHiddenProps {
  /**
   * Whether the element should become visible on focus, for example skip links.
   */
  isFocusable?: MaybeAccessor<boolean | undefined>;

  /**
   * Additional style to be passed to the element.
   */
  style?: MaybeAccessor<JSX.CSSProperties | string | undefined>;
}

interface VisuallyHiddenAria<T extends DOMElements> {
  /**
   * Props to spread onto the target element.
   */
  visuallyHiddenProps: Accessor<JSX.IntrinsicElements[T]>;
}

const visuallyHiddenStyles: JSX.CSSProperties = {
  border: 0,
  clip: "rect(0 0 0 0)",
  "clip-path": "inset(50%)",
  height: 1,
  margin: "0 -1px -1px 0",
  overflow: "hidden",
  padding: 0,
  position: "absolute",
  width: 1,
  "white-space": "nowrap"
};

/**
 * Provides props for an element that hides its children visually
 * but keeps content visible to assistive technology.
 */
export function createVisuallyHidden<T extends DOMElements = "div">(
  props: AriaVisuallyHiddenProps = {}
): VisuallyHiddenAria<T> {
  const [isFocused, setFocused] = createSignal(false);

  const { focusProps } = createFocus({
    isDisabled: () => !access(props.isFocusable),
    onFocusChange: setFocused
  });

  // If focused, don't hide the element.
  const combinedStyles = createMemo(() => {
    const style = access(props.style);

    if (isFocused()) {
      return style;
    }

    if (isObject(style)) {
      return { ...visuallyHiddenStyles, ...style };
    }

    return visuallyHiddenStyles;
  });

  const visuallyHiddenProps = createMemo(() => {
    return {
      ...focusProps(),
      style: combinedStyles()
    } as JSX.IntrinsicElements[T];
  });

  return { visuallyHiddenProps };
}