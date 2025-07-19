import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "wouter";
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  User, 
  Bot, 
  Loader2, 
  Home, 
  Phone,
  PhoneOff,
  Radio
} from "lucide-react";

interface VoiceMessage {
  id: string;
  userText: string;
  response: string;
  audioUrl: string;
  timestamp: Date;
}

export default function LiveVoiceChat() {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize WebSocket connection
  const connectWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionStatus('connecting');
    
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log('WebSocket connected');
      setConnectionStatus('connected');
      setIsConnected(true);
      toast({
        title: "Connected",
        description: "Voice chat session started",
      });
    };

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'session_started':
          setSessionId(data.sessionId);
          console.log('Session started:', data.sessionId);
          break;
          
        case 'processing':
          setIsProcessing(true);
          break;
          
        case 'voice_response':
          setIsProcessing(false);
          const newMessage: VoiceMessage = {
            id: Date.now().toString(),
            userText: data.userText,
            response: data.response,
            audioUrl: data.audioUrl,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, newMessage]);
          
          // Auto-play AI response
          if (data.audioUrl) {
            playAudio(data.audioUrl);
          }
          break;
          
        case 'error':
          setIsProcessing(false);
          toast({
            title: "Error",
            description: data.message,
            variant: "destructive"
          });
          break;
      }
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket disconnected');
      setConnectionStatus('disconnected');
      setIsConnected(false);
      setSessionId(null);
      toast({
        title: "Disconnected",
        description: "Voice chat session ended",
        variant: "destructive"
      });
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('disconnected');
      toast({
        title: "Connection Error",
        description: "Failed to connect to voice chat",
        variant: "destructive"
      });
    };
  };

  // Disconnect WebSocket
  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    stopRecording();
    setIsConnected(false);
    setConnectionStatus('disconnected');
    setSessionId(null);
    setMessages([]);
  };

  // Initialize media recorder
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && isConnected) {
      navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      })
        .then(stream => {
          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
          });
          mediaRecorderRef.current = mediaRecorder;
          
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunksRef.current.push(event.data);
            }
          };
          
          mediaRecorder.onstop = () => {
            if (audioChunksRef.current.length > 0) {
              const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
              sendAudioToServer(audioBlob);
              audioChunksRef.current = [];
            }
          };
        })
        .catch(err => {
          console.error('Error accessing microphone:', err);
          toast({
            title: "Microphone access denied",
            description: "Please allow microphone access for voice chat",
            variant: "destructive"
          });
        });
    }
  }, [isConnected]);

  // Send audio to server via WebSocket
  const sendAudioToServer = async (audioBlob: Blob) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      wsRef.current.send(JSON.stringify({
        type: 'voice_data',
        audioData: base64Audio,
        sessionId
      }));
    } catch (error) {
      console.error('Error sending audio:', error);
      toast({
        title: "Audio send failed",
        description: "Could not send audio to server",
        variant: "destructive"
      });
    }
  };

  // Start recording
  const startRecording = () => {
    if (!mediaRecorderRef.current || !isConnected || isProcessing) return;
    
    audioChunksRef.current = [];
    mediaRecorderRef.current.start(1000); // Record in 1-second chunks
    setIsRecording(true);
  };

  // Stop recording
  const stopRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  // Play audio response
  const playAudio = (audioUrl: string) => {
    const audio = new Audio(audioUrl);
    audio.play().catch(err => {
      console.error('Error playing audio:', err);
    });
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4 space-x-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </Link>
            <Link href="/chat">
              <Button variant="ghost" size="sm">
                <Bot className="w-4 h-4 mr-2" />
                Text Chat
              </Button>
            </Link>
          </div>
          <h1 className="text-4xl md:text-5xl font-black hyperdash-gradient-text mb-4">
            Live Voice Chat
          </h1>
          <p className="text-xl text-muted-foreground">
            Real-time voice conversation with your AI career coach
          </p>
        </div>

        {/* Connection Controls */}
        <div className="flex justify-center mb-8">
          {!isConnected ? (
            <Button
              onClick={connectWebSocket}
              disabled={connectionStatus === 'connecting'}
              className="hyperdash-gradient text-black font-medium px-8 py-4 text-lg"
            >
              {connectionStatus === 'connecting' ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Phone className="w-5 h-5 mr-2" />
                  Start Voice Chat
                </>
              )}
            </Button>
          ) : (
            <div className="flex items-center space-x-4">
              <Button
                onClick={disconnectWebSocket}
                variant="destructive"
                className="px-6 py-4"
              >
                <PhoneOff className="w-5 h-5 mr-2" />
                End Call
              </Button>
              
              <div className="flex items-center text-green-400">
                <Radio className="w-4 h-4 mr-2 animate-pulse" />
                <span className="text-sm font-medium">Live Session Active</span>
              </div>
            </div>
          )}
        </div>

        {/* Voice Interface */}
        {isConnected && (
          <Card className="hyperdash-card shadow-2xl border-border/20 h-[600px] flex flex-col">
            <CardContent className="p-6 flex-1 flex flex-col">
              {/* Messages */}
              <ScrollArea className="flex-1 pr-4 mb-6">
                {messages.length > 0 ? (
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div key={msg.id} className="space-y-3">
                        {/* User Message */}
                        <div className="flex justify-end">
                          <div className="flex items-start space-x-3 max-w-[80%]">
                            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4">
                              <p className="text-foreground">{msg.userText}</p>
                              <div className="flex items-center mt-2 text-sm text-primary">
                                <Mic className="w-4 h-4 mr-1" />
                                Voice message
                              </div>
                            </div>
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-background" />
                            </div>
                          </div>
                        </div>

                        {/* AI Response */}
                        <div className="flex justify-start">
                          <div className="flex items-start space-x-3 max-w-[80%]">
                            <div className="w-8 h-8 hyperdash-gradient rounded-full flex items-center justify-center">
                              <Bot className="w-4 h-4 text-black" />
                            </div>
                            <div className="glass-enhanced border border-border/30 rounded-2xl p-4">
                              <p className="text-foreground leading-relaxed">{msg.response}</p>
                              <Button
                                onClick={() => playAudio(msg.audioUrl)}
                                variant="ghost"
                                size="sm"
                                className="mt-2 text-green-400 hover:text-green-300"
                              >
                                <Volume2 className="w-4 h-4 mr-1" />
                                Replay
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-center">
                      <Mic className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">Hold the button below and start speaking</p>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </ScrollArea>

              {/* Voice Controls */}
              <div className="flex justify-center">
                <div className="relative">
                  <Button
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onTouchStart={startRecording}
                    onTouchEnd={stopRecording}
                    disabled={!isConnected || isProcessing}
                    className={`w-24 h-24 rounded-full text-white font-bold text-lg transition-all ${
                      isRecording
                        ? "bg-red-500 hover:bg-red-600 animate-pulse scale-110"
                        : isProcessing
                        ? "bg-yellow-500 hover:bg-yellow-600"
                        : "hyperdash-gradient hover:scale-105"
                    }`}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-8 h-8 animate-spin" />
                    ) : isRecording ? (
                      <MicOff className="w-8 h-8" />
                    ) : (
                      <Mic className="w-8 h-8" />
                    )}
                  </Button>
                  
                  {isRecording && (
                    <div className="absolute -inset-2 bg-red-500/20 rounded-full animate-ping"></div>
                  )}
                </div>
              </div>

              <div className="text-center mt-4">
                <p className="text-sm text-muted-foreground">
                  {isProcessing
                    ? "AI is thinking..."
                    : isRecording
                    ? "Release to send..."
                    : "Hold to speak"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}