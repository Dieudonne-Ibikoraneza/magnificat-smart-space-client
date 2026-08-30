"use client";

import { useEffect, useId, useRef, useState, type JSX } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Maximize, Minimize, RotateCw, ZoomIn, ZoomOut } from "lucide-react";

interface PDFViewerProps {
  src: string;
  fileName?: string;
  thumbnailMode?: boolean;
  className?: string;
  hideControls?: boolean;
}

interface PDFDocument {
  numPages: number;
  getPage(pageNumber: number): Promise<PDFPage>;
  destroy(): Promise<void>;
}

interface RenderContext {
  canvasContext: CanvasRenderingContext2D;
  transform?: number[];
  viewport: Viewport;
}

interface PDFPage {
  getViewport(options: { scale: number; rotation: number }): Viewport;
  render(renderContext: RenderContext): { promise: Promise<void>; cancel(): void };
}

interface Viewport {
  width: number;
  height: number;
}

interface RenderTask {
  cancel(): void;
  promise: Promise<void>;
}

interface PDFJSLib {
  GlobalWorkerOptions: {
    workerSrc: string;
  };
  getDocument(src: {
    url: string;
    cMapUrl?: string;
    cMapPacked?: boolean;
    standardFontDataUrl?: string;
  }): { promise: Promise<PDFDocument> };
}

declare global {
  interface Window {
    pdfjsLib?: PDFJSLib;
  }
}

const PDFJS_VERSION = "3.11.174";

/**
 * Renders a PDF to <canvas> via pdf.js instead of handing it to the browser's
 * native PDF viewer. Two reasons: an <iframe src={blobUrl}> pointed at that
 * native viewer renders unreliably inside a dialog on mobile (blank/broken —
 * confirmed in testing), and the native viewer always ships its own
 * download/print controls that can't be removed. This component owns every
 * pixel and every control, so there's no download action to strip out later —
 * there never was one, short of a screenshot or a browser extension, which no
 * viewer (native or custom) can prevent either.
 */
const PDFViewer = ({ src, fileName = "document.pdf", thumbnailMode = false, className, hideControls = false }: PDFViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(thumbnailMode ? 0.3 : 1.0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [canvasElements, setCanvasElements] = useState<JSX.Element[]>([]);

  const pdfDocRef = useRef<PDFDocument | null>(null);
  const renderTasksRef = useRef<Map<number, RenderTask>>(new Map());
  // useId (not Math.random()) — deterministic and safe to call during render.
  const instanceId = useId();

  const renderPage = async (pdf: PDFDocument, pageNum: number, zoom: number, rotationDeg: number) => {
    try {
      // Wait a bit for the canvas to be available in DOM
      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = document.getElementById(`${instanceId}-page-${pageNum}`) as HTMLCanvasElement | null;
      if (!canvas) {
        console.warn(`Canvas for page ${pageNum} not found, retrying...`);
        // Retry after a short delay
        setTimeout(() => renderPage(pdf, pageNum, zoom, rotationDeg), 200);
        return;
      }

      // Clear any existing render task for this page
      const existingTask = renderTasksRef.current.get(pageNum);
      if (existingTask?.cancel) existingTask.cancel();

      const page = await pdf.getPage(pageNum);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Get viewport at the desired scale
      const viewport = page.getViewport({ scale: zoom, rotation: rotationDeg });
      const outputScale = window.devicePixelRatio || 1;

      // Set canvas size to match viewport scaled by device pixel ratio for high DPI
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);

      // Set display size to match actual size
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      // At normal zoom, fit the page to the available viewer width. Keep
      // the intrinsic size when zoomed so intentional zooming can scroll.
      canvas.style.maxWidth = zoom <= 1 ? "100%" : "none";
      canvas.style.height = zoom <= 1 ? "auto" : `${Math.floor(viewport.height)}px`;

      const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

      // Clear the canvas before rendering
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const renderContext: RenderContext = {
        canvasContext: ctx,
        transform: transform,
        viewport: viewport,
      };

      // Store and execute the render task
      const renderTask = page.render(renderContext);
      renderTasksRef.current.set(pageNum, renderTask);

      await renderTask.promise;

      // Remove completed task
      renderTasksRef.current.delete(pageNum);
    } catch (error) {
      // Ignore cancellation errors
      if (error instanceof Error && error.name === "RenderingCancelledException") {
        return;
      }
      console.error(`Error rendering page ${pageNum}:`, error);
    }
  };

  const renderAllPages = async (pdf: PDFDocument, zoom: number, rotationDeg: number) => {
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      await renderPage(pdf, pageNum, zoom, rotationDeg);
    }
  };

  // PDF.js setup
  useEffect(() => {
    let mounted = true;
    // Snapshot the ref's Map once, up front — it's the same instance for the
    // component's whole life (see useRef above), but the lint rule can't know
    // that, and a variable captured here is guaranteed stable for both the
    // async work below and the cleanup, unlike reading `.current` again later.
    const tasks = renderTasksRef.current;

    const loadPDF = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Cancel all existing render tasks first
        tasks.forEach((task) => {
          if (task?.cancel) task.cancel();
        });
        tasks.clear();

        // Load PDF.js from CDN
        if (!window.pdfjsLib) {
          const script = document.createElement("script");
          script.src = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
          script.async = true;

          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        const pdfjsLib = window.pdfjsLib as PDFJSLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

        const loadingTask = pdfjsLib.getDocument({
          url: src,
          cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/cmaps/`,
          cMapPacked: true,
          standardFontDataUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/standard_fonts/`,
        });
        const pdf = await loadingTask.promise;

        if (!mounted) return;

        pdfDocRef.current = pdf;
        setTotalPages(pdf.numPages);

        // Create canvas elements using React state
        const canvases = [];
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          canvases.push(
            <div key={pageNum} className="relative">
              <canvas
                id={`${instanceId}-page-${pageNum}`}
                data-page-num={pageNum}
                className={`bg-white shadow-sm ${thumbnailMode ? "mx-auto" : ""}`}
              />
              {!thumbnailMode && (
                <div className="absolute top-2 right-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
                  Page {pageNum}
                </div>
              )}
            </div>,
          );
        }
        setCanvasElements(canvases);

        // Then render all pages
        await renderAllPages(pdf, scale, rotation);

        setIsLoading(false);
      } catch (err) {
        if (mounted) {
          setError("Failed to load PDF");
          console.error("PDF loading error:", err);
          setIsLoading(false);
        }
      }
    };

    loadPDF();

    return () => {
      mounted = false;
      // Cleanup on unmount
      tasks.forEach((task) => {
        if (task?.cancel) task.cancel();
      });
      tasks.clear();

      if (pdfDocRef.current) {
        pdfDocRef.current.destroy().catch(() => {});
        pdfDocRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // Re-render all pages when scale or rotation changes
  useEffect(() => {
    if (pdfDocRef.current) {
      renderAllPages(pdfDocRef.current, scale, rotation);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, rotation]);

  // Track current page based on which page canvas is most visible.
  // IntersectionObserver measures visibility against the nearest
  // scrollable ancestor (or the browser viewport) automatically — unlike
  // a manual 'scroll' listener on scrollContainerRef, this keeps working
  // even when an ancestor of the viewer (not the viewer's own internal
  // div) is the element that actually scrolls.
  useEffect(() => {
    if (totalPages === 0) return;

    const visibility = new Map<number, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const pageNum = Number((entry.target as HTMLElement).dataset.pageNum);
          if (!pageNum) return;
          visibility.set(pageNum, entry.intersectionRatio);
        });

        let bestPage = currentPage;
        let bestRatio = 0;
        visibility.forEach((ratio, pageNum) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestPage = pageNum;
          }
        });
        if (bestRatio > 0) setCurrentPage(bestPage);
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    const attach = () => {
      for (let i = 1; i <= totalPages; i++) {
        const canvas = document.getElementById(`${instanceId}-page-${i}`);
        if (canvas) observer.observe(canvas);
      }
    };

    // Canvases render asynchronously after this effect attaches, so
    // give them a moment to land in the DOM before observing.
    const attachTimeout = setTimeout(attach, 150);

    return () => {
      clearTimeout(attachTimeout);
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages]);

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const resetZoom = () => setScale(1.0);

  const scrollToPage = (pageNum: number) => {
    const canvas = document.getElementById(`${instanceId}-page-${pageNum}`);
    canvas?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const nextPage = () => {
    if (currentPage < totalPages) scrollToPage(currentPage + 1);
  };

  const prevPage = () => {
    if (currentPage > 1) scrollToPage(currentPage - 1);
  };

  const goToPage = (page: number) => {
    scrollToPage(Math.max(1, Math.min(page, totalPages)));
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const rotate = () => setRotation((prev) => (prev + 90) % 360);

  const formatZoom = () => `${Math.round(scale * 100)}%`;

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative flex overflow-hidden bg-zinc-100 dark:bg-zinc-900 ${
        isFullscreen ? "h-screen w-screen" : "h-full w-full"
      } flex-col ${className || ""}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
          <div className="text-center">
            <div className="border-navy mx-auto mb-4 size-12 animate-spin rounded-full border-b-2"></div>
            <p className="text-gray-600">Loading PDF...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
          <div className="text-center text-red-600">
            <BookOpen className="mx-auto mb-4 size-12 opacity-50" />
            <p className="text-lg font-semibold">{error}</p>
            <p className="mt-2 text-sm text-gray-600">Please check the PDF URL and try again.</p>
          </div>
        </div>
      )}

      {/* PDF Pages Container — right-click disabled so "Save image as..." on a
          rendered page isn't a one-click affordance; this can't stop a
          determined screenshot or extension, only the obvious path. */}
      {!isLoading && !error && (
        <div
          ref={scrollContainerRef}
          className={`h-full w-full overflow-auto ${thumbnailMode ? "bg-transparent" : "bg-gray-300"} ${thumbnailMode ? "pointer-events-none scrollbar-hide" : ""}`}
          style={{ padding: thumbnailMode ? "10px 0" : "20px 0" }}
          onContextMenu={(event) => event.preventDefault()}
        >
          <div className="flex flex-col items-center gap-4">{thumbnailMode ? canvasElements[0] : canvasElements}</div>
        </div>
      )}

      {/* Custom Controls Overlay */}
      {!thumbnailMode && !hideControls && (
        <div
          className={`absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-4 transition-opacity duration-300 ${
            showControls ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* Page Navigation */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-4">
              {/* Page Controls */}
              <div className="flex items-center gap-2 rounded-lg bg-black/50 px-3 py-2">
                <button
                  onClick={prevPage}
                  disabled={currentPage <= 1}
                  className="rounded p-1 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronLeft className="size-4" />
                </button>

                <div className="flex items-center gap-2 text-sm text-white">
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
                    className="w-12 rounded border border-white/30 bg-white/20 px-2 py-1 text-center text-white"
                  />
                  <span className="text-white/70">of {totalPages}</span>
                </div>

                <button
                  onClick={nextPage}
                  disabled={currentPage >= totalPages}
                  className="rounded p-1 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-2 rounded-lg bg-black/50 px-3 py-2">
                <button
                  onClick={zoomOut}
                  disabled={scale <= 0.5}
                  className="rounded p-1 text-white transition-colors hover:bg-white/20 disabled:opacity-30"
                >
                  <ZoomOut className="size-4" />
                </button>

                <button
                  onClick={resetZoom}
                  className="min-w-[60px] rounded px-2 py-1 text-sm text-white transition-colors hover:bg-white/20"
                >
                  {formatZoom()}
                </button>

                <button
                  onClick={zoomIn}
                  disabled={scale >= 3}
                  className="rounded p-1 text-white transition-colors hover:bg-white/20 disabled:opacity-30"
                >
                  <ZoomIn className="size-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Additional Tools — no download action here on purpose */}
              <button onClick={rotate} className="rounded p-2 text-white transition-colors hover:bg-white/20" title="Rotate">
                <RotateCw className="size-4" />
              </button>

              <button onClick={toggleFullscreen} className="rounded p-2 text-white transition-colors hover:bg-white/20">
                {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
              </button>
            </div>
          </div>

          {/* Zoom Level Indicator */}
          <div className="flex justify-center">
            <div className="max-w-full truncate rounded-full bg-black/70 px-3 py-1 text-center text-xs text-white">
              Page {currentPage} of {totalPages} • {formatZoom()} • {fileName}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFViewer;
