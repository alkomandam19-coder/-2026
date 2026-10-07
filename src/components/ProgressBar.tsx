import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ProgressBar() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(progress);
      } else {
        setScrollProgress(0);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Run initially and after a short delay to account for dynamic content layout height shifts
    handleScroll();
    const timer = setTimeout(handleScroll, 150);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timer);
    };
  }, [location.pathname]);

  // Visual "Flash-to-End" animation on route change to simulate page load progress
  const [routeChanging, setRouteChanging] = useState(false);
  useEffect(() => {
    setRouteChanging(true);
    const timer = setTimeout(() => {
      setRouteChanging(false);
    }, 450);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <div 
      id="global-progress-bar-container" 
      className="fixed top-0 left-0 right-0 h-[5px] z-[99999] pointer-events-none bg-slate-950/10"
    >
      <div
        id="global-progress-bar-fill"
        className="h-full bg-gradient-to-r from-amber-500 via-[#FF7F50] to-yellow-400 rounded-r-full shadow-[0_1px_8px_rgba(255,127,80,0.5)]"
        style={{
          width: routeChanging ? "100%" : `${scrollProgress}%`,
          opacity: routeChanging || scrollProgress > 0.5 ? 1 : 0,
          transition: routeChanging 
            ? "width 0.4s cubic-bezier(0.1, 0.8, 0.3, 1), opacity 0.3s ease-out" 
            : "width 0.1s ease-out, opacity 0.2s ease-out",
        }}
      />
    </div>
  );
}
