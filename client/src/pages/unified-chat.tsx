import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
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
  
  const { toast } = useToast();

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
        toast({
          title: "Voice Chat Ready",
          description: "Connected successfully. You can now use voice features.",
        });
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
          sendAudioToServer(audioBlob);
          audioChunksRef.current = [];
        }
      };

      mediaRecorderRef.current = mediaRecorder;
    } catch (error) {
      console.error('Failed to initialize media recorder:', error);
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
        break;
        
      case 'transcription':
        console.log('Transcription received:', data.text);
        // Add user message with transcription
        const userMsg: Message = {
          id: Date.now().toString(),
          type: 'user',
          content: `🎤 "${data.text}"`,
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
        break;
        
      case 'processing_step':
        console.log('Processing step:', data.step);
        // Could add processing indicators here
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

## Strengths
${analysis.strengths.map((s: string) => `• ${s}`).join('\n')}

## Areas for Improvement  
${analysis.improvements.map((i: string) => `• ${i}`).join('\n')}

## SWOT Analysis
**Strengths:** ${analysis.swot?.strengths?.join(', ') || 'N/A'}
**Weaknesses:** ${analysis.swot?.weaknesses?.join(', ') || 'N/A'}
**Opportunities:** ${analysis.swot?.opportunities?.join(', ') || 'N/A'}
**Threats:** ${analysis.swot?.threats?.join(', ') || 'N/A'}

## Actionable Steps
${analysis.actionableSteps?.map((step: string, index: number) => `${index + 1}. ${step}`).join('\n') || 'No specific steps provided'}

## Feedback
${analysis.feedback}`;
  };

  // Play audio response
  const playAudio = (audioUrl: string) => {
    const audio = new Audio(audioUrl);
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
    
    audioChunksRef.current = [];
    mediaRecorderRef.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  const toggleRecording = async () => {
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
      console.error('WebSocket not connected');
      toast({
        title: "Connection Error",
        description: "Voice chat is not connected. Please try again.",
        variant: "destructive"
      });
      return;
    }

    console.log('Sending audio to server, size:', audioBlob.size);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const base64Audio = (reader.result as string).split(',')[1];
        console.log('Sending audio data, length:', base64Audio.length);
        
        wsRef.current?.send(JSON.stringify({
          type: 'voice_message',
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
    const maxAttempts = 30; // 30 seconds max
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
            title: "CV Analysis Complete",
            description: "Your CV has been analyzed successfully.",
          });
          setIsProcessing(false);
        } else if (data.status === 'failed') {
          throw new Error('Analysis failed');
        } else if (attempts >= maxAttempts) {
          throw new Error('Analysis timeout');
        } else {
          // Still processing, continue polling
          setTimeout(poll, 1000);
        }
      } catch (error) {
        console.error('Analysis polling error:', error);
        toast({
          title: "Analysis Failed",
          description: "Failed to complete CV analysis. Please try again.",
          variant: "destructive"
        });
        setIsProcessing(false);
      }
    };

    poll();
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-green-500/20 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-8 h-screen flex flex-col">
        {/* Header with interaction modes */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-center mb-6 hyperdash-gradient bg-clip-text text-transparent">
            AI Career Coach
          </h1>
          
          <div className="flex items-center justify-center space-x-4">
            <Button
              onClick={() => setInteractionMode('text')}
              variant={interactionMode === 'text' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-full"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Text
            </Button>
            <Button
              onClick={() => setInteractionMode('click-to-talk')}
              variant={interactionMode === 'click-to-talk' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-full"
            >
              <Mic className="w-4 h-4 mr-2" />
              Click to Talk
            </Button>
            <Button
              onClick={() => setInteractionMode('continuous')}
              variant={interactionMode === 'continuous' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-full"
            >
              <Radio className="w-4 h-4 mr-2" />
              Continuous Chat
            </Button>
          </div>
        </div>

        {/* Chat Area */}
        <Card className="flex-1 glass-enhanced border border-border/30 mb-6">
          <CardContent className="p-0 h-full flex flex-col">
            <ScrollArea className="flex-1 p-6">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Start a conversation or upload your CV for analysis</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-4 ${
                          message.type === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'glass-enhanced border border-border/30'
                        }`}
                      >
                        <div className="flex items-start space-x-2">
                          {message.type === 'assistant' && <Bot className="w-5 h-5 mt-1 text-primary" />}
                          {message.type === 'user' && <User className="w-5 h-5 mt-1" />}
                          <div className="flex-1">
                            <div className="prose prose-invert max-w-none">
                              {message.content.includes('#') ? (
                                <div dangerouslySetInnerHTML={{ 
                                  __html: message.content
                                    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mb-3">$1</h1>')
                                    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mb-2 text-primary">$1</h2>')
                                    .replace(/^\*\*(.+?)\*\*/gm, '<strong class="text-primary">$1</strong>')
                                    .replace(/^• (.+)$/gm, '<li class="ml-4">$1</li>')
                                    .replace(/^(\d+)\. (.+)$/gm, '<div class="mb-1"><span class="text-primary font-semibold">$1.</span> $2</div>')
                                }} />
                              ) : (
                                <p>{message.content}</p>
                              )}
                            </div>
                            {message.audioUrl && (
                              <Button
                                onClick={() => playAudio(message.audioUrl!)}
                                variant="ghost"
                                size="sm"
                                className="mt-2"
                              >
                                <Volume2 className="w-4 h-4 mr-2" />
                                Play Audio
                              </Button>
                            )}
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
                className={`w-16 h-16 rounded-full border-4 transition-all duration-200 ${
                  isContinuousMode
                    ? 'bg-green-500 border-green-300 scale-110 shadow-green-500/50 shadow-2xl animate-pulse'
                    : isRecording 
                    ? 'bg-red-500 border-red-300 scale-110 shadow-red-500/50 shadow-2xl' 
                    : 'hyperdash-gradient border-primary/30 hover:scale-105 shadow-primary/50 shadow-xl'
                }`}
              >
                {isProcessing ? (
                  <Loader2 className="w-6 h-6 animate-spin text-black" />
                ) : isContinuousMode ? (
                  <Radio className="w-6 h-6 text-white animate-pulse" />
                ) : isRecording ? (
                  <MicOff className="w-6 h-6 text-white" />
                ) : (
                  <Mic className="w-6 h-6 text-black" />
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
                onKeyPress={(e) => e.key === 'Enter' && sendTextMessage()}
                placeholder="Type your message..."
                className="flex-1 glass-enhanced border-border/30"
                disabled={isProcessing}
              />
              <Button
                onClick={sendTextMessage}
                disabled={!inputText.trim() || isProcessing}
                className="hyperdash-gradient"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          )}

          {/* CV Upload Button */}
          <div className="flex justify-center">
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="glass-enhanced border-primary/30 hover:bg-primary/20"
              disabled={isProcessing}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload CV
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
    </div>
  );
}