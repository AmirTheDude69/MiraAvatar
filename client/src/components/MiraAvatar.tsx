import { useEffect, useRef, useState } from 'react';
// Use copied video file with clean name
const miraVideo = '/mira-avatar.mp4';

interface MiraAvatarProps {
  isPlaying: boolean;
  audioElement?: HTMLAudioElement | null;
}

export const MiraAvatar: React.FC<MiraAvatarProps> = ({ isPlaying, audioElement }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showAvatar, setShowAvatar] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);

  // Handle video visibility and playback
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      setShowAvatar(true);
      
      // Start video playback when audio starts
      const playVideo = async () => {
        try {
          video.currentTime = 0; // Reset to beginning
          video.playbackRate = 0.85; // Set to 0.85x speed
          await video.play();
        } catch (error) {
          console.error('Error playing Mira video:', error);
        }
      };

      if (isVideoReady) {
        playVideo();
      }
    } else {
      // Fade out and pause video when audio stops
      const fadeOut = () => {
        video.pause();
        setTimeout(() => setShowAvatar(false), 300); // Wait for fade transition
      };
      
      fadeOut();
    }
  }, [isPlaying, isVideoReady]);

  // Handle video looping based on audio duration
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !audioElement || !isPlaying) return;

    const handleAudioEnd = () => {
      video.pause();
      setShowAvatar(false);
    };

    const handleVideoEnd = () => {
      // If audio is still playing, loop the video
      if (audioElement && !audioElement.paused && !audioElement.ended) {
        video.currentTime = 0;
        video.playbackRate = 0.85; // Maintain 0.85x speed on loop
        video.play();
      }
    };

    audioElement.addEventListener('ended', handleAudioEnd);
    video.addEventListener('ended', handleVideoEnd);

    return () => {
      audioElement.removeEventListener('ended', handleAudioEnd);
      video.removeEventListener('ended', handleVideoEnd);
    };
  }, [audioElement, isPlaying]);

  return (
    <div className={`fixed bottom-24 right-8 z-50 transition-all duration-300 ${
      showAvatar ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
    }`} style={{ backgroundColor: 'transparent' }}>
      <div className="relative" style={{ backgroundColor: 'transparent' }}>
        {/* Mira Avatar Video */}
        <video
          ref={videoRef}
          className="rounded-2xl shadow-2xl border-2 border-emerald-400/30"
          style={{
            width: 'auto',
            height: '200px',
            backgroundColor: 'transparent',
            maxWidth: '150px',
            objectFit: 'contain'
          }}
          muted
          playsInline
          onLoadedData={() => {
            setIsVideoReady(true);
            // Set playback rate immediately when video loads
            if (videoRef.current) {
              videoRef.current.playbackRate = 0.85;
            }
          }}
          onError={(e) => console.error('Mira video error:', e)}
        >
          <source src={miraVideo} type="video/mp4" />
        </video>
        
        {/* Glow effect when active */}
        {showAvatar && (
          <div className="absolute inset-0 rounded-2xl bg-emerald-400/20 blur-md animate-pulse" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)' }}></div>
        )}
        
        {/* Name label */}
        {showAvatar && (
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
            <div className="bg-black/80 backdrop-blur-sm rounded-lg px-3 py-1 border border-emerald-400/30">
              <span className="text-emerald-300 text-xs titillium-web-semibold">MIRA</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};