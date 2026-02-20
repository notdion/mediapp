import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface WaveformVisualizerProps {
  isActive: boolean;
  barCount?: number;
  color?: string;
}

export function WaveformVisualizer({ 
  isActive, 
  barCount = 32,
  color = '#5A9E6B',
}: WaveformVisualizerProps) {
  const [levels, setLevels] = useState<number[]>(Array(barCount).fill(0.2));
  
  useEffect(() => {
    if (!isActive) {
      setLevels(Array(barCount).fill(0.2));
      return;
    }
    
    const interval = setInterval(() => {
      setLevels(prev => prev.map(() => 0.2 + Math.random() * 0.8));
    }, 80);
    
    return () => clearInterval(interval);
  }, [isActive, barCount]);
  
  return (
    <div className="waveform-visualizer">
      <div className="waveform-bars">
        {levels.map((level, i) => (
          <motion.div
            key={i}
            className="waveform-bar"
            style={{ backgroundColor: color }}
            animate={{ 
              scaleY: isActive ? level : 0.2,
              opacity: isActive ? 0.8 + level * 0.2 : 0.4,
            }}
            transition={{ 
              duration: 0.1,
              ease: 'easeOut',
            }}
          />
        ))}
      </div>
      
      <style>{`
        .waveform-visualizer {
          width: 100%;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 20px;
        }
        
        .waveform-bars {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
          height: 100%;
          width: 100%;
        }
        
        .waveform-bar {
          width: 4px;
          height: 100%;
          border-radius: 2px;
          transform-origin: center;
        }
      `}</style>
    </div>
  );
}
