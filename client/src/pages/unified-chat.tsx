import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { MiraAvatar } from '@/components/MiraAvatar';
import { Mic, MicOff, Send, Upload, Bot, User, Loader2, Radio, FileText, MessageSquare, Volume2 } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  audioUrl?: string;
  timestamp: Date;
  isProcessing?: boolean;
}

type InteractionMode = 'text' | 'click-to-talk' | 'continuous';

export default function UnifiedChat() {
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('text');

  // Voice state
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isContinuousMode, setIsContinuousMode] = useState(false);

  // WebSocket state
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Mira Avatar state
  const [isMiraActive, setIsMiraActive] = useState(false);

  const { toast } = useToast();

  // Auto-scroll to bottom with proper handling for long messages
  useEffect(() => {
    const timer = setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 200);
    return () => clearTimeout(timer);
  }, [messages]);

  // Initialize WebSocket connection when voice modes are used
  useEffect(() => {
    if (interactionMode !== 'text' && !isConnected) {
      initializeVoiceChat();
    }

    // Cleanup on mode change
    return () => {
      if (interactionMode === 'text' && wsRef.current) {
        cleanupVoiceResources();
      }
    };
  }, [interactionMode]);

  // Initialize voice chat connection
  const initializeVoiceChat = async () => {
    try {
      console.log('Initializing voice chat...');

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      console.log('Connecting to WebSocket:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket connection closed');
        setIsConnected(false);
        setSessionId(null);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast({
          title: "Connection Error",
          description: "Failed to connect to voice chat. Please try again.",
          variant: "destructive"
        });
      };

      // Initialize microphone
      await initializeMediaRecorder();
    } catch (error) {
      console.error('Failed to initialize voice chat:', error);
      toast({
        title: "Voice Chat Error",
        description: "Failed to initialize voice chat. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Cleanup voice resources
  const cleanupVoiceResources = () => {
    setIsContinuousMode(false);
    setIsRecording(false);

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

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
  };

  // Initialize media recorder
  const initializeMediaRecorder = async () => {
    try {
      console.log('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      streamRef.current = stream;
      console.log('Microphone access granted, setting up MediaRecorder...');

      // Check for supported MIME types
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = '';
          }
        }
      }
      console.log('Using MIME type:', mimeType);

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});

      mediaRecorder.ondataavailable = (event) => {
        console.log('Data available:', event.data.size, 'bytes');
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('Recording stopped, chunks:', audioChunksRef.current.length);
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
          console.log('Created audio blob:', audioBlob.size, 'bytes, type:', audioBlob.type);
          sendAudioToServer(audioBlob);
          audioChunksRef.current = [];
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        toast({
          title: "Recording Error",
          description: "Failed to record audio. Please try again.",
          variant: "destructive"
        });
      };

      mediaRecorderRef.current = mediaRecorder;
      console.log('MediaRecorder initialized successfully');
    } catch (error) {
      console.error('Failed to initialize media recorder:', error);
      toast({
        title: "Microphone Error",
        description: "Failed to access microphone. Please grant permission and try again.",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Handle WebSocket messages
  const handleWebSocketMessage = (data: any) => {
    console.log('Handling WebSocket message:', data.type);

    switch (data.type) {
      case 'session_started':
        console.log('Session started:', data.sessionId);
        setSessionId(data.sessionId);
        setIsConnected(true);
        break;

      case 'transcription_complete':
        console.log('Transcription received:', data.transcription);
        // Add user message with transcription
        const userMsg: Message = {
          id: Date.now().toString(),
          type: 'user',
          content: `🎤 "${data.transcription}"`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, userMsg]);
        break;

      case 'voice_response':
        console.log('Voice response received');
        setIsProcessing(false);
        const newMessage: Message = {
          id: Date.now().toString(),
          type: 'assistant',
          content: data.response || data.text || 'Voice response received',
          audioUrl: data.audioUrl,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, newMessage]);

        if (data.audioUrl) {
          playAudio(data.audioUrl);

          // Auto-restart continuous mode
          if (isContinuousMode) {
            setTimeout(() => {
              if (isContinuousMode) restartContinuousListening();
            }, 1000);
          }
        }

        toast({
          title: "Voice Response Ready",
          description: "AI has responded to your message",
        });
        break;

      case 'processing_step':
        console.log('Processing step:', data.step, '-', data.message);
        break;

      case 'processing':
        console.log('Processing started:', data.message);
        break;

      case 'error':
        console.error('WebSocket error:', data.message);
        setIsProcessing(false);
        toast({
          title: "Voice Processing Error",
          description: data.message || "An error occurred during voice processing",
          variant: "destructive"
        });
        break;

      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  };

  // Format CV analysis for display
  const formatCVAnalysis = (analysis: any) => {
    return `# CV Analysis Results

## Overall Score: ${analysis.score}/100

## Key Strengths
${analysis.strengths.map((s: string) => `• ${s}`).join('\n')}

## Areas for Improvement  
${analysis.improvements.map((i: string) => `• ${i}`).join('\n')}

## Detailed Assessment

**Strengths:** ${analysis.strengths?.join(', ') || 'Strong technical background and leadership experience'}
**Weaknesses:** ${analysis.improvements?.join(', ') || 'Areas identified for enhancement'}

## Actionable Steps
${analysis.actionableSteps?.map((step: string, index: number) => `${index + 1}. ${step}`).join('\n') || 'Focus on improving presentation clarity and adding specific achievement examples'}

## Professional Feedback
${analysis.feedback}`;
  };

  // Play audio response
  const playAudio = (audioUrl: string) => {
    // Stop any currently playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
      setIsMiraActive(false);
    }

    const audio = new Audio(audioUrl);
    currentAudioRef.current = audio;
    
    // Activate Mira when audio starts playing
    audio.addEventListener('play', () => {
      setIsMiraActive(true);
    });
    
    // Deactivate Mira when audio ends
    audio.addEventListener('ended', () => {
      setIsMiraActive(false);
      currentAudioRef.current = null;
    });
    
    // Handle audio errors
    audio.addEventListener('error', () => {
      setIsMiraActive(false);
      currentAudioRef.current = null;
    });
    
    audio.play().catch(console.error);
  };

  // Send text message
  const sendTextMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsProcessing(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: inputText })
      });

      const data = await response.json();
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Voice recording functions
  const startRecording = async () => {
    if (!mediaRecorderRef.current || isRecording) return;

    try {
      console.log('Starting recording...');
      audioChunksRef.current = [];
      mediaRecorderRef.current.start(1000); // Collect data every second
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast({
        title: "Recording Error",
        description: "Failed to start recording. Please try again.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    try {
      console.log('Stopping recording...');
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setIsRecording(false);
    }
  };

  const toggleRecording = async () => {
    if (isProcessing) {
      console.log('Cannot toggle recording while processing');
      return;
    }

    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  const toggleContinuousMode = async () => {
    if (isContinuousMode) {
      setIsContinuousMode(false);
      if (isRecording) stopRecording();
    } else {
      setIsContinuousMode(true);
      await startContinuousRecording();
    }
  };

  const startContinuousRecording = async () => {
    if (!mediaRecorderRef.current) return;

    audioChunksRef.current = [];
    mediaRecorderRef.current.start(250);
    setIsRecording(true);
    setupSilenceDetection();
  };

  const restartContinuousListening = async () => {
    if (!isContinuousMode) return;

    try {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'inactive') {
        await initializeMediaRecorder();
      }

      audioChunksRef.current = [];
      mediaRecorderRef.current.start(250);
      setIsRecording(true);
      setupSilenceDetection();
    } catch (error) {
      console.error('Error restarting continuous listening:', error);
    }
  };

  const setupSilenceDetection = () => {
    if (!streamRef.current || !isContinuousMode) return;

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(streamRef.current);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let silenceCount = 0;
    let isCurrentlySpeaking = false;
    const silenceThreshold = 35;
    const silenceLimit = 25;
    const speechThreshold = 50;

    const checkAudioLevel = () => {
      if (!isContinuousMode || isProcessing) return;

      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

      if (average > speechThreshold) {
        isCurrentlySpeaking = true;
        silenceCount = 0;
      } else if (average < silenceThreshold) {
        silenceCount++;

        if (isCurrentlySpeaking && silenceCount >= silenceLimit && audioChunksRef.current.length > 0) {
          processContinuousAudio();
          silenceCount = 0;
          isCurrentlySpeaking = false;
        }
      } else {
        if (silenceCount > 0) silenceCount--;
      }

      if (isContinuousMode && !isProcessing) {
        requestAnimationFrame(checkAudioLevel);
      }
    };

    checkAudioLevel();
  };

  const processContinuousAudio = () => {
    if (!mediaRecorderRef.current || audioChunksRef.current.length === 0) return;

    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });

    if (audioBlob.size > 5000) {
      setIsRecording(false);
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      sendAudioToServer(audioBlob);
    }

    audioChunksRef.current = [];
  };

  const sendAudioToServer = (audioBlob: Blob) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected, state:', wsRef.current?.readyState);
      toast({
        title: "Connection Error",
        description: "Voice chat is not connected. Please try again.",
        variant: "destructive"
      });
      return;
    }

    if (audioBlob.size < 1000) {
      console.warn('Audio blob too small:', audioBlob.size, 'bytes');
      toast({
        title: "Recording Too Short",
        description: "Please record for at least 1 second.",
        variant: "destructive"
      });
      return;
    }

    console.log('Converting audio blob to base64...');
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = reader.result as string;
        const base64Audio = result.split(',')[1];
        console.log('Sending audio data:', base64Audio.length, 'characters');

        wsRef.current?.send(JSON.stringify({
          type: 'voice_data',
          sessionId: sessionId || 'default',
          audioData: base64Audio
        }));
      } catch (error) {
        console.error('Failed to send audio data:', error);
        setIsProcessing(false);
        toast({
          title: "Send Error", 
          description: "Failed to send voice message. Please try again.",
          variant: "destructive"
        });
      }
    };

    reader.onerror = () => {
      console.error('FileReader error');
      setIsProcessing(false);
      toast({
        title: "Processing Error", 
        description: "Failed to process audio. Please try again.",
        variant: "destructive"
      });
    };

    reader.readAsDataURL(audioBlob);
  };

  // CV Upload
  const handleCVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF file.",
        variant: "destructive"
      });
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: `📄 Uploaded CV: ${file.name}`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    uploadCVFile(file);
  };

  const uploadCVFile = async (file: File) => {
    setIsProcessing(true);

    const formData = new FormData();
    formData.append('cv', file);

    try {
      const response = await fetch('/api/upload-cv', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();

      // Show processing message
      const processingMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `CV uploaded successfully. Analysis ID: ${data.id}. Processing your CV analysis...`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, processingMessage]);

      // Poll for analysis results
      pollForAnalysis(data.id);

      toast({
        title: "CV Uploaded",
        description: "Analysis in progress. Please wait...",
      });
    } catch (error) {
      console.error('CV upload failed:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload CV. Please try again.",
        variant: "destructive"
      });
      setIsProcessing(false);
    }
  };

  const pollForAnalysis = async (analysisId: number) => {
    const maxAttempts = 25; // Reduced timeout for faster UX
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;
        const response = await fetch(`/api/cv/analysis/${analysisId}`);
        if (!response.ok) throw new Error('Failed to get analysis');

        const data = await response.json();

        if (data.status === 'completed' && data.analysis) {
          // Analysis complete - show results
          const analysisMessage: Message = {
            id: (Date.now() + 2).toString(),
            type: 'assistant',
            content: formatCVAnalysis(data.analysis),
            audioUrl: data.audioUrl,
            timestamp: new Date()
          };

          setMessages(prev => [...prev, analysisMessage]);

          if (data.audioUrl) {
            playAudio(data.audioUrl);
          }

          toast({
            title: "Analysis Complete",
            description: "CV analyzed successfully",
          });
          setIsProcessing(false);
        } else if (data.status === 'failed') {
          throw new Error('Analysis failed');
        } else if (attempts >= maxAttempts) {
          throw new Error('Analysis timeout');
        } else {
          // Still processing, continue polling with shorter interval
          setTimeout(poll, 800); // Faster polling
        }
      } catch (error) {
        console.error('Analysis polling error:', error);
        toast({
          title: "Analysis Failed",
          description: "Please try again.",
          variant: "destructive"
        });
        setIsProcessing(false);
      }
    };

    poll();
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Subtle background effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-gradient-to-r from-blue-500/10 to-indigo-500/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-8 h-screen flex flex-col min-h-0 cyber-grid">
        {/* Header with interaction modes */}
        <div className="mb-6">
          <h1 className="text-4xl titillium-web-bold text-center mb-6 neon-text">
            AI CAREER NEXUS
          </h1>
          <div className="flex items-center justify-center space-x-4">
            <Button
              onClick={() => setInteractionMode('text')}
              variant="ghost"
              size="sm"
              className={`titillium-web-semibold rounded-full px-6 py-2 ${
                interactionMode === 'text' 
                  ? 'sleek-button-selected' 
                  : 'sleek-button'
              }`}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              TEXT
            </Button>
            <Button
              onClick={() => setInteractionMode('click-to-talk')}
              variant="ghost"
              size="sm"
              className={`titillium-web-semibold rounded-full px-6 py-2 ${
                interactionMode === 'click-to-talk' 
                  ? 'sleek-button-selected' 
                  : 'sleek-button'
              }`}
            >
              <Mic className="w-4 h-4 mr-2" />
              VOICE
            </Button>
            <Button
              onClick={() => setInteractionMode('continuous')}
              variant="ghost"
              size="sm"
              className={`titillium-web-semibold rounded-full px-6 py-2 ${
                interactionMode === 'continuous' 
                  ? 'sleek-button-selected' 
                  : 'sleek-button'
              }`}
            >
              <Radio className="w-4 h-4 mr-2" />
              NEURAL LINK
            </Button>
          </div>
        </div>

        {/* Chat Area */}
        <Card className="flex-1 glass-enhanced cyberpunk-border mb-6 overflow-hidden">
          <CardContent className="p-0 h-full flex flex-col">
            <ScrollArea className="flex-1 p-6 scroll-container scrollbar-thin max-h-[70vh] overflow-y-auto">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="titillium-web-light">Initialize Neural Connection or Upload Data Package</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-start gap-3 ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {/* Avatar */}
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                        message.type === 'user' 
                          ? 'shadow-lg' 
                          : 'bg-gradient-to-br from-gray-700 to-gray-800 border border-primary/30 shadow-lg'
                      }`}
                      style={message.type === 'user' ? {
                        background: 'linear-gradient(135deg, #2e8b57 0%, #40e0d0 100%)'
                      } : undefined}>
                        {message.type === 'user' ? 
                          <User className="w-6 h-6 text-white" /> : 
                          <Bot className="w-6 h-6 text-primary" />
                        }
                      </div>

                      {/* Message bubble */}
                      <div className={`flex-1 max-w-[75%] min-w-0 ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
                        <div
                          className={`message-bubble group relative titillium-web-regular inline-block p-3 rounded-2xl shadow-xl backdrop-blur-xl border transition-all duration-300 hover:shadow-2xl max-h-[60vh] overflow-y-auto ${
                            message.type === 'user'
                              ? 'bg-gradient-to-br from-green-600/70 to-emerald-600/70 text-white border-green-400/20 rounded-br-md'
                              : 'bg-gradient-to-br from-gray-800/95 to-gray-900/95 border-gray-600/20 text-white rounded-bl-md'
                          }`}
                        >
                          <div className="prose prose-sm prose-invert max-w-none break-words overflow-hidden text-left">
                            {message.content.includes('#') ? (
                              <div dangerouslySetInnerHTML={{ 
                                __html: message.content
                                  .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold mb-3 text-white text-left">$1</h1>')
                                  .replace(/^## (.+)$/gm, '<h2 class="text-base font-semibold mb-2 text-blue-300 text-left">$1</h2>')
                                  .replace(/^\*\*(.+?)\*\*/gm, '<strong class="text-blue-300">$1</strong>')
                                  .replace(/^• (.+)$/gm, '<div class="ml-2 mb-1 text-sm text-left">• $1</div>')
                                  .replace(/^(\d+)\. (.+)$/gm, '<div class="mb-1 text-sm text-left"><span class="text-blue-300 font-semibold">$1.</span> $2</div>')
                              }} />
                            ) : (
                              <p className="m-0 text-sm leading-relaxed whitespace-pre-wrap text-left">{message.content}</p>
                            )}
                          </div>

                          {message.audioUrl && (
                            <div className="mt-3 flex items-center gap-2">
                              <Button
                                onClick={() => playAudio(message.audioUrl!)}
                                variant="ghost"
                                size="sm"
                                className="titillium-web-semibold sleek-button h-7 px-3 rounded-lg text-xs"
                              >
                                <Volume2 className="w-3 h-3 mr-1" />
                                PLAY AUDIO
                              </Button>
                            </div>
                          )}

                          {/* Timestamp - hidden by default, shown on hover */}
                          <div className="absolute -bottom-6 left-0 text-xs opacity-0 group-hover:opacity-50 font-mono transition-opacity duration-200 pointer-events-none">
                            {message.timestamp.toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {isProcessing && (
                    <div className="flex justify-start">
                      <div className="glass-enhanced border border-border/30 rounded-lg p-4">
                        <div className="flex items-center space-x-2">
                          <Bot className="w-5 h-5 text-primary" />
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-muted-foreground">Processing...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div ref={chatEndRef} />
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Input Area */}
        <div className="space-y-4">
          {/* Voice Controls (for voice modes) */}
          {interactionMode !== 'text' && (
            <div className="flex justify-center">
              <Button
                {...(interactionMode === 'click-to-talk'
                  ? { onClick: toggleRecording }
                  : { onClick: toggleContinuousMode }
                )}
                disabled={isProcessing || !isConnected}
                className={`titillium-web-bold w-16 h-16 rounded-full border-4 transition-all duration-200 ${
                  isContinuousMode
                    ? 'bg-emerald-500 border-emerald-300 scale-110 shadow-emerald-500/30 shadow-2xl animate-pulse'
                    : isRecording 
                    ? 'bg-red-500 border-red-300 scale-110 shadow-red-500/30 shadow-2xl' 
                    : 'sleek-button border-4 hover:scale-105 shadow-xl hover:sleek-button-selected'
                }`}
              >
                {isProcessing ? (
                  <Loader2 className="w-6 h-6 animate-spin text-black" />
                ) : isContinuousMode ? (
                  <Radio className="w-6 h-6 text-white animate-pulse" />
                ) : isRecording ? (
                  <MicOff className="w-6 h-6 text-white" />
                ) : (
                  <Mic className="w-6 h-6 text-gray-300" />
                )}
              </Button>
            </div>
          )}

          {/* Text Input (for text mode) */}
          {interactionMode === 'text' && (
            <div className="flex space-x-2">
              <Input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendTextMessage();
                  }
                }}
                placeholder="Enter neural data transmission..."
                className="titillium-web-regular flex-1 glass-enhanced border-gray-600/30 text-gray-100 placeholder:text-gray-400/70"
                disabled={isProcessing}
              />
              <Button
                onClick={sendTextMessage}
                disabled={!inputText.trim() || isProcessing}
                variant="ghost"
                className="titillium-web-semibold sleek-button px-4"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          )}

          {/* CV Upload Button */}
          <div className="flex justify-center">
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="ghost"
              className="titillium-web-bold sleek-button px-6 py-3"
              disabled={isProcessing}
            >
              <Upload className="w-4 h-4 mr-2" />
              UPLOAD DATA PACKAGE
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleCVUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Mira Avatar - appears only during voice interactions */}
      <MiraAvatar 
        isPlaying={isMiraActive} 
        audioElement={currentAudioRef.current}
      />
    </div>
  );
}