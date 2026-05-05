import { useEffect, useRef } from 'react';

export default function HexagonBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let width, height;
    let hexRadius = 40;
    let mouse = { x: -1000, y: -1000 };

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);

    const drawHexagon = (x, y, radius, highlight) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i + Math.PI / 6;
        const px = x + radius * Math.cos(angle);
        const py = y + radius * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      
      if (highlight > 0) {
        ctx.strokeStyle = `rgba(153, 70, 42, ${0.2 + highlight * 0.6})`;
        ctx.lineWidth = 1 + highlight * 3;
        ctx.stroke();
        ctx.fillStyle = `rgba(254, 149, 114, ${highlight * 0.1})`;
        ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(203, 198, 189, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      const unitW = hexRadius * Math.sqrt(3);
      const unitH = hexRadius * 1.5;
      
      for (let y = 0; y < height + unitH; y += unitH) {
        const offset = (Math.floor(y / unitH) % 2) * (unitW / 2);
        for (let x = 0; x < width + unitW; x += unitW) {
          const cx = x + offset;
          const cy = y;
          
          const dist = Math.sqrt((mouse.x - cx)**2 + (mouse.y - cy)**2);
          const maxDist = 200;
          const highlight = Math.max(0, 1 - dist / maxDist);
          
          drawHexagon(cx, cy, hexRadius - 2, highlight);
        }
      }
      requestAnimationFrame(animate);
    };

    resize();
    const animId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
    />
  );
}
