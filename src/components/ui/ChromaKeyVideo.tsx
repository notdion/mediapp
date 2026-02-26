import { useRef, useEffect } from 'react';

interface ChromaKeyVideoProps {
  src: string;
  className?: string;
  width?: number;
  height?: number;
  colorToReplace?: [number, number, number]; // RGB
  similarity?: number;
  smoothness?: number;
}

export function ChromaKeyVideo({ 
  src, 
  className = '', 
  width = 280, 
  height = 280,
  colorToReplace = [0, 255, 0], // Default pure green
  similarity = 0.4, // 0 to 1
  smoothness = 0.1 // 0 to 1
}: ChromaKeyVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let animationFrameId: number;

    const processFrame = () => {
      if (video.paused || video.ended) {
        animationFrameId = requestAnimationFrame(processFrame);
        return;
      }

      // Clear the canvas before drawing the new frame to prevent ghosting
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Since we set canvas dimensions exactly to video ratio in loadeddata, 
      // we can just draw it directly to fill the canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      try {
        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = frame.data;
        const [targetR, targetG, targetB] = colorToReplace;

        // RGB to YUV conversion for better color matching
        const rgb2yuv = (r: number, g: number, b: number) => {
          const y = 0.299 * r + 0.587 * g + 0.114 * b;
          const u = -0.14713 * r - 0.28886 * g + 0.436 * b;
          const v = 0.615 * r - 0.51499 * g - 0.10001 * b;
          return [y, u, v];
        };

        const [, targetU, targetV] = rgb2yuv(targetR, targetG, targetB);

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          const [, u, v] = rgb2yuv(r, g, b);

          // Calculate distance in UV space (chrominance)
          const distance = Math.sqrt(
            Math.pow(u - targetU, 2) + 
            Math.pow(v - targetV, 2)
          );

          // Normalize distance (max distance in UV space is around 255)
          const normalizedDistance = distance / 255;

          if (normalizedDistance < similarity) {
            data[i + 3] = 0; // Fully transparent
          } else if (normalizedDistance < similarity + smoothness) {
            // Smooth transition
            const alpha = (normalizedDistance - similarity) / smoothness;
            data[i + 3] = Math.floor(alpha * 255);
          }
        }

        ctx.putImageData(frame, 0, 0);
      } catch (e) {
        // Ignore errors (e.g., cross-origin issues)
        console.error("ChromaKey error:", e);
      }

      animationFrameId = requestAnimationFrame(processFrame);
    };

    const handlePlay = () => {
      processFrame();
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('loadeddata', () => {
      video.play().catch(e => console.error("Autoplay prevented:", e));
      
      // Set canvas size to match video aspect ratio exactly to prevent any squeezing
      if (video.videoWidth && video.videoHeight && canvas) {
        const dpr = window.devicePixelRatio || 1;
        
        // Use the exact video dimensions to ensure no distortion
        canvas.width = video.videoWidth * dpr;
        canvas.height = video.videoHeight * dpr;
      }
      
      processFrame();
    });

    // Start processing immediately if already playing
    if (!video.paused) {
      processFrame();
    } else {
      video.play().catch(e => console.error("Autoplay prevented:", e));
    }

    return () => {
      video.removeEventListener('play', handlePlay);
      cancelAnimationFrame(animationFrameId);
    };
  }, [colorToReplace, similarity, smoothness]);

  return (
    <div className={className} style={{ position: 'relative', width, height, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <video
        ref={videoRef}
        src={src}
        autoPlay
        loop
        muted
        playsInline
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      />
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>
  );
}
