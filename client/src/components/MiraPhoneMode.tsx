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

// Data cluster component for waiting state
const DataCluster = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="relative w-80 h-80">
        {/* Central core */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-emerald-400 rounded-full animate-pulse"></div>
        
        {/* Floating data points */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 30) * Math.PI / 180;
          const radius = 60 + (i % 3) * 30;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          
          return (
            <div
              key={i}
              className="absolute w-2 h-2 bg-emerald-300/70 rounded-full"
              style={{
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
                animation: `float ${2 + (i % 3) * 0.5}s infinite ease-in-out`,
                animationDelay: `${i * 0.1}s`
              }}
            />
          );
        })}
        
        {/* Connecting lines */}
        <svg className="absolute inset-0 w-full h-full" style={{ filter: 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.3))' }}>
          {Array.from({ length: 12 }).map((_, i) => {
            const angle1 = (i * 30) * Math.PI / 180;
            const angle2 = ((i + 1) * 30) * Math.PI / 180;
            const radius = 60;
            const x1 = 160 + Math.cos(angle1) * radius;
            const y1 = 160 + Math.sin(angle1) * radius;
            const x2 = 160 + Math.cos(angle2) * radius;
            const y2 = 160 + Math.sin(angle2) * radius;
            
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(16, 185, 129, 0.3)"
                strokeWidth="1"
                className="animate-pulse"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            );
          })}
        </svg>
        
        {/* Pulsing rings */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-emerald-400/30 rounded-full animate-ping"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-emerald-400/20 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
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
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Phone-style header */}
      <div className="bg-gradient-to-r from-gray-900 to-black p-4 flex items-center justify-center border-b border-emerald-400/20">
        <div className="text-center">
          <h1 className="text-2xl titillium-web-bold text-emerald-300 neon-text">MIRA</h1>
          <div className="text-xs text-emerald-400/70 titillium-web-light">Neural Interface Active</div>
        </div>
      </div>

      {/* Main video/data area */}
      <div className="flex-1 relative bg-black overflow-hidden">
        {isMiraActive ? (
          // Mira video when talking
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
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
        ) : (
          // Data cluster when waiting
          <DataCluster />
        )}

        {/* Caption overlay when Mira is talking */}
        {isMiraActive && currentTranscription && (
          <div className="absolute bottom-20 left-4 right-4">
            <div className="bg-black/80 backdrop-blur-md rounded-xl p-4 border border-emerald-400/30">
              <p className="text-white text-center titillium-web-regular text-lg leading-relaxed">
                {currentTranscription}
              </p>
            </div>
          </div>
        )}

        {/* Status indicator */}
        <div className="absolute top-4 left-4 right-4 flex justify-center">
          <div className={`px-4 py-2 rounded-full backdrop-blur-md border transition-all duration-300 ${
            isRecording 
              ? 'bg-red-500/20 border-red-400/50 text-red-300' 
              : isProcessing
              ? 'bg-yellow-500/20 border-yellow-400/50 text-yellow-300'
              : isMiraActive
              ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
              : 'bg-gray-500/20 border-gray-400/50 text-gray-300'
          }`}>
            <span className="titillium-web-semibold text-sm">
              {isRecording 
                ? '🎤 LISTENING...' 
                : isProcessing 
                ? '⚡ PROCESSING...'
                : isMiraActive 
                ? '🗣️ MIRA SPEAKING'
                : '💤 STANDBY'}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom control area */}
      <div className="p-6 bg-gradient-to-t from-black to-gray-900/50 border-t border-emerald-400/20">
        <div className="flex justify-center">
          <Button
            onClick={onToggleRecording}
            disabled={isProcessing || !isConnected}
            className={`titillium-web-bold w-20 h-20 rounded-full border-4 transition-all duration-200 ${
              isRecording 
                ? 'bg-red-500 border-red-300 scale-110 shadow-red-500/30 shadow-2xl' 
                : 'bg-emerald-500/20 border-emerald-300 hover:bg-emerald-500/30 hover:scale-105 shadow-xl'
            }`}
          >
            {isProcessing ? (
              <Loader2 className="w-8 h-8 animate-spin text-white" />
            ) : isRecording ? (
              <MicOff className="w-8 h-8 text-white" />
            ) : (
              <Mic className="w-8 h-8 text-emerald-300" />
            )}
          </Button>
        </div>
        
        {/* Connection status */}
        <div className="text-center mt-4">
          <div className={`inline-flex items-center space-x-2 text-xs ${
            isConnected ? 'text-emerald-400' : 'text-red-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
            }`} />
            <span className="titillium-web-light">
              {isConnected ? 'Neural Link Established' : 'Connecting...'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}