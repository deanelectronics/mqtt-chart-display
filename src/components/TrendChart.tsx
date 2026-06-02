import { useEffect, useRef } from "react";
import uPlot, { type Options } from "uplot";
import "uplot/dist/uPlot.min.css";
import type { Point } from "@/lib/topic-store";

type Props = {
  points: Point[];
  height?: number;
  showAxes?: boolean;
  color?: string;
};

export function TrendChart({ points, height = 60, showAxes = false, color }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const plotRef = useRef<uPlot | null>(null);

  // (re)create on showAxes/height changes
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const width = el.clientWidth || 300;

    const accent =
      color ??
      (getComputedStyle(document.documentElement)
        .getPropertyValue("--primary")
        .trim() ||
        "#e85d3a");
    const muted =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--muted-foreground")
        .trim() || "#888";
    const border =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--border")
        .trim() || "#333";

    // Resolve oklch -> use as-is, browsers in canvas need rgb; fall back if oklch
    const strokeColor = accent.includes("oklch") ? "#e85d3a" : accent;
    const gridColor = border.includes("oklch") ? "#333" : border;
    const axisColor = muted.includes("oklch") ? "#888" : muted;

    const opts: Options = {
      width,
      height,
      cursor: { show: showAxes, x: showAxes, y: showAxes },
      legend: { show: false },
      scales: { x: { time: true } },
      axes: showAxes
        ? [
            {
              stroke: axisColor,
              grid: { stroke: gridColor, width: 1 },
              ticks: { stroke: gridColor },
            },
            {
              stroke: axisColor,
              grid: { stroke: gridColor, width: 1 },
              ticks: { stroke: gridColor },
            },
          ]
        : [
            { show: false },
            { show: false },
          ],
      series: [
        {},
        {
          stroke: strokeColor,
          width: 2,
          points: { show: false },
          fill: showAxes ? `${strokeColor}22` : undefined,
        },
      ],
      padding: showAxes ? [10, 12, 0, 0] : [2, 2, 2, 2],
    };

    const data: uPlot.AlignedData = [
      points.map((p) => p.t / 1000),
      points.map((p) => p.v),
    ];

    plotRef.current = new uPlot(opts, data, el);

    const ro = new ResizeObserver(() => {
      if (plotRef.current && el.clientWidth > 0) {
        plotRef.current.setSize({ width: el.clientWidth, height });
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      plotRef.current?.destroy();
      plotRef.current = null;
    };
  }, [height, showAxes, color]);

  // update data
  useEffect(() => {
    if (!plotRef.current) return;
    const data: uPlot.AlignedData = [
      points.map((p) => p.t / 1000),
      points.map((p) => p.v),
    ];
    plotRef.current.setData(data);
  }, [points]);

  return <div ref={containerRef} style={{ width: "100%", height }} />;
}
