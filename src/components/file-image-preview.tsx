"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export const filePreviewKey = (file: File) => `${file.name}:${file.size}:${file.lastModified}`;

/** Owns one browser object URL for exactly one mounted file preview. */
export const FileImagePreview = ({ file, alt }: { file: File; alt: string }) => {
  const [url] = useState(() => URL.createObjectURL(file));

  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  return <Image src={url} alt={alt} fill unoptimized className="object-cover" />;
};
