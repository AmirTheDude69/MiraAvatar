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
  const [processingStep, setProcessingStep] = useState<string>('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [interactionMode, setInteractionMode] = useState<'hold' | 'click'>('hold');
  
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectWebSocket();
      cleanupMediaResources();
    };
  }, []);

  // Initialize WebSocket connection
  const connectWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionStatus('connecting');
    
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    
    try {
      wsRef.current = new WebSocket(wsUrl);
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setConnectionStatus('disconnected');
      toast({
        title: "Connection Failed",
        description: "Unable to establish WebSocket connection",
        variant: "destructive"
      });
      return;
    }

    wsRef.current.onopen = () => {
      console.log('WebSocket connected successfully');
      setConnectionStatus('connected');
      setIsConnected(true);
      initializeMediaRecorder();
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
          setProcessingStep(data.step || 'starting');
          break;
          
        case 'processing_step':
          setProcessingStep(data.step);
          toast({
            title: "Chained Processing",
            description: data.message,
            duration: 2000
          });
          break;
          
        case 'transcription_complete':
          toast({
            title: "Speech Recognized",
            description: `"${data.transcription}"`,
            duration: 3000
          });
          break;
          
        case 'voice_response':
          setIsProcessing(false);
          setProcessingStep('');
          const newMessage: VoiceMessage = {
            id: Date.now().toString(),
            userText: data.userText,
            response: data.response,
            audioUrl: data.audioUrl,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, newMessage]);
          
          if (data.audioUrl) {
            playAudio(data.audioUrl);
          }
          
          if (data.chainedProcessing) {
            toast({
              title: "Voice Processing Complete",
              description: "Chained: Speech-to-Text → AI Response → Text-to-Speech",
              duration: 3000
            });
          }
          break;
          
        case 'error':
          setIsProcessing(false);
          setProcessingStep('');
          toast({
            title: "Error",
            description: data.message + (data.step ? ` (Failed at: ${data.step})` : ''),
            variant: "destructive"
          });
          break;
      }
    };

    wsRef.current.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      setConnectionStatus('disconnected');
      setIsConnected(false);
      setSessionId(null);
      cleanupMediaResources();
      if (event.code !== 1000) {
        toast({
          title: "Disconnected",
          description: "Voice chat session ended unexpectedly",
          variant: "destructive"
        });
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('disconnected');
      setIsConnected(false);
      toast({
        title: "Connection Error",
        description: "WebSocket connection failed. Please try again.",
        variant: "destructive"
      });
    };
  };

  // Disconnect WebSocket
  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    stopRecording();
    cleanupMediaResources();
    setIsConnected(false);
    setConnectionStatus('disconnected');
    setSessionId(null);
    setMessages([]);
  };

  // Cleanup media resources
  const cleanupMediaResources = () => {
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch (e) {
        console.warn('Error stopping media recorder:', e);
      }
      mediaRecorderRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    audioChunksRef.current = [];
    setIsRecording(false);
  };

  // Initialize MediaRecorder
  const initializeMediaRecorder = async () => {
    try {
      console.log('Requesting microphone access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });

      streamRef.current = stream;
      console.log('Microphone access granted, setting up MediaRecorder...');
      
      // Try different MIME types for better compatibility
      let mimeType = '';
      const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/wav'];
      for (const type of types) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          break;
        }
      }
      
      console.log('Using MIME type:', mimeType || 'default');
      
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        console.log('Data available:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('Recording stopped, chunks:', audioChunksRef.current.length);
        if (audioChunksRef.current.length === 0) {
          console.warn('No audio chunks collected');
          toast({
            title: "Recording Error",
            description: "No audio data was captured. Please try again.",
            variant: "destructive"
          });
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/wav' });
        console.log('Created audio blob:', audioBlob.size, 'bytes, type:', audioBlob.type);
        
        sendAudioToServer(audioBlob);
        audioChunksRef.current = [];
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        toast({
          title: "Recording Error",
          description: "Microphone recording failed. Please check permissions.",
          variant: "destructive"
        });
      };

      console.log('MediaRecorder initialized successfully');
      
    } catch (error) {
      console.error('Error initializing MediaRecorder:', error);
      toast({
        title: "Microphone Error",
        description: "Could not access microphone. Please allow microphone permissions and refresh the page.",
        variant: "destructive"
      });
    }
  };

  // Toggle recording for click mode
  const toggleRecording = async () => {
    if (isProcessing) return;
    
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  // Start recording
  const startRecording = async () => {
    if (isRecording || isProcessing) return;
    
    try {
      if (!mediaRecorderRef.current) {
        await initializeMediaRecorder();
        if (!mediaRecorderRef.current) {
          throw new Error('Failed to initialize MediaRecorder');
        }
      }

      console.log('Starting recording...');
      audioChunksRef.current = [];
      mediaRecorderRef.current.start(1000);
      setIsRecording(true);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording failed",
        description: "Could not start recording. Please check microphone permissions.",
        variant: "destructive"
      });
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    
    try {
      console.log('Stopping recording...');
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    } catch (error) {
      console.error('Error stopping recording:', error);
      setIsRecording(false);
    }
  };

  // Send audio to server
  const sendAudioToServer = async (audioBlob: Blob) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      toast({
        title: "Connection Error",
        description: "Voice connection lost. Please reconnect.",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Converting audio blob to base64...');
      const reader = new FileReader();
      
      reader.onloadend = () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          console.log('Sending audio data:', base64Data.length, 'characters');
          
          wsRef.current?.send(JSON.stringify({
            type: 'voice_data',
            audioData: base64Data,
            mimeType: audioBlob.type
          }));
          
        } catch (error) {
          console.error('Error sending audio data:', error);
          toast({
            title: "Send Error",
            description: "Failed to send audio. Please try again.",
            variant: "destructive"
          });
        }
      };
      
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        toast({
          title: "Audio Processing Error",
          description: "Failed to process audio. Please try again.",
          variant: "destructive"
        });
      };
      
      reader.readAsDataURL(audioBlob);
      
    } catch (error) {
      console.error('Error processing audio:', error);
      toast({
        title: "Processing Error",
        description: "Failed to process audio data.",
        variant: "destructive"
      });
    }
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
          
          {/* Interaction Mode Toggle */}
          {isConnected && (
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center space-x-4 glass-enhanced border border-border/30 rounded-full px-4 py-2">
                <span className="text-sm text-muted-foreground">Interaction Mode:</span>
                <Button
                  onClick={() => setInteractionMode('hold')}
                  variant={interactionMode === 'hold' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-full"
                >
                  Hold to Talk
                </Button>
                <Button
                  onClick={() => setInteractionMode('click')}
                  variant={interactionMode === 'click' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-full"
                >
                  Click to Talk
                </Button>
              </div>
            </div>
          )}
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
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 mx-auto hyperdash-gradient rounded-full flex items-center justify-center">
                        <Mic className="w-8 h-8 text-black" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-2">Start Your Conversation</h3>
                        <p className="text-muted-foreground">
                          Hold the microphone button and speak to begin voice chat
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Processing Status */}
                {isProcessing && (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center space-y-3">
                      <div className="flex items-center space-x-3 text-primary">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="text-lg font-medium">Chained Processing Active</span>
                      </div>
                      {processingStep && (
                        <div className="text-sm text-muted-foreground">
                          Step: {processingStep === 'transcription' ? '1. OpenAI Whisper (Speech-to-Text)' :
                                 processingStep === 'text_processing' ? '2. OpenAI GPT (Text Processing)' :
                                 processingStep === 'speech_generation' ? '3. ElevenLabs (Text-to-Speech)' :
                                 'Initializing...'}
                        </div>
                      )}
                      <div className="flex justify-center space-x-2 mt-2">
                        <div className={`w-2 h-2 rounded-full ${processingStep === 'transcription' || processingStep === 'text_processing' || processingStep === 'speech_generation' ? 'bg-primary' : 'bg-muted'}`}></div>
                        <div className={`w-2 h-2 rounded-full ${processingStep === 'text_processing' || processingStep === 'speech_generation' ? 'bg-primary' : 'bg-muted'}`}></div>
                        <div className={`w-2 h-2 rounded-full ${processingStep === 'speech_generation' ? 'bg-primary' : 'bg-muted'}`}></div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </ScrollArea>

              {/* Voice Controls */}
              <div className="text-center">
                <Button
                  {...(interactionMode === 'hold' 
                    ? {
                        onMouseDown: startRecording,
                        onMouseUp: stopRecording,
                        onTouchStart: startRecording,
                        onTouchEnd: stopRecording
                      }
                    : {
                        onClick: toggleRecording
                      }
                  )}
                  disabled={isProcessing || !sessionId}
                  className={`w-20 h-20 rounded-full border-4 transition-all duration-200 ${
                    isRecording 
                      ? 'bg-red-500 border-red-300 scale-110 shadow-red-500/50 shadow-2xl' 
                      : isProcessing
                      ? 'bg-yellow-500 border-yellow-300'
                      : 'hyperdash-gradient border-primary/30 hover:scale-105 shadow-primary/50 shadow-xl'
                  }`}
                >
                  {isProcessing ? (
                    <Loader2 className="w-8 h-8 animate-spin text-black" />
                  ) : isRecording ? (
                    <MicOff className="w-8 h-8 text-white" />
                  ) : (
                    <Mic className="w-8 h-8 text-black" />
                  )}
                </Button>
                
                <p className="text-sm text-muted-foreground mt-3">
                  {isProcessing
                    ? `AI is processing... ${processingStep ? `(${processingStep})` : ''}`
                    : isRecording
                    ? (interactionMode === 'hold' ? "Release to send..." : "Click to stop recording...")
                    : (interactionMode === 'hold' ? "Hold to speak" : "Click to start speaking")}
                </p>
                
                {/* Mode indicator */}
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {interactionMode === 'hold' ? 'Hold & Release Mode' : 'Click to Toggle Mode'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}