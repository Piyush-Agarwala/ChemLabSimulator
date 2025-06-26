import { useState } from "react";

interface RefluxCondenserProps {
  isActive: boolean;
  temperature: number;
  waterFlow: boolean;
  onToggleWater?: () => void;
  className?: string;
}

export default function RefluxCondenser({ 
  isActive, 
  temperature, 
  waterFlow,
  onToggleWater,
  className = "" 
}: RefluxCondenserProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className={`relative ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <svg width="100" height="200" viewBox="0 0 100 200" className="drop-shadow-lg">
        {/* Condenser shadow */}
        <ellipse
          cx="50"
          cy="190"
          rx="20"
          ry="3"
          fill="rgba(0,0,0,0.1)"
        />
        
        {/* Outer jacket */}
        <rect
          x="25"
          y="30"
          width="50"
          height="140"
          rx="25"
          fill="rgba(220, 240, 255, 0.1)"
          stroke="#2563eb"
          strokeWidth="2"
        />
        
        {/* Inner tube */}
        <rect
          x="35"
          y="40"
          width="30"
          height="120"
          rx="15"
          fill="rgba(255, 255, 255, 0.3)"
          stroke="#64748b"
          strokeWidth="1"
        />
        
        {/* Water inlet */}
        <rect
          x="15"
          y="150"
          width="15"
          height="6"
          rx="3"
          fill="#3b82f6"
          stroke="#1d4ed8"
          strokeWidth="1"
        />
        
        {/* Water outlet */}
        <rect
          x="70"
          y="50"
          width="15"
          height="6"
          rx="3"
          fill="#3b82f6"
          stroke="#1d4ed8"
          strokeWidth="1"
        />
        
        {/* Water flow animation */}
        {waterFlow && (
          <g>
            {/* Inlet flow */}
            <rect
              x="10"
              y="151"
              width="20"
              height="4"
              fill="#3b82f6"
              opacity="0.6"
              className="animate-pulse"
            />
            
            {/* Outlet flow */}
            <rect
              x="80"
              y="51"
              width="15"
              height="4"
              fill="#3b82f6"
              opacity="0.6"
              className="animate-pulse"
            />
            
            {/* Water circulation in jacket */}
            {[0, 1, 2, 3, 4].map(i => (
              <circle
                key={i}
                cx={30 + Math.sin(i * 0.5) * 5}
                cy={60 + i * 20}
                r="2"
                fill="#3b82f6"
                opacity="0.4"
                className="animate-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </g>
        )}
        
        {/* Vapor condensation */}
        {isActive && temperature > 60 && (
          <g>
            {/* Rising vapor */}
            {[0, 1, 2].map(i => (
              <path
                key={i}
                d={`M ${45 + i * 5} ${160 - i * 20} Q ${50 + i * 2} ${155 - i * 20} ${45 + i * 5} ${150 - i * 20}`}
                stroke="rgba(255, 255, 255, 0.8)"
                strokeWidth="2"
                fill="none"
                className="animate-pulse"
                style={{ animationDelay: `${i * 0.3}s` }}
              />
            ))}
            
            {/* Condensed droplets */}
            {[0, 1, 2, 3].map(i => (
              <circle
                key={i}
                cx={40 + i * 5}
                cy={70 + i * 15}
                r="1.5"
                fill="#3b82f6"
                opacity="0.7"
                className="animate-ping"
                style={{ animationDelay: `${i * 0.4}s` }}
              />
            ))}
          </g>
        )}
        
        {/* Connection joints */}
        <circle
          cx="50"
          cy="170"
          r="8"
          fill="none"
          stroke="#64748b"
          strokeWidth="2"
        />
        
        <circle
          cx="50"
          cy="30"
          r="8"
          fill="none"
          stroke="#64748b"
          strokeWidth="2"
        />
        
        {/* Temperature indicator */}
        {temperature > 25 && (
          <g>
            <rect
              x="5"
              y="80"
              width="20"
              height="12"
              rx="6"
              fill={temperature > 60 ? "#ef4444" : "#f59e0b"}
              opacity="0.9"
            />
            <text
              x="15"
              y="88"
              textAnchor="middle"
              fontSize="8"
              fill="white"
              className="font-bold"
            >
              {Math.round(temperature)}°
            </text>
          </g>
        )}
        
        {/* Water flow control */}
        <circle
          cx="20"
          cy="120"
          r="6"
          fill={waterFlow ? "#10b981" : "#6b7280"}
          stroke="#374151"
          strokeWidth="1"
          className="cursor-pointer transition-colors"
          onClick={onToggleWater}
        />
        
        {/* Labels */}
        <text
          x="50"
          y="15"
          textAnchor="middle"
          fontSize="10"
          fill="#374151"
          className="font-medium"
        >
          Reflux Condenser
        </text>
        
        <text
          x="8"
          y="165"
          fontSize="6"
          fill="#64748b"
        >
          H₂O in
        </text>
        
        <text
          x="75"
          y="45"
          fontSize="6"
          fill="#64748b"
        >
          H₂O out
        </text>
      </svg>
      
      {/* Control panel */}
      {isHovered && (
        <div className="absolute -right-20 top-1/2 transform -translate-y-1/2 bg-white rounded-lg shadow-lg p-3 border">
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-700">
              Water Flow: {waterFlow ? "ON" : "OFF"}
            </div>
            <div className="text-xs text-gray-600">
              Temp: {temperature}°C
            </div>
            <button
              onClick={onToggleWater}
              className={`px-2 py-1 text-xs rounded ${
                waterFlow ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {waterFlow ? 'Stop' : 'Start'} Water
            </button>
          </div>
        </div>
      )}
    </div>
  );
}