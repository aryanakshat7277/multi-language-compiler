import React, { useEffect, useRef } from 'react';
import './WaveformVisualizer.css';

interface WaveformVisualizerProps {
  isActive?: boolean;
  isListening?: boolean;
  height?: number;
  showParticles?: boolean;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  isActive = true,
  isListening = false,
  height = 110,
  showParticles = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    canvas.height = height;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || 800;
      canvas.height = height;
    };

    window.addEventListener('resize', handleResize);

    let phase = 0;

    // Glowing particle flow along wave
    const waveParticles: { x: number; y: number; speed: number; size: number; alpha: number; hue: number }[] = [];
    if (showParticles) {
      for (let i = 0; i < 35; i++) {
        waveParticles.push({
          x: Math.random() * width,
          y: height / 2,
          speed: 1.5 + Math.random() * 2.5,
          size: Math.random() * 2.5 + 1.2,
          alpha: Math.random() * 0.8 + 0.2,
          hue: Math.random() > 0.5 ? 185 : 320 // Cyan or Magenta
        });
      }
    }

    const drawWave = (
      frequency: number,
      amplitudeMultiplier: number,
      color: string,
      lineWidth: number,
      glowColor: string,
      phaseOffset: number
    ) => {
      const centerY = height * 0.55;
      const baseAmp = isListening ? 38 : isActive ? 22 : 8;
      const amp = baseAmp * amplitudeMultiplier;

      ctx.save();
      ctx.beginPath();
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 15;
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;

      for (let x = 0; x < width; x += 3) {
        // Bell-curve envelope to fade edges
        const envelope = Math.sin((x / width) * Math.PI);
        const y =
          centerY +
          Math.sin(x * frequency + phase + phaseOffset) * amp * envelope +
          Math.cos(x * frequency * 0.5 - phase * 0.8) * (amp * 0.35) * envelope;

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
      ctx.restore();
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      phase += isListening ? 0.08 : isActive ? 0.045 : 0.015;

      // Layer 1: Amber / Golden Glow Wave
      drawWave(0.012, 0.7, 'rgba(245, 158, 11, 0.65)', 2, '#f59e0b', 1.2);

      // Layer 2: Magenta / Purple Neon Wave
      drawWave(0.016, 0.85, 'rgba(217, 70, 239, 0.75)', 2.2, '#d946ef', 2.8);

      // Layer 3: Cyan Hero Wave (sharpest & brightest)
      drawWave(0.019, 1.1, 'rgba(0, 240, 255, 0.95)', 2.8, '#00f0ff', 0);

      // Layer 4: Particle flow across wave
      if (showParticles) {
        for (const p of waveParticles) {
          p.x += p.speed;
          if (p.x > width) p.x = 0;

          const envelope = Math.sin((p.x / width) * Math.PI);
          const waveY =
            height * 0.55 +
            Math.sin(p.x * 0.019 + phase) * (isListening ? 38 : 22) * envelope;

          ctx.save();
          ctx.beginPath();
          ctx.arc(p.x, waveY + (Math.random() - 0.5) * 8, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.hue === 185 ? '#00f0ff' : '#ec4899';
          ctx.shadowColor = p.hue === 185 ? '#00f0ff' : '#ec4899';
          ctx.shadowBlur = 10;
          ctx.globalAlpha = p.alpha * (isActive ? 1 : 0.3);
          ctx.fill();
          ctx.restore();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isActive, isListening, height, showParticles]);

  return (
    <div className="waveform-container" style={{ height: `${height}px` }}>
      <canvas ref={canvasRef} className="waveform-canvas" />
      <div className="waveform-horizon-line" />
    </div>
  );
};
