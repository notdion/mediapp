import { motion } from 'framer-motion';

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
  return (
    <div className="waveform-visualizer">
      <div className="waveform-bars">
        {Array.from({ length: barCount }, (_, i) => (
          <motion.div
            key={i}
            className="waveform-bar"
            style={{ backgroundColor: color }}
            animate={{ 
              scaleY: isActive
                ? [0.2 + (i % 3) * 0.1, 0.7 + (i % 5) * 0.06, 0.2 + (i % 3) * 0.1]
                : 0.2,
              opacity: isActive ? [0.45, 1, 0.45] : 0.4,
            }}
            transition={{ 
              duration: isActive ? 0.45 + (i % 6) * 0.06 : 0.2,
              repeat: isActive ? Infinity : 0,
              delay: isActive ? (i % 8) * 0.03 : 0,
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
