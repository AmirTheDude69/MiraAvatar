import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Clock, User } from "lucide-react";
import type { CvAnalysis } from "@shared/schema";

interface AvatarSectionProps {
  analysis: CvAnalysis | null;
  isProcessing: boolean;
}

export default function AvatarSection({ analysis, isProcessing }: AvatarSectionProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const isCompleted = analysis?.status === 'completed';
  const isSpeaking = isPlaying && isCompleted;

  useEffect(() => {
    if (analysis?.audioUrl && audioRef.current) {
      audioRef.current.src = analysis.audioUrl;
    }
  }, [analysis?.audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [analysis?.audioUrl]);

  const togglePlayPause = () => {
    if (!audioRef.current || !isCompleted) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const rewind = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
  };

  const forward = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 10);
  };

  const handleVolumeChange = (newVolume: number[]) => {
    const vol = newVolume[0];
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol / 100;
    }
    if (vol === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    audioRef.current.muted = newMuted;
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Avatar Display Card */}
      <Card className="hyperdash-card shadow-2xl border-border/20 min-h-96 hyperdash-glow">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-foreground mb-2 hyperdash-gradient-text">AI Career Coach</h3>
            <p className="text-muted-foreground">
              {isCompleted 
                ? "Analysis complete - Ready for voice feedback" 
                : isProcessing 
                  ? "Processing your career data..." 
                  : "Upload your CV for advanced AI analysis"
              }
            </p>
          </div>
          
          {/* Avatar Container */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <div className={`w-32 h-32 hyperdash-gradient rounded-full flex items-center justify-center avatar-glow ${
                isSpeaking ? 'animate-pulse pulse-ring' : ''
              }`}>
                <User className="text-black w-12 h-12" />
              </div>
              {isSpeaking && (
                <div className="absolute -inset-4 border-2 border-primary rounded-full pulse-ring hyperdash-glow"></div>
              )}
            </div>
          </div>
          
          {/* Status Display */}
          <div className="text-center space-y-4">
            {!isProcessing && !isCompleted && (
              <div className="bg-card/50 rounded-lg p-4 border border-border/30">
                <Clock className="text-muted-foreground w-8 h-8 mb-2 mx-auto" />
                <p className="text-muted-foreground font-medium">Ready to analyze your CV</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Upload your PDF to get started</p>
              </div>
            )}
            
            {isProcessing && (
              <div className="glass-panel rounded-lg p-4 border border-primary/20 hyperdash-glow">
                <div className="flex items-center justify-center space-x-3 mb-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  <p className="text-primary font-medium text-glow">Processing Analysis...</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground">Extracting text</span>
                    <span className="text-primary">✓</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground">AI analysis</span>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Generating voice</span>
                    <span>...</span>
                  </div>
                </div>
              </div>
            )}

            {isCompleted && (
              <div className="bg-green-400/10 rounded-lg p-4 border border-green-400/20">
                <Volume2 className="text-green-400 w-8 h-8 mb-2 mx-auto" />
                <p className="text-green-400 font-medium">
                  {isSpeaking ? 'Providing feedback...' : 'Ready to provide feedback'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Audio Controls Card */}
      <Card className="glass-card shadow-xl border-border/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-foreground">Audio Controls</h4>
            <div className="text-sm text-muted-foreground">
              {formatTime(duration)}
            </div>
          </div>
          
          {/* Audio Progress Bar */}
          <div className="relative mb-4">
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="grok-gradient h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
          
          {/* Playback Controls */}
          <div className="flex items-center justify-center space-x-6">
            <Button
              variant="outline"
              size="sm"
              className="w-12 h-12 rounded-full border-border/30 hover:border-primary/30"
              disabled={!isCompleted}
              onClick={rewind}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              size="lg"
              className="w-16 h-16 rounded-full grok-gradient text-white hover:opacity-90"
              disabled={!isCompleted}
              onClick={togglePlayPause}
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-12 h-12 rounded-full border-border/30 hover:border-primary/30"
              disabled={!isCompleted}
              onClick={forward}
            >
              <RotateCw className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Volume Control */}
          <div className="flex items-center space-x-3 mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
              className="grok-hover"
            >
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            <div className="flex-1">
              <Slider
                value={[volume]}
                onValueChange={handleVolumeChange}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
          </div>
          
          <audio ref={audioRef} preload="metadata" />
        </CardContent>
      </Card>
    </div>
  );
}
