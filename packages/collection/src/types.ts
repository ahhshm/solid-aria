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

import { Accessor, JSX } from "solid-js";

export type Key = string | number;

export type Wrapper = (element: JSX.Element) => JSX.Element;

export type ItemRenderer<T> = (item: T) => JSX.Element;

export interface ItemProps<T> {
  /** A unique key for the item. */
  key?: Key;

  /** Rendered contents of the item or child items. */
  children: JSX.Element;

  /** Rendered contents of the item if `children` contains child items. */
  title?: JSX.Element;

  /** A string representation of the item's contents, used for features like typeahead. */
  textValue?: string;

  /** An accessibility label for this item. */
  "aria-label"?: string;

  /** A list of child item objects. Used for dynamic collections. */
  childItems?: Iterable<T>;

  /** Whether this item has children, even if not loaded yet. */
  hasChildItems?: boolean;
}

export interface ItemMetaData<T> {
  /** A unique key for the item. */
  key?: Accessor<Key | undefined>;

  /** A generator for getting a `PartialNode` from the item metadata used to build a collection `Node`. */
  getCollectionNode: () => Generator<PartialNode<T>>;
}

export interface SectionProps<T> {
  /** A unique key for the section. */
  key?: Key;

  /** Rendered contents of the section, e.g. a header. */
  title?: JSX.Element;

  /** An accessibility label for the section. */
  "aria-label"?: string;

  /** Static child items or a function to render children. */
  children: JSX.Element | ItemRenderer<T>;

  /** Item objects in the section. */
  items?: Iterable<T>;
}

export interface CollectionBase<T> {
  /** The contents of the collection. */
  children: JSX.Element | ItemRenderer<T>;

  /** Item objects in the collection. */
  items?: Iterable<T>;

  /** The item keys that are disabled. These items cannot be selected, focused, or otherwise interacted with. */
  disabledKeys?: Iterable<Key>;
}

/**
 * A generic interface to access a readonly sequential
 * collection of unique keyed items.
 */
export interface Collection<T> extends Iterable<T> {
  /** The number of items in the collection. */
  readonly size: number;

  /** Iterate over all keys in the collection. */
  getKeys(): Iterable<Key>;

  /** Get an item by its key. */
  getItem(key: Key): T | undefined;

  /** Get an item by the index of its key. */
  at(idx: number): T | undefined;

  /** Get the key that comes before the given key in the collection. */
  getKeyBefore(key: Key): Key | undefined;

  /** Get the key that comes after the given key in the collection. */
  getKeyAfter(key: Key): Key | undefined;

  /** Get the first key in the collection. */
  getFirstKey(): Key | undefined;

  /** Get the last key in the collection. */
  getLastKey(): Key | undefined;
}

export interface Node<T> {
  /** The type of item this node represents. */
  type: string;

  /** A unique key for the node. */
  key: Key;

  /** The object value the node was created from. */
  value: T;

  /** The level of depth this node is at in the heirarchy. */
  level: number;

  /** Whether this item has children, even if not loaded yet. */
  hasChildNodes: boolean;

  /** The loaded children of this node. */
  childNodes: Iterable<Node<T>>;

  /** The rendered contents of this node (e.g. JSX). */
  rendered: () => JSX.Element;

  /** A string value for this node, used for features like typeahead. */
  textValue: Accessor<string>;

  /** An accessibility label for this node. */
  "aria-label"?: Accessor<string | undefined>;

  /** The index of this node within its parent. */
  index?: number;

  /** A function that should be called to wrap the rendered node. */
  wrapper?: Wrapper;

  /** The key of the parent node. */
  parentKey?: Key;

  /** The key of the node before this node. */
  prevKey?: Key;

  /** The key of the node after this node. */
  nextKey?: Key;

  /** Additional properties specific to a particular node type. */
  props?: any;

  /** @private */
  shouldInvalidate?: (context: unknown) => boolean;
}

export interface PartialNode<T> {
  type?: string;
  key?: Key;
  value?: T;
  metadata?: ItemMetaData<T>;
  wrapper?: Wrapper;
  rendered?: () => JSX.Element;
  textValue?: Accessor<string>;
  "aria-label"?: Accessor<string | undefined>;
  index?: number;
  renderer?: ItemRenderer<T>;
  hasChildNodes?: boolean;
  childNodes?: () => IterableIterator<PartialNode<T>>;
  props?: any;
  shouldInvalidate?: (context: unknown) => boolean;
}
