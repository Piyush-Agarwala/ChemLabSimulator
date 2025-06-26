import { useState } from "react";

interface IceBathProps {
  temperature: number;
  hasIce: boolean;
  onAddIce?: () => void;
  className?: string;
}

export default function IceBath({ 
  temperature, 
  hasIce, 
  onAddIce,
  className = "" 
}: IceBathProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className={`relative cursor-pointer ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onAddIce}
    >
      <svg width="200" height="120" viewBox="0 0 200 120" className="drop-shadow-lg">
        {/* Bath shadow */}
        <ellipse
          cx="100"
          cy="110"
          rx="80"
          ry="8"
          fill="rgba(0,0,0,0.1)"
        />
        
        {/* Bath container */}
        <ellipse
          cx="100"
          cy="80"
          rx="75"
          ry="25"
          fill="#e5e7eb"
          stroke="#9ca3af"
          strokeWidth="2"
        />
        
        {/* Water/ice mixture */}
        <ellipse
          cx="100"
          cy="78"
          rx="70"
          ry="20"
          fill={hasIce ? "#bfdbfe" : "#dbeafe"}
          opacity="0.8"
        />
        
        {/* Ice cubes */}
        {hasIce && (
          <g>
            {[0, 1, 2, 3, 4, 5].map(i => {
              const x = 50 + (i % 3) * 30 + Math.random() * 10;
              const y = 70 + Math.floor(i / 3) * 8 + Math.random() * 5;
              return (
                <rect
                  key={i}
                  x={x}
                  y={y}
                  width="8"
                  height="6"
                  rx="1"
                  fill="rgba(255, 255, 255, 0.9)"
                  stroke="#bfdbfe"
                  strokeWidth="1"
                  className="animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              );
            })}
          </g>
        )}
        
        {/* Thermometer in bath */}
        <rect
          x="95"
          y="50"
          width="4"
          height="35"
          rx="2"
          fill="#f3f4f6"
          stroke="#6b7280"
          strokeWidth="1"
        />
        
        {/* Thermometer bulb */}
        <circle
          cx="97"
          cy="82"
          r="4"
          fill={temperature < 10 ? "#3b82f6" : "#ef4444"}
          stroke="#6b7280"
          strokeWidth="1"
        />
        
        {/* Temperature reading */}
        <rect
          x="105"
          y="45"
          width="25"
          height="12"
          rx="6"
          fill="#1f2937"
          opacity="0.9"
        />
        <text
          x="117"
          y="53"
          textAnchor="middle"
          fontSize="8"
          fill="#10b981"
          className="font-mono font-bold"
        >
          {temperature}°C
        </text>
        
        {/* Steam/cold vapor */}
        {temperature < 5 && (
          <g>
            {[0, 1, 2].map(i => (
              <path
                key={i}
                d={`M ${80 + i * 20} 60 Q ${85 + i * 20} 55 ${80 + i * 20} 50 Q ${75 + i * 20} 45 ${80 + i * 20} 40`}
                stroke="rgba(255, 255, 255, 0.6)"
                strokeWidth="2"
                fill="none"
                className="animate-pulse"
                style={{ animationDelay: `${i * 0.3}s` }}
              />
            ))}
          </g>
        )}
        
        {/* Bath rim */}
        <ellipse
          cx="100"
          cy="55"
          rx="75"
          ry="8"
          fill="none"
          stroke="#9ca3af"
          strokeWidth="2"
        />
        
        {/* Ice indicator */}
        <circle
          cx="30"
          cy="30"
          r="6"
          fill={hasIce ? "#3b82f6" : "#6b7280"}
          className={hasIce ? "animate-pulse" : ""}
        />
        
        {/* Label */}
        <text
          x="100"
          y="25"
          textAnchor="middle"
          fontSize="12"
          fill="#374151"
          className="font-medium"
        >
          Ice Bath
        </text>
        
        {/* Add ice instruction */}
        {!hasIce && (
          <text
            x="100"
            y="100"
            textAnchor="middle"
            fontSize="10"
            fill="#6b7280"
            className="animate-pulse"
          >
            Click to add ice
          </text>
        )}
      </svg>
      
      {/* Hover controls */}
      {isHovered && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded">
          {hasIce ? `Ice bath: ${temperature}°C` : "Click to add ice cubes"}
        </div>
      )}
    </div>
  );
}