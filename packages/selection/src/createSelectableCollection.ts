/*
 * Copyright 2022 Solid Aria Working Group.
 * MIT License
 *
 * Portions of this file are based on code from react-spectrum.
 * Copyright 2020 Adobe. All rights reserved.
 *
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { focusSafely, getFocusableTreeWalker } from "@solid-aria/focus";
import { useLocale } from "@solid-aria/i18n";
import { FocusStrategy, ItemKey, KeyboardDelegate } from "@solid-aria/types";
import { focusWithoutScrolling, scrollIntoView } from "@solid-aria/utils";
import { createEventListener } from "@solid-primitives/event-listener";
import { combineProps } from "@solid-primitives/props";
import { access, MaybeAccessor } from "@solid-primitives/utils";
import { Accessor, createEffect, createMemo, JSX, mergeProps, on, onMount } from "solid-js";

import { createTypeSelect } from "./createTypeSelect";
import { MultipleSelectionManager } from "./types";
import { isCtrlKeyPressed, isNonContiguousSelectionModifier } from "./utils";

interface CreateSelectableCollectionProps {
  /**
   * An interface for reading and updating multiple selection state.
   */
  selectionManager: MaybeAccessor<MultipleSelectionManager>;

  /**
   * A delegate object that implements behavior for keyboard focus movement.
   */
  keyboardDelegate: MaybeAccessor<KeyboardDelegate>;

  /**
   * Whether the collection or one of its items should be automatically focused upon render.
   * @default false
   */
  autoFocus?: MaybeAccessor<boolean | FocusStrategy | undefined>;

  /**
   * Whether focus should wrap around when the end/start is reached.
   * @default false
   */
  shouldFocusWrap?: MaybeAccessor<boolean | undefined>;

  /**
   * Whether the collection allows empty selection.
   * @default false
   */
  disallowEmptySelection?: MaybeAccessor<boolean | undefined>;

  /**
   * Whether the collection allows the user to select all items via keyboard shortcut.
   * @default false
   */
  disallowSelectAll?: MaybeAccessor<boolean | undefined>;

  /**
   * Whether selection should occur automatically on focus.
   * @default false
   */
  selectOnFocus?: MaybeAccessor<boolean | undefined>;

  /**
   * Whether typeahead is disabled.
   * @default false
   */
  disallowTypeAhead?: MaybeAccessor<boolean | undefined>;

  /**
   * Whether the collection items should use virtual focus instead of being focused directly.
   */
  shouldUseVirtualFocus?: MaybeAccessor<boolean | undefined>;

  /**
   * Whether navigation through tab key is enabled.
   */
  allowsTabNavigation?: MaybeAccessor<boolean | undefined>;

  /**
   * Whether the collection items are contained in a virtual scroller.
   */
  isVirtualized?: MaybeAccessor<boolean | undefined>;
}

interface SelectableCollectionAria {
  /**
   * Props for the collection element.
   */
  collectionProps: Accessor<JSX.HTMLAttributes<any>>;
}

/**
 * Handles interactions with selectable collections.
 * @param props Props for the collection.
 * @param ref The ref attached to the element representing the collection.
 * @param scrollRef The ref attached to the scrollable body. Used to provide automatic scrolling on item focus for non-virtualized collections. If not provided, defaults to the collection ref.
 */
export function createSelectableCollection<T extends HTMLElement, U extends HTMLElement = T>(
  props: CreateSelectableCollectionProps,
  ref: Accessor<T | undefined>,
  scrollRef?: Accessor<U | undefined>
): SelectableCollectionAria {
  const defaultProps: Partial<CreateSelectableCollectionProps> = {
    selectOnFocus: () => access(props.selectionManager).selectionBehavior() === "replace"
  };

  // eslint-disable-next-line solid/reactivity
  props = mergeProps(defaultProps, props);

  const _scrollRef = () => (scrollRef ? scrollRef() : ref());

  const locale = useLocale();

  // Store the scroll position so we can restore it later.
  let scrollPos = { top: 0, left: 0 };

  createEventListener(_scrollRef, "scroll", () => {
    const scrollEl = _scrollRef();

    if (access(props.isVirtualized) || !scrollEl) {
      return;
    }

    scrollPos = {
      top: scrollEl.scrollTop,
      left: scrollEl.scrollLeft
    };
  });

  const onKeyDown: JSX.EventHandlerUnion<HTMLElement, KeyboardEvent> = e => {
    // Prevent option + tab from doing anything since it doesn't move focus to the cells, only buttons/checkboxes
    if (e.altKey && e.key === "Tab") {
      e.preventDefault();
    }

    const refEl = ref();

    // Keyboard events bubble through portals. Don't handle keyboard events
    // for elements outside the collection (e.g. menus).
    if (!refEl?.contains(e.target as HTMLElement)) {
      return;
    }

    const manager = access(props.selectionManager);
    const selectOnFocus = access(props.selectOnFocus);

    const navigateToKey = (key: ItemKey | undefined, childFocus?: FocusStrategy) => {
      if (key != null) {
        manager.setFocusedKey(key, childFocus);

        if (e.shiftKey && manager.selectionMode() === "multiple") {
          manager.extendSelection(key);
        } else if (selectOnFocus && !isNonContiguousSelectionModifier(e)) {
          manager.replaceSelection(key);
        }
      }
    };

    const delegate = access(props.keyboardDelegate);
    const shouldFocusWrap = access(props.shouldFocusWrap);

    const focusedKey = manager.focusedKey();

    switch (e.key) {
      case "ArrowDown": {
        if (delegate.getKeyBelow) {
          e.preventDefault();

          let nextKey =
            focusedKey != null ? delegate.getKeyBelow(focusedKey) : delegate.getFirstKey?.();

          if (nextKey == null && shouldFocusWrap) {
            nextKey = delegate.getFirstKey?.(focusedKey);
          }

          navigateToKey(nextKey);
        }
        break;
      }
      case "ArrowUp": {
        if (delegate.getKeyAbove) {
          e.preventDefault();

          let nextKey =
            focusedKey != null ? delegate.getKeyAbove(focusedKey) : delegate.getLastKey?.();

          if (nextKey == null && shouldFocusWrap) {
            nextKey = delegate.getLastKey?.(focusedKey);
          }

          navigateToKey(nextKey);
        }
        break;
      }
      case "ArrowLeft": {
        if (delegate.getKeyLeftOf) {
          e.preventDefault();

          const isRTL = locale().direction === "rtl";

          let nextKey: ItemKey | undefined;

          if (focusedKey != null) {
            nextKey = delegate.getKeyLeftOf(focusedKey);
          } else {
            nextKey = isRTL ? delegate.getFirstKey?.() : delegate.getLastKey?.();
          }

          navigateToKey(nextKey, isRTL ? "first" : "last");
        }
        break;
      }
      case "ArrowRight": {
        if (delegate.getKeyRightOf) {
          e.preventDefault();

          const isRTL = locale().direction === "rtl";

          let nextKey: ItemKey | undefined;

          if (focusedKey != null) {
            nextKey = delegate.getKeyRightOf(focusedKey);
          } else {
            nextKey = isRTL ? delegate.getLastKey?.() : delegate.getFirstKey?.();
          }

          navigateToKey(nextKey, isRTL ? "last" : "first");
        }
        break;
      }
      case "Home":
        if (delegate.getFirstKey) {
          e.preventDefault();

          const firstKey = delegate.getFirstKey(focusedKey, isCtrlKeyPressed(e));

          if (firstKey != null) {
            manager.setFocusedKey(firstKey);

            if (isCtrlKeyPressed(e) && e.shiftKey && manager.selectionMode() === "multiple") {
              manager.extendSelection(firstKey);
            } else if (selectOnFocus) {
              manager.replaceSelection(firstKey);
            }
          }
        }
        break;
      case "End":
        if (delegate.getLastKey) {
          e.preventDefault();

          const lastKey = delegate.getLastKey(focusedKey, isCtrlKeyPressed(e));

          if (lastKey != null) {
            manager.setFocusedKey(lastKey);

            if (isCtrlKeyPressed(e) && e.shiftKey && manager.selectionMode() === "multiple") {
              manager.extendSelection(lastKey);
            } else if (selectOnFocus) {
              manager.replaceSelection(lastKey);
            }
          }
        }
        break;
      case "PageDown":
        if (delegate.getKeyPageBelow && focusedKey != null) {
          e.preventDefault();
          const nextKey = delegate.getKeyPageBelow(focusedKey);
          navigateToKey(nextKey);
        }
        break;
      case "PageUp":
        if (delegate.getKeyPageAbove && focusedKey != null) {
          e.preventDefault();
          const nextKey = delegate.getKeyPageAbove(focusedKey);
          navigateToKey(nextKey);
        }
        break;
      case "a":
        if (
          isCtrlKeyPressed(e) &&
          manager.selectionMode() === "multiple" &&
          access(props.disallowSelectAll) !== true
        ) {
          e.preventDefault();
          manager.selectAll();
        }
        break;
      case "Escape":
        e.preventDefault();
        if (!access(props.disallowEmptySelection)) {
          manager.clearSelection();
        }
        break;
      case "Tab": {
        if (!access(props.allowsTabNavigation) && refEl) {
          // There may be elements that are "tabbable" inside a collection (e.g. in a grid cell).
          // However, collections should be treated as a single tab stop, with arrow key navigation internally.
          // We don't control the rendering of these, so we can't override the tabIndex to prevent tabbing.
          // Instead, we handle the Tab key, and move focus manually to the first/last tabbable element
          // in the collection, so that the browser default behavior will apply starting from that element
          // rather than the currently focused one.
          if (e.shiftKey) {
            refEl.focus();
          } else {
            const walker = getFocusableTreeWalker(refEl, { tabbable: true });
            let next: HTMLElement | undefined;
            let last: HTMLElement | undefined;
            do {
              last = walker.lastChild() as HTMLElement;
              if (last) {
                next = last;
              }
            } while (last);

            if (next && !next.contains(document.activeElement)) {
              focusWithoutScrolling(next);
            }
          }
          break;
        }
      }
    }
  };

  const onFocusIn: JSX.EventHandlerUnion<HTMLElement, FocusEvent> = e => {
    const manager = access(props.selectionManager);
    const delegate = access(props.keyboardDelegate);
    const selectOnFocus = access(props.selectOnFocus);

    if (manager.isFocused()) {
      // If a focus event bubbled through a portal, reset focus state.
      if (!e.currentTarget.contains(e.target)) {
        manager.setFocused(false);
      }

      return;
    }

    // Focus events can bubble through portals. Ignore these events.
    if (!e.currentTarget.contains(e.target)) {
      return;
    }

    manager.setFocused(true);

    if (manager.focusedKey() == null) {
      const navigateToFirstKey = (key: ItemKey | undefined) => {
        if (key == null) {
          return;
        }

        manager.setFocusedKey(key);

        if (selectOnFocus) {
          manager.replaceSelection(key);
        }
      };

      // If the user hasn't yet interacted with the collection, there will be no focusedKey set.
      // Attempt to detect whether the user is tabbing forward or backward into the collection
      // and either focus the first or last item accordingly.
      const relatedTarget = e.relatedTarget as Element;
      if (
        relatedTarget &&
        e.currentTarget.compareDocumentPosition(relatedTarget) & Node.DOCUMENT_POSITION_FOLLOWING
      ) {
        navigateToFirstKey(manager.lastSelectedKey() ?? delegate.getLastKey?.());
      } else {
        navigateToFirstKey(manager.firstSelectedKey() ?? delegate.getFirstKey?.());
      }
    } else if (!access(props.isVirtualized)) {
      const scrollEl = _scrollRef();

      if (scrollEl) {
        // Restore the scroll position to what it was before.
        scrollEl.scrollTop = scrollPos.top;
        scrollEl.scrollLeft = scrollPos.left;

        // Refocus and scroll the focused item into view if it exists within the scrollable region.
        const element = scrollEl?.querySelector(`[data-key="${manager.focusedKey()}"]`);

        if (element) {
          // This prevents a flash of focus on the first/last element in the collection
          focusWithoutScrolling(element as HTMLElement);
          scrollIntoView(scrollEl, element as HTMLElement);
        }
      }
    }
  };

  const onFocusOut: JSX.EventHandlerUnion<HTMLElement, FocusEvent> = e => {
    const manager = access(props.selectionManager);

    // Don't set blurred and then focused again if moving focus within the collection.
    if (!e.currentTarget.contains(e.relatedTarget as HTMLElement)) {
      manager.setFocused(false);
    }
  };

  const onMouseDown: JSX.EventHandlerUnion<HTMLElement, MouseEvent> = e => {
    // Ignore events that bubbled through portals.
    if (e.currentTarget.contains(e.target)) {
      // Prevent focus going to the collection when clicking on the scrollbar.
      e.preventDefault();
    }
  };

  onMount(() => {
    const autoFocus = access(props.autoFocus);

    if (!autoFocus) {
      return;
    }

    const manager = access(props.selectionManager);
    const delegate = access(props.keyboardDelegate);

    let focusedKey: ItemKey | undefined;

    // Check focus strategy to determine which item to focus
    if (autoFocus === "first") {
      focusedKey = delegate.getFirstKey?.();
    }
    if (autoFocus === "last") {
      focusedKey = delegate.getLastKey?.();
    }

    // If there are any selected keys, make the first one the new focus target
    const selectedKeys = manager.selectedKeys();
    if (selectedKeys.size) {
      focusedKey = selectedKeys.values().next().value;
    }

    if (focusedKey != null) {
      manager.setFocused(true);
      manager.setFocusedKey(focusedKey);
    }

    const refEl = ref();

    // If no default focus key is selected, focus the collection itself.
    if (refEl && focusedKey == null && !access(props.shouldUseVirtualFocus)) {
      focusSafely(refEl);
    }
  });

  // If not virtualized, scroll the focused element into view when the focusedKey changes.
  // When virtualized, Virtualizer handles this internally.
  createEffect(
    on(
      [
        _scrollRef,
        () => access(props.isVirtualized),
        () => access(props.selectionManager).focusedKey()
      ],
      newValue => {
        const [scrollEl, isVirtualized, focusedKey] = newValue;

        if (!isVirtualized && focusedKey && scrollEl) {
          const element = scrollEl.querySelector(`[data-key="${focusedKey}"]`);

          if (element) {
            scrollIntoView(scrollEl, element as HTMLElement);
          }
        }
      }
    )
  );

  const { typeSelectProps } = createTypeSelect({
    keyboardDelegate: () => access(props.keyboardDelegate),
    selectionManager: () => access(props.selectionManager)
  });

  const collectionProps = createMemo(() => {
    let handlers: JSX.HTMLAttributes<any> = {
      onKeyDown,
      onFocusIn,
      onFocusOut,
      onMouseDown
    };

    if (!access(props.disallowTypeAhead)) {
      handlers = combineProps(typeSelectProps(), handlers);
    }

    // If nothing is focused within the collection, make the collection itself tabbable.
    // This will be marshalled to either the first or last item depending on where focus came from.
    // If using virtual focus, don't set a tabIndex at all so that VoiceOver on iOS 14 doesn't try
    // to move real DOM focus to the element anyway.
    let tabIndex: number | undefined;

    if (!access(props.shouldUseVirtualFocus)) {
      tabIndex = access(props.selectionManager).focusedKey() == null ? 0 : -1;
    }

    return {
      ...handlers,
      tabIndex
    } as JSX.HTMLAttributes<any>;
  });

  return { collectionProps };
}
