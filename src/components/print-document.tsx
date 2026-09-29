"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

const subscribe = () => () => undefined;
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/** Print outside dashboard containers so scrolling and clipping cannot hide the document. */
export const PrintDocument = ({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) => {
  const mounted = useSyncExternalStore(
    subscribe,
    clientSnapshot,
    serverSnapshot,
  );
  if (!mounted) return null;

  return createPortal(
    <div id={id} className="print-document">
      {children}
    </div>,
    document.body,
  );
};
