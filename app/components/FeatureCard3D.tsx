"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef } from "react";

interface FeatureCard3DProps {
  value: string;
  gradient: string;
  index: number;
}

export default function FeatureCard3D({ value, gradient, index }: FeatureCard3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const mouseXSpring = useSpring(x, { stiffness: 500, damping: 100 });
  const mouseYSpring = useSpring(y, { stiffness: 500, damping: 100 });
  
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7.5deg", "-7.5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7.5deg", "7.5deg"]);
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    
    x.set(xPct);
    y.set(yPct);
  };
  
  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };
  
  // Determine glow color based on gradient
  const getGlowColor = () => {
    if (gradient.includes('#1ed760')) return 'rgba(30, 215, 96, 0.4)';
    if (gradient.includes('#ff6ec7')) return 'rgba(255, 110, 199, 0.4)';
    if (gradient.includes('#8b5cf6')) return 'rgba(139, 92, 246, 0.4)';
    return 'rgba(59, 130, 246, 0.4)';
  };

  return (
    <motion.div
      ref={cardRef}
      className="card-3d text-left relative"
      style={{
        transformStyle: "preserve-3d",
        rotateX,
        rotateY,
      }}
      initial={{ opacity: 0, y: 20, rotateX: -15, rotateY: index % 2 === 0 ? -5 : 5 }}
      animate={{ opacity: 1, y: 0, rotateX: 0, rotateY: 0 }}
      transition={{ delay: 1 + index * 0.1, duration: 0.6, ease: "easeOut" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileHover={{ scale: 1.08, z: 50 }}
    >
      {/* 3D Background Layer */}
      <div className="card-3d-bg" />
      
      {/* Shine Effect */}
      <div className="card-3d-shine" />
      
      {/* Content */}
      <div className="card-3d-content relative z-10" style={{ transform: "translateZ(20px)" }}>
        {/* Icon with 3D depth - More rounded */}
        <motion.div 
          className="w-14 h-14 rounded-2xl mb-4 card-3d-icon"
          style={{ 
            background: gradient,
            boxShadow: `0 12px 24px rgba(0, 0, 0, 0.5), 0 0 40px ${getGlowColor()}, inset 0 2px 4px rgba(255, 255, 255, 0.2)`,
            transform: "translateZ(30px)",
            borderRadius: "1.25rem",
          }}
          whileHover={{ 
            scale: 1.15, 
            z: 40,
            rotateZ: 5,
            boxShadow: `0 16px 32px rgba(0, 0, 0, 0.6), 0 0 60px ${getGlowColor()}, inset 0 2px 6px rgba(255, 255, 255, 0.3)`
          }}
        />
        
        {/* Label */}
        <div 
          className="text-xs font-medium mb-2" 
          style={{ 
            color: "var(--text-secondary)",
            transform: "translateZ(15px)",
            textShadow: "0 2px 4px rgba(0, 0, 0, 0.3)"
          }}
        >
          {/* {label} */}
        </div>
        
        {/* Value */}
        <div 
          className="text-lg font-bold" 
          style={{ 
            color: "var(--text-primary)",
            transform: "translateZ(20px)",
            textShadow: "0 4px 8px rgba(0, 0, 0, 0.4)"
          }}
        >
          {value}
        </div>
      </div>
    </motion.div>
  );
}
