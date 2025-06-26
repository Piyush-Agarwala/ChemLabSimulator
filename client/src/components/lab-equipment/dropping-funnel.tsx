import { useState } from "react";

interface DroppingFunnelProps {
  isDropping: boolean;
  dropRate: number; // drops per second
  contents?: {
    color: string;
    volume: number;
    name: string;
  };
  onToggleDropping?: () => void;
  className?: string;
}

export default function DroppingFunnel({ 
  isDropping, 
  dropRate, 
  contents,
  onToggleDropping,
  className = "" 
}: DroppingFunnelProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className={`relative cursor-pointer ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onToggleDropping}
    >
      <svg width="120" height="180" viewBox="0 0 120 180" className="drop-shadow-lg">
        {/* Funnel shadow */}
        <ellipse
          cx="60"
          cy="170"
          rx="15"
          ry="3"
          fill="rgba(0,0,0,0.2)"
        />
        
        {/* Funnel body (inverted cone) */}
        <path
          d="M 30 40 L 90 40 L 75 100 L 45 100 Z"
          fill="rgba(220, 240, 255, 0.1)"
          stroke="#2563eb"
          strokeWidth="2"
        />
        
        {/* Funnel stem */}
        <rect
          x="57"
          y="100"
          width="6"
          height="60"
          fill="rgba(220, 240, 255, 0.1)"
          stroke="#2563eb"
          strokeWidth="2"
        />
        
        {/* Stopcock valve */}
        <rect
          x="50"
          y="130"
          width="20"
          height="8"
          rx="4"
          fill="#6b7280"
          stroke="#374151"
          strokeWidth="1"
        />
        
        {/* Valve handle */}
        <rect
          x={isDropping ? "45" : "75"}
          y="132"
          width="12"
          height="4"
          rx="2"
          fill="#374151"
          className="transition-all duration-300"
        />
        
        {/* Contents in funnel */}
        {contents && contents.volume > 0 && (
          <>
            <path
              d={`M 30 40 L 90 40 L ${90 - (contents.volume / 100) * 30} ${40 + (contents.volume / 100) * 60} L ${30 + (contents.volume / 100) * 30} ${40 + (contents.volume / 100) * 60} Z`}
              fill={contents.color}
              opacity="0.8"
              className="transition-all duration-500"
            />
            
            {/* Liquid surface */}
            <ellipse
              cx="60"
              cy="40"
              rx="30"
              ry="3"
              fill={contents.color}
              opacity="0.6"
            />
          </>
        )}
        
        {/* Dropping animation */}
        {isDropping && contents && (
          <g className="animate-pulse">
            {[0, 1, 2].map(i => (
              <circle
                key={i}
                cx="60"
                cy={165 + i * 8}
                r="2"
                fill={contents.color}
                opacity={0.8 - i * 0.2}
                className="animate-bounce"
                style={{ 
                  animationDelay: `${i * 0.3}s`,
                  animationDuration: `${1 / dropRate}s`
                }}
              />
            ))}
          </g>
        )}
        
        {/* Funnel rim */}
        <ellipse
          cx="60"
          cy="40"
          rx="30"
          ry="4"
          fill="none"
          stroke="#2563eb"
          strokeWidth="2"
        />
        
        {/* Spout */}
        <circle
          cx="60"
          cy="160"
          r="3"
          fill="none"
          stroke="#2563eb"
          strokeWidth="2"
        />
        
        {/* Volume markings */}
        {[25, 50, 75].map((mark, index) => {
          const y = 40 + (mark * 0.6);
          return (
            <g key={index}>
              <line
                x1="90"
                y1={y}
                x2="95"
                y2={y}
                stroke="#64748b"
                strokeWidth="1"
              />
              <text
                x="100"
                y={y + 2}
                fontSize="8"
                fill="#64748b"
                className="font-mono"
              >
                {100 - mark}ml
              </text>
            </g>
          );
        })}
        
        {/* Status indicator */}
        <circle
          cx="20"
          cy="50"
          r="4"
          fill={isDropping ? "#10b981" : "#6b7280"}
          className={isDropping ? "animate-pulse" : ""}
        />
        
        {/* Label */}
        <text
          x="60"
          y="25"
          textAnchor="middle"
          fontSize="10"
          fill="#374151"
          className="font-medium"
        >
          Dropping Funnel
        </text>
      </svg>
      
      {/* Control tooltip */}
      {isHovered && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded">
          {isDropping ? "Click to stop dropping" : "Click to start dropping"}
        </div>
      )}
      
      {/* Drop rate indicator */}
      {isDropping && (
        <div className="absolute top-0 right-0 bg-white rounded-lg shadow-md p-2 border">
          <div className="text-xs font-medium text-gray-700">
            {dropRate} drops/sec
          </div>
        </div>
      )}
    </div>
  );
}