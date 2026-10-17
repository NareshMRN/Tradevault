import React, { useEffect, useRef } from 'react';

interface InteractiveDotGridProps {
  containerRef?: React.RefObject<HTMLElement | null>;
  className?: string;
  dotSpacing?: number;
  baseRadius?: number;
  hoverRadius?: number;
  spotlightRadius?: number;
  isFixed?: boolean;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

export const InteractiveDotGrid: React.FC<InteractiveDotGridProps> = ({
  containerRef,
  className = '',
  dotSpacing = 26,
  baseRadius = 1.3,
  hoverRadius = 3.2,
  spotlightRadius = 160,
  isFixed = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let dpr = 1;

    // Mouse coordinates relative to canvas
    let targetMouseX = -1000;
    let targetMouseY = -1000;
    let mouseX = -1000;
    let mouseY = -1000;
    let isMouseInside = false;

    // Ripples on click
    const ripples: Ripple[] = [];

    // Resize handler
    const updateSize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      if (isFixed) {
        width = window.innerWidth;
        height = window.innerHeight;
      } else {
        const parent = canvas.parentElement;
        if (!parent) return;
        width = parent.clientWidth;
        height = parent.clientHeight;
      }

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);
    };

    updateSize();

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });
    if (isFixed) {
      window.addEventListener('resize', updateSize);
    } else if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    // Pointer event listeners on target container or window
    const targetEl = containerRef?.current || canvas.parentElement || window;

    const handlePointerMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX;
      const clientY = e.clientY;

      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        targetMouseX = clientX - rect.left;
        targetMouseY = clientY - rect.top;
        isMouseInside = true;
      } else {
        isMouseInside = false;
        targetMouseX = -1000;
        targetMouseY = -1000;
      }
    };

    const handlePointerLeave = () => {
      isMouseInside = false;
      targetMouseX = -1000;
      targetMouseY = -1000;
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (x >= 0 && x <= width && y >= 0 && y <= height) {
        ripples.push({
          x,
          y,
          radius: 0,
          maxRadius: Math.max(width, height) * 0.45,
          alpha: 1,
        });
      }
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('mouseleave', handlePointerLeave);
    targetEl.addEventListener('click', handleClick as EventListener);

    // Animation Loop
    let time = 0;

    const render = () => {
      time += 0.02;

      // Smooth mouse position interpolation (lerp)
      if (isMouseInside) {
        mouseX += (targetMouseX - mouseX) * 0.15;
        mouseY += (targetMouseY - mouseY) * 0.15;
      } else {
        mouseX += (-1000 - mouseX) * 0.1;
        mouseY += (-1000 - mouseY) * 0.1;
      }

      ctx.clearRect(0, 0, width, height);

      // Update ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += 5.5;
        r.alpha *= 0.96;
        if (r.alpha < 0.02 || r.radius > r.maxRadius) {
          ripples.splice(i, 1);
        }
      }

      // Calculate grid dimensions
      const cols = Math.ceil(width / dotSpacing) + 1;
      const rows = Math.ceil(height / dotSpacing) + 1;
      const offsetX = (width % dotSpacing) / 2;
      const offsetY = (height % dotSpacing) / 2;

      // Draw dots
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const originX = c * dotSpacing + offsetX;
          const originY = r * dotSpacing + offsetY;

          // Distance from mouse
          const dx = mouseX - originX;
          const dy = mouseY - originY;
          const distToMouse = Math.hypot(dx, dy);

          // Base ambient wave (subtle living motion)
          const ambientWave = Math.sin(time + originX * 0.025 + originY * 0.025) * 0.12;

          let currentX = originX;
          let currentY = originY;
          let currentRadius = baseRadius;
          let alpha = Math.min(1, Math.max(0.18, 0.32 + ambientWave));
          let isHovered = false;

          // Mouse spotlight & dispersion
          if (distToMouse < spotlightRadius) {
            isHovered = true;
            const factor = Math.pow(1 - distToMouse / spotlightRadius, 1.6);

            // Radius scales up smoothly
            currentRadius = baseRadius + (hoverRadius - baseRadius) * factor;

            // Alpha illuminates brightly
            alpha = Math.min(0.95, alpha + factor * 0.85);

            // Subtle magnetic displacement away from cursor (antigravity repulsion)
            const pushDistance = factor * 7;
            const angle = Math.atan2(dy, dx);
            currentX -= Math.cos(angle) * pushDistance;
            currentY -= Math.sin(angle) * pushDistance;
          }

          // Ripple effect on click
          for (const rip of ripples) {
            const ripDist = Math.hypot(rip.x - originX, rip.y - originY);
            const waveWidth = 45;
            if (Math.abs(ripDist - rip.radius) < waveWidth) {
              const ripFactor = (1 - Math.abs(ripDist - rip.radius) / waveWidth) * rip.alpha;
              currentRadius = Math.max(currentRadius, baseRadius + ripFactor * 2.5);
              alpha = Math.min(1, alpha + ripFactor * 0.7);
            }
          }

          // Render dot
          ctx.beginPath();
          ctx.arc(currentX, currentY, currentRadius, 0, Math.PI * 2);

          const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
          if (isHovered) {
            // Glowing spotlight
            ctx.fillStyle = isDark ? `rgba(99, 102, 241, ${alpha})` : `rgba(79, 70, 229, ${alpha})`;
            ctx.shadowColor = isDark ? 'rgba(56, 189, 248, 0.7)' : 'rgba(99, 102, 241, 0.6)';
            ctx.shadowBlur = 6;
          } else {
            // Ambient dots
            ctx.fillStyle = isDark ? `rgba(129, 140, 248, ${alpha * 0.4})` : `rgba(99, 102, 241, ${alpha * 0.85})`;
            ctx.shadowBlur = 0;
          }

          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (isFixed) {
        window.removeEventListener('resize', updateSize);
      }
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseleave', handlePointerLeave);
      targetEl.removeEventListener('click', handleClick as EventListener);
    };
  }, [containerRef, dotSpacing, baseRadius, hoverRadius, spotlightRadius, isFixed]);

  return (
    <canvas
      ref={canvasRef}
      className={`${isFixed ? 'fixed inset-0 w-screen h-screen' : 'absolute inset-0 w-full h-full'} pointer-events-none z-0 ${className}`}
      aria-hidden="true"
    />
  );
};
