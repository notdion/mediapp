import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'gold' | 'mint';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
}

export function Button({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md',
  fullWidth = false,
  disabled = false,
  icon,
}: ButtonProps) {
  return (
    <motion.button
      className={`zen-button ${variant} ${size} ${fullWidth ? 'full-width' : ''}`}
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.02, y: -2 } : {}}
      whileTap={!disabled ? { scale: 0.98, y: 2 } : {}}
      transition={{ duration: 0.15 }}
    >
      {icon && <span className="button-icon">{icon}</span>}
      {children}
      
      <style>{`
        .zen-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-family: var(--font-family);
          font-weight: 800;
          border: none;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.15s ease;
          text-transform: none;
          letter-spacing: 0.02em;
        }
        
        .zen-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        /* Sizes */
        .zen-button.sm {
          padding: 10px 20px;
          font-size: 0.875rem;
          border-radius: 12px;
        }
        
        .zen-button.md {
          padding: 14px 28px;
          font-size: 1rem;
        }
        
        .zen-button.lg {
          padding: 18px 36px;
          font-size: 1.125rem;
          border-radius: 20px;
        }
        
        .zen-button.full-width {
          width: 100%;
        }
        
        /* Variants */
        .zen-button.primary {
          background: linear-gradient(135deg, #5A9E6B 0%, #7CB78B 100%);
          color: white;
          box-shadow: 
            0 4px 0 #3D7A4F,
            0 6px 20px rgba(90, 158, 107, 0.3);
        }
        
        .zen-button.primary:not(:disabled):active {
          transform: translateY(2px);
          box-shadow: 
            0 2px 0 #3D7A4F,
            0 4px 10px rgba(90, 158, 107, 0.2);
        }
        
        .zen-button.secondary {
          background: white;
          color: #5A9E6B;
          border: 3px solid #C8E6CF;
          box-shadow: 
            0 4px 0 #A8D5BA,
            0 6px 15px rgba(90, 158, 107, 0.15);
        }
        
        .zen-button.secondary:not(:disabled):active {
          transform: translateY(2px);
          box-shadow: 
            0 2px 0 #A8D5BA,
            0 4px 10px rgba(90, 158, 107, 0.1);
        }
        
        .zen-button.ghost {
          background: transparent;
          color: #5A9E6B;
          box-shadow: none;
        }
        
        .zen-button.ghost:hover {
          background: rgba(90, 158, 107, 0.08);
        }
        
        .zen-button.gold {
          background: linear-gradient(135deg, #FFD93D 0%, #FF9F43 100%);
          color: #1A2E1A;
          box-shadow: 
            0 4px 0 #CC8800,
            0 6px 20px rgba(255, 217, 61, 0.4);
        }
        
        .zen-button.gold:not(:disabled):active {
          transform: translateY(2px);
          box-shadow: 
            0 2px 0 #CC8800,
            0 4px 10px rgba(255, 217, 61, 0.3);
        }
        
        .zen-button.mint {
          background: linear-gradient(135deg, #7CB78B 0%, #5A9E6B 100%);
          color: white;
          box-shadow: 
            0 4px 0 #3D7A4F,
            0 6px 20px rgba(124, 183, 139, 0.3);
        }
        
        .zen-button.mint:not(:disabled):active {
          transform: translateY(2px);
          box-shadow: 
            0 2px 0 #3D7A4F,
            0 4px 10px rgba(124, 183, 139, 0.2);
        }
        
        .button-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </motion.button>
  );
}
