import { type DependencyList, type RefObject, useEffect, useRef } from "react";
import { PlotDownloadButtons } from "./plot-download-buttons";

export interface PlotFigureProps {
  /**
   * Builds the Observable Plot node (e.g. via a `buildXPlot(data, t)` helper).
   * Return `null` to render nothing — for example when there is no data. Runs
   * inside an effect and is re-invoked whenever a value in `deps` changes.
   */
  render: () => (SVGSVGElement | HTMLElement) | null;
  /** Inputs the plot depends on; the plot is rebuilt when any of them change. */
  deps: DependencyList;
  /**
   * Base filename for the SVG/PNG download. When set, the download buttons are
   * rendered directly below the plot. Omit it together with `containerRef` when
   * the buttons need to live elsewhere in the layout.
   */
  filename?: string;
  /**
   * External ref to the plot container. Pass it (instead of `filename`) when the
   * download buttons must be placed apart from the plot — give the same ref to
   * `<PlotDownloadButtons containerRef={...}>`.
   */
  containerRef?: RefObject<HTMLDivElement | null>;
}

/**
 * Renders an Observable Plot node into the DOM and, by default, wires up the
 * SVG/PNG download buttons. Owns the imperative `append`/`remove` lifecycle so
 * plot components only need to describe *what* to draw (via `render`), not *how*
 * to mount it. The download buttons locate the SVG through the container ref, so
 * no per-plot DOM `id` is required.
 */
export function PlotFigure({
  render,
  deps,
  filename,
  containerRef,
}: PlotFigureProps) {
  const internalRef = useRef<HTMLDivElement>(null);
  const ref = containerRef ?? internalRef;

  useEffect(() => {
    const container = ref.current;
    if (!container) {
      return;
    }

    const node = render();
    if (!node) {
      return;
    }

    container.append(node);
    return () => {
      node.remove();
    };
    // `render`/`ref` are intentionally excluded: `deps` drives when the plot
    // rebuilds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return (
    <>
      <div className="flex justify-center">
        <div ref={ref}></div>
      </div>
      {filename != null && (
        <PlotDownloadButtons containerRef={ref} filename={filename} />
      )}
    </>
  );
}
