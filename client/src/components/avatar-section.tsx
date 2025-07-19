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
    <div className="space-y-6 h-full">
      {/* Enhanced Avatar Display Card */}
      <Card className="hyperdash-card shadow-2xl border-border/20 interactive-hover relative overflow-hidden h-full min-h-[600px] flex flex-col">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-cyan-500/3"></div>
        <CardContent className="relative p-8 flex-1 flex flex-col">
          <div className="text-center mb-8">
            <div className="inline-flex items-center space-x-2 mb-4">
              <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
              <h3 className="text-2xl font-bold text-gradient-primary">AI Career Coach</h3>
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-500"></div>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {isCompleted 
                ? "Analysis complete! Ready to deliver personalized feedback" 
                : isProcessing 
                  ? "Processing your career data with advanced AI..." 
                : "Upload your CV to unlock AI-powered career insights"
              }
            </p>
          </div>
          
          {/* Enhanced Avatar Container */}
          <div className="flex items-center justify-center mb-8 flex-1">
            <div className="relative">
              <div className={`w-40 h-40 hyperdash-gradient rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 ${
                isSpeaking ? 'animate-pulse scale-110' : 'hover:scale-105'
              }`}>
                <User className="text-black w-16 h-16" />
              </div>
              
              {/* Enhanced speaking indicator */}
              {isSpeaking && (
                <>
                  <div className="absolute -inset-6 border-2 border-primary/50 rounded-full animate-ping"></div>
                  <div className="absolute -inset-8 border border-primary/30 rounded-full animate-pulse"></div>
                </>
              )}
              
              {/* Floating accent elements */}
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-cyan-400 to-cyan-500 rounded-full opacity-60 floating-animation"></div>
              <div className="absolute -bottom-4 -left-4 w-4 h-4 bg-gradient-to-br from-purple-400 to-purple-500 rounded-full opacity-60 floating-animation delay-2000"></div>
            </div>
          </div>
          
          {/* Enhanced Status Display */}
          <div className="space-y-6">
            {!isProcessing && !isCompleted && (
              <div className="glass-enhanced rounded-2xl p-6 border border-border/30 text-center">
                <div className="w-12 h-12 bg-muted/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Clock className="text-muted-foreground w-6 h-6" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">Ready for Analysis</h4>
                <p className="text-sm text-muted-foreground">Upload your PDF to begin the AI-powered career assessment</p>
              </div>
            )}
            
            {isProcessing && (
              <div className="glass-enhanced rounded-2xl p-6 border border-primary/20 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent"></div>
                <div className="relative">
                  <div className="flex items-center justify-center space-x-3 mb-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <h4 className="text-primary font-semibold">Processing Analysis</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 bg-background/50 rounded-lg">
                      <span className="text-sm text-foreground">PDF Text Extraction</span>
                      <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-black text-xs font-bold">✓</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-background/50 rounded-lg">
                      <span className="text-sm text-foreground">AI Career Analysis</span>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-background/30 rounded-lg opacity-60">
                      <span className="text-sm text-muted-foreground">Voice Generation</span>
                      <div className="w-4 h-4 border-2 border-muted rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isCompleted && (
              <div className="glass-enhanced rounded-2xl p-6 border border-green-400/20 bg-green-400/5 text-center">
                <div className="w-12 h-12 bg-green-400/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Volume2 className="text-green-400 w-6 h-6" />
                </div>
                <h4 className="text-green-400 font-semibold mb-2">
                  {isSpeaking ? 'Delivering Insights' : 'Ready for Feedback'}
                </h4>
                <p className="text-sm text-green-400/80">
                  {isSpeaking ? 'Listen to your personalized career insights' : 'Click play to hear your analysis'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Audio Controls Card */}
      {isCompleted && (
        <Card className="glass-enhanced shadow-xl border-border/20 interactive-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-semibold text-foreground">Voice Feedback</h4>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>{formatTime(currentTime)}</span>
                <span>/</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
            
            {/* Enhanced Audio Progress Bar */}
            <div className="relative mb-6">
              <div className="w-full bg-muted/30 rounded-full h-3">
                <div 
                  className="hyperdash-gradient h-3 rounded-full transition-all duration-300 shadow-lg" 
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>
            
            {/* Enhanced Playback Controls */}
            <div className="flex items-center justify-center space-x-6 mb-6">
              <Button
                variant="outline"
                size="sm"
                className="w-12 h-12 rounded-full border-border/40 hover:border-primary/40 transition-all duration-300"
                disabled={!isCompleted}
                onClick={rewind}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button
                size="lg"
                className="w-16 h-16 rounded-full hyperdash-gradient text-black hover:shadow-2xl hover:scale-105 transition-all duration-300 border-0"
                disabled={!isCompleted}
                onClick={togglePlayPause}
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-12 h-12 rounded-full border-border/40 hover:border-primary/40 transition-all duration-300"
                disabled={!isCompleted}
                onClick={forward}
              >
                <RotateCw className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Enhanced Volume Control */}
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="hover:bg-primary/10 transition-colors duration-300"
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
              <span className="text-xs text-muted-foreground w-8 text-right">{volume}%</span>
            </div>
            
            <audio ref={audioRef} preload="metadata" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
