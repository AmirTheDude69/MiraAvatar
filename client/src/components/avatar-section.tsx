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
      <Card className="shadow-sm border border-gray-200 min-h-96">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Your AI Career Coach</h3>
            <p className="text-gray-500">
              {isCompleted 
                ? "Ready to provide personalized feedback" 
                : isProcessing 
                  ? "Analyzing your CV..." 
                  : "Waiting for your CV to provide personalized feedback"
              }
            </p>
          </div>
          
          {/* Avatar Container */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <div className={`w-32 h-32 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center avatar-glow ${
                isSpeaking ? 'animate-pulse' : ''
              }`}>
                <User className="text-blue-500 w-12 h-12" />
              </div>
              {isSpeaking && (
                <div className="absolute -inset-4 border-2 border-blue-500 rounded-full pulse-ring"></div>
              )}
            </div>
          </div>
          
          {/* Status Display */}
          <div className="text-center space-y-4">
            {!isProcessing && !isCompleted && (
              <div className="bg-gray-50 rounded-lg p-4">
                <Clock className="text-gray-500 w-8 h-8 mb-2 mx-auto" />
                <p className="text-gray-500 font-medium">Ready to analyze your CV</p>
                <p className="text-sm text-gray-400 mt-1">Upload your PDF to get started</p>
              </div>
            )}
            
            {isProcessing && (
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-center space-x-3 mb-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                  <p className="text-blue-500 font-medium">Analyzing your CV...</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Extracting text</span>
                    <span className="text-green-500">✓</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>AI analysis</span>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  </div>
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Generating voice</span>
                    <span>...</span>
                  </div>
                </div>
              </div>
            )}

            {isCompleted && (
              <div className="bg-green-50 rounded-lg p-4">
                <Volume2 className="text-green-500 w-8 h-8 mb-2 mx-auto" />
                <p className="text-green-500 font-medium">
                  {isSpeaking ? 'Providing feedback...' : 'Ready to provide feedback'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Audio Controls Card */}
      <Card className="shadow-sm border border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900">Audio Controls</h4>
            <div className="text-sm text-gray-500">
              {formatTime(duration)}
            </div>
          </div>
          
          {/* Audio Progress Bar */}
          <div className="relative mb-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
          
          {/* Playback Controls */}
          <div className="flex items-center justify-center space-x-6">
            <Button
              variant="outline"
              size="sm"
              className="w-12 h-12 rounded-full"
              disabled={!isCompleted}
              onClick={rewind}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              size="lg"
              className="w-16 h-16 rounded-full bg-blue-500 hover:bg-blue-700"
              disabled={!isCompleted}
              onClick={togglePlayPause}
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-12 h-12 rounded-full"
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
