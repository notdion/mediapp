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
    let lastProcessTime = 0;

    const processFrame = (timestamp: number) => {
      if (video.paused || video.ended) {
        animationFrameId = requestAnimationFrame(processFrame);
        return;
      }

      // Throttle to roughly 24fps if requestAnimationFrame is firing faster
      if (timestamp - lastProcessTime < 35) {
        animationFrameId = requestAnimationFrame(processFrame);
        return;
      }
      lastProcessTime = timestamp;

      // Clear the canvas before drawing the new frame to prevent ghosting
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Since we set canvas dimensions exactly to video ratio in loadeddata, 
      // we can just draw it directly to fill the canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      try {
        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = frame.data;
        const [targetR, targetG, targetB] = colorToReplace;

        // Precalculate target U and V
        const targetU = -0.14713 * targetR - 0.28886 * targetG + 0.436 * targetB;
        const targetV = 0.615 * targetR - 0.51499 * targetG - 0.10001 * targetB;

        // Precalculate squared thresholds to avoid Math.sqrt in the loop
        const sim255 = similarity * 255;
        const smooth255 = smoothness * 255;

        // Optimize loop: inline math, avoid function calls and array allocations
        for (let i = 0, len = data.length; i < len; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          const u = -0.14713 * r - 0.28886 * g + 0.436 * b;
          const v = 0.615 * r - 0.51499 * g - 0.10001 * b;

          const du = u - targetU;
          const dv = v - targetV;
          
          // Calculate distance in UV space (chrominance)
          const distance = Math.sqrt(du * du + dv * dv);

          if (distance < sim255) {
            data[i + 3] = 0; // Fully transparent
          } else if (distance < sim255 + smooth255) {
            // Smooth transition
            const alpha = (distance - sim255) / smooth255;
            data[i + 3] = alpha * 255;
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
      animationFrameId = requestAnimationFrame(processFrame);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('loadeddata', () => {
      video.play().catch(e => console.error("Autoplay prevented:", e));
      
      // Set canvas size to match video aspect ratio exactly to prevent any squeezing
      if (video.videoWidth && video.videoHeight && canvas) {
        // Cap DPR at 1.5 to prevent massive pixel counts on retina displays
        // This dramatically improves performance while keeping it looking sharp
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        const videoRatio = video.videoWidth / video.videoHeight;
        
        // Constrain by the height prop passed to the component rather than the native video resolution
        // The native video resolution is 1074x720, which is over 700k pixels to process per frame
        // By using the display height (e.g. 220), we process ~100k pixels instead
        const displayHeight = height;
        const displayWidth = displayHeight * videoRatio;
        
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
      }
      
      animationFrameId = requestAnimationFrame(processFrame);
    });

    // Start processing immediately if already playing
    if (!video.paused) {
      animationFrameId = requestAnimationFrame(processFrame);
    } else {
      video.play().catch(e => console.error("Autoplay prevented:", e));
    }

    return () => {
      video.removeEventListener('play', handlePlay);
      cancelAnimationFrame(animationFrameId);
    };
  }, [colorToReplace, similarity, smoothness, height]);

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
