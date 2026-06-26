"use client";

import { type MotionValue, useScroll } from "framer-motion";
import { createContext, type ReactNode, useContext, useRef } from "react";
import { useInView } from "react-intersection-observer";

// Sticky-viz + scrolling-text scrollytelling. The container tracks its own
// scroll progress (0→1) and exposes it via context so continuous vizzes (a bar
// that drops, a clock that fills) can read it. Discrete vizzes (highlight a
// group) use ScrollyStep.onEnter instead. Layout/sticky behaviour is CSS
// (.scrolly in globals.css), which also handles the mobile stacked fallback.

const ProgressContext = createContext<MotionValue<number> | null>(null);

/** Read the container's scroll progress (0→1) from inside a Viz. */
export function useScrollyProgress(): MotionValue<number> {
  const v = useContext(ProgressContext);
  if (!v) throw new Error("useScrollyProgress must be used within <ScrollyContainer>");
  return v;
}

export function ScrollyContainer({
  children,
  vizSide = "right",
}: {
  children: ReactNode;
  vizSide?: "left" | "right";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  return (
    <ProgressContext.Provider value={scrollYProgress}>
      <div ref={ref} className={`scrolly${vizSide === "left" ? " scrolly--viz-left" : ""}`}>
        {children}
      </div>
    </ProgressContext.Provider>
  );
}

function Viz({ children }: { children: ReactNode }) {
  return (
    <div className="scrolly-viz">
      <div className="scrolly-viz-inner">{children}</div>
    </div>
  );
}

function Steps({ children }: { children: ReactNode }) {
  return <div className="scrolly-steps">{children}</div>;
}

ScrollyContainer.Viz = Viz;
ScrollyContainer.Steps = Steps;

export function ScrollyStep({ onEnter, children }: { onEnter?: () => void; children: ReactNode }) {
  // Fire when the step crosses the vertical center band of the viewport.
  const { ref } = useInView({
    rootMargin: "-45% 0px -45% 0px",
    threshold: 0,
    onChange: (inView) => {
      if (inView) onEnter?.();
    },
  });
  return (
    <div ref={ref} className="scrolly-step">
      {children}
    </div>
  );
}
