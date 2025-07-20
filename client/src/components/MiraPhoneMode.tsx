import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface MiraPhoneModeProps {
  isRecording: boolean;
  isProcessing: boolean;
  isConnected: boolean;
  isMiraActive: boolean;
  currentTranscription: string;
  onToggleRecording: () => void;
}

// Use copied video file with clean name
const miraVideo = '/mira-avatar.mp4';

// Advanced data visualization for waiting state
const DataCluster = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
      <div className="relative w-full h-full max-w-md">
        {/* Central matrix core */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50"></div>
        
        {/* Multiple orbiting layers */}
        {Array.from({ length: 4 }).map((_, layer) => {
          const nodeCount = 8 + layer * 4;
          const radius = 80 + layer * 40;
          
          return Array.from({ length: nodeCount }).map((_, i) => {
            const angle = (i * (360 / nodeCount)) * Math.PI / 180;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const size = 4 - layer * 0.5;
            const opacity = 1 - layer * 0.2;
            
            return (
              <div
                key={`${layer}-${i}`}
                className="absolute rounded-full bg-gradient-to-br from-emerald-300 to-teal-300"
                style={{
                  left: `calc(50% + ${x}px)`,
                  top: `calc(50% + ${y}px)`,
                  width: `${size}px`,
                  height: `${size}px`,
                  opacity: opacity * 0.8,
                  animation: `float ${3 + layer * 0.5}s infinite ease-in-out, spin ${10 + layer * 5}s infinite linear`,
                  animationDelay: `${i * 0.1 + layer * 0.3}s`,
                  filter: 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.5))'
                }}
              />
            );
          });
        })}
        
        {/* Dynamic connecting web */}
        <svg className="absolute inset-0 w-full h-full" style={{ filter: 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.4))' }}>
          {Array.from({ length: 24 }).map((_, i) => {
            const angle1 = (i * 15) * Math.PI / 180;
            const angle2 = ((i + 3) * 15) * Math.PI / 180;
            const radius1 = 80 + (i % 3) * 40;
            const radius2 = 120 + (i % 2) * 40;
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            const x1 = centerX + Math.cos(angle1) * radius1;
            const y1 = centerY + Math.sin(angle1) * radius1;
            const x2 = centerX + Math.cos(angle2) * radius2;
            const y2 = centerY + Math.sin(angle2) * radius2;
            
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(16, 185, 129, 0.2)"
                strokeWidth="1"
                className="animate-pulse"
                style={{ 
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: `${2 + (i % 3)}s`
                }}
              />
            );
          })}
        </svg>
        
        {/* Pulsing energy rings */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border border-emerald-400 rounded-full animate-ping"
            style={{
              width: `${(i + 1) * 60}px`,
              height: `${(i + 1) * 60}px`,
              opacity: 0.1 + (i * 0.05),
              animationDelay: `${i * 0.2}s`,
              animationDuration: `${3 + i * 0.5}s`
            }}
          />
        ))}
        
        {/* Floating data particles */}
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={`particle-${i}`}
            className="absolute w-1 h-1 bg-emerald-400 rounded-full"
            style={{
              left: `${20 + Math.random() * 60}%`,
              top: `${20 + Math.random() * 60}%`,
              animation: `float ${2 + Math.random() * 3}s infinite ease-in-out`,
              animationDelay: `${Math.random() * 2}s`,
              opacity: 0.3 + Math.random() * 0.4
            }}
          />
        ))}
        
        {/* Energy waves */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/5 to-transparent animate-pulse"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/5 to-transparent animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
    </div>
  );
};

export function MiraPhoneMode({ 
  isRecording, 
  isProcessing, 
  isConnected, 
  isMiraActive, 
  currentTranscription,
  onToggleRecording 
}: MiraPhoneModeProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isMiraActive) {
      const playVideo = async () => {
        try {
          video.currentTime = 0;
          video.playbackRate = 0.85;
          await video.play();
        } catch (error) {
          console.error('Error playing Mira video:', error);
        }
      };
      playVideo();
    } else {
      video.pause();
    }

    const handleVideoEnd = () => {
      if (isMiraActive) {
        video.currentTime = 0;
        video.playbackRate = 0.85;
        video.play();
      }
    };

    video.addEventListener('ended', handleVideoEnd);
    return () => video.removeEventListener('ended', handleVideoEnd);
  }, [isMiraActive]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col justify-center items-center">
      {/* Main content area - vertical layout */}
      <div className="relative w-full h-full flex flex-col justify-center items-center overflow-hidden">
        {isMiraActive ? (
          // Mira video when talking - centered vertically
          <div className="relative w-full h-full flex items-center justify-center">
            <video
              ref={videoRef}
              className="max-w-full max-h-full object-contain"
              style={{ backgroundColor: 'transparent' }}
              muted
              playsInline
              onLoadedData={() => {
                setIsVideoReady(true);
                if (videoRef.current) {
                  videoRef.current.playbackRate = 0.85;
                }
              }}
              onError={(e) => console.error('Mira video error:', e)}
            >
              <source src={miraVideo} type="video/mp4" />
            </video>
          </div>
        ) : (
          // Advanced data cluster when waiting
          <DataCluster />
        )}

        {/* Caption overlay when Mira is talking */}
        {isMiraActive && currentTranscription && (
          <div className="absolute bottom-24 left-4 right-4 z-10">
            <div className="bg-black/90 backdrop-blur-md rounded-2xl p-6 border border-emerald-400/40 shadow-lg shadow-emerald-400/20">
              <p className="text-white text-center titillium-web-regular text-xl leading-relaxed">
                {currentTranscription}
              </p>
            </div>
          </div>
        )}

        {/* Simple microphone button - floating at bottom */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
          <Button
            onClick={onToggleRecording}
            disabled={isProcessing || !isConnected}
            className={`w-16 h-16 rounded-full border-2 transition-all duration-300 shadow-2xl ${
              isRecording 
                ? 'bg-red-500/80 border-red-300 scale-110 shadow-red-500/50' 
                : isProcessing
                ? 'bg-yellow-500/80 border-yellow-300 animate-pulse shadow-yellow-500/50'
                : 'bg-emerald-500/20 border-emerald-300 hover:bg-emerald-500/40 hover:scale-105 shadow-emerald-500/30'
            }`}
          >
            {isProcessing ? (
              <Loader2 className="w-6 h-6 animate-spin text-white" />
            ) : isRecording ? (
              <MicOff className="w-6 h-6 text-white" />
            ) : (
              <Mic className="w-6 h-6 text-emerald-300" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}