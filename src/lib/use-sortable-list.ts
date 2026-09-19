"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from "react";

/** How long keyboard moves are batched before the resulting order is saved — holding an arrow key shouldn't fire one request per step. */
const KEYBOARD_SAVE_DELAY_MS = 600;

const moveItem = <T,>(list: T[], from: number, to: number): T[] => {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

const sameOrder = <T extends { id: string }>(a: T[], b: T[]) =>
  a.length === b.length && a.every((item, index) => item.id === b[index].id);

type Options<T extends { id: string }> = {
  /** The saved order, from the server. Must keep the same identity between renders until it actually changes. */
  items: T[];
  /**
   * Persists a new order. Throw (after telling the user why) to have the list
   * snap back to the last saved order.
   */
  onReorder: (ordered: T[]) => Promise<void>;
  /** The element that contains every row; each row carries `data-sortable-id={item.id}`. */
  containerRef: RefObject<HTMLElement | null>;
};

/**
 * Drag-to-reorder for a vertical list, with no dependency: a pointer drag on
 * a row's handle (mouse, pen and touch alike) moves the row live to wherever
 * the pointer is, and dropping it saves the new order. The handle is also a
 * keyboard control — Arrow Up/Down move the focused row one place, saved
 * shortly after the last key press.
 *
 * The drag is followed with window-level listeners rather than pointer
 * capture on the handle: reordering re-inserts the dragged row's DOM node,
 * and browsers release pointer capture when a captured node is moved — which
 * would strand the drag after its first step.
 *
 * Each row's handle spreads `getHandleProps(item.id)` and marks the row with
 * `data-sortable-id`. While a drag or save is in flight the list ignores new
 * server data, so a background refetch can't yank a row out from under the
 * pointer.
 */
export const useSortableList = <T extends { id: string }>({ items, onReorder, containerRef }: Options<T>) => {
  const [order, setOrder] = useState(items);
  const [trackedItems, setTrackedItems] = useState(items);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Always the latest order, readable from an event handler that fires before
  // React has re-rendered with the previous event's `setOrder`.
  const orderRef = useRef(items);
  // Same idea for who is being dragged: pointer events can arrive back to back, before `draggingId` state has re-rendered.
  const draggingRef = useRef<string | null>(null);
  // The order to snap back to if a save fails: what it was before the current drag/burst of key presses.
  const rollbackRef = useRef(items);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Detaches the window listeners of the drag in progress, if any. */
  const stopDragRef = useRef<(() => void) | null>(null);

  useLayoutEffect(() => {
    orderRef.current = order;
  }, [order]);

  // Adopt fresh server data, but never mid-drag or mid-save.
  if (trackedItems !== items && draggingId === null && !saving) {
    setTrackedItems(items);
    setOrder(items);
  }

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      stopDragRef.current?.();
    },
    [],
  );

  const commit = (next: T[]) => {
    orderRef.current = next;
    setOrder(next);
  };

  const persist = async (next: T[], rollback: T[]) => {
    if (sameOrder(next, rollback)) return;
    setSaving(true);
    try {
      await onReorder(next);
    } catch {
      commit(rollback);
    } finally {
      setSaving(false);
    }
  };

  const focusHandle = (id: string) => {
    requestAnimationFrame(() => {
      containerRef.current?.querySelector<HTMLElement>(`[data-sortable-handle="${id}"]`)?.focus();
    });
  };

  const getHandleProps = (id: string) => ({
    "data-sortable-handle": id,
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (saving || draggingRef.current || (event.pointerType === "mouse" && event.button !== 0)) return;
      // No text selection / native drag image while dragging a row.
      event.preventDefault();
      // A keyboard burst still waiting to save is superseded by this drag.
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      } else {
        rollbackRef.current = orderRef.current;
      }
      draggingRef.current = id;
      setDraggingId(id);

      const pointerId = event.pointerId;
      const onMove = (moveEvent: globalThis.PointerEvent) => {
        if (moveEvent.pointerId !== pointerId) return;
        const rows = containerRef.current?.querySelectorAll<HTMLElement>("[data-sortable-id]");
        if (!rows) return;
        // Where the pointer sits among the *other* rows — each row above the
        // pointer's midpoint pushes the target one place down.
        let target = 0;
        rows.forEach((row) => {
          if (row.dataset.sortableId === id) return;
          const rect = row.getBoundingClientRect();
          if (moveEvent.clientY > rect.top + rect.height / 2) target += 1;
        });
        commit(moveItem(orderRef.current, orderRef.current.findIndex((item) => item.id === id), target));
      };
      const finish = (canceled: boolean) => {
        stopDragRef.current?.();
        stopDragRef.current = null;
        draggingRef.current = null;
        setDraggingId(null);
        if (canceled) commit(rollbackRef.current);
        else void persist(orderRef.current, rollbackRef.current);
      };
      const onUp = (upEvent: globalThis.PointerEvent) => {
        if (upEvent.pointerId === pointerId) finish(false);
      };
      const onCancel = (cancelEvent: globalThis.PointerEvent) => {
        if (cancelEvent.pointerId === pointerId) finish(true);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
      stopDragRef.current = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onCancel);
      };
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (saving || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
      event.preventDefault();
      const from = orderRef.current.findIndex((item) => item.id === id);
      const to = Math.min(orderRef.current.length - 1, Math.max(0, from + (event.key === "ArrowUp" ? -1 : 1)));
      if (from === -1 || to === from) return;

      if (!saveTimerRef.current) rollbackRef.current = orderRef.current;
      commit(moveItem(orderRef.current, from, to));
      focusHandle(id);

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        void persist(orderRef.current, rollbackRef.current);
      }, KEYBOARD_SAVE_DELAY_MS);
    },
  });

  return { order, draggingId, saving, getHandleProps };
};
