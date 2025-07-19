import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Upload, CheckCircle, Rocket, Brain, Mic, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UploadSectionProps {
  onFileUpload: (file: File) => void;
  isUploading: boolean;
}

export default function UploadSection({ onFileUpload, isUploading }: UploadSectionProps) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndUpload(files[0]);
    }
  };

  const validateAndUpload = (file: File) => {
    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file only.",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive"
      });
      return;
    }

    onFileUpload(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndUpload(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      {/* Upload Card */}
      <Card className="glass-card shadow-xl border-border/20">
        <CardContent className="p-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-foreground mb-2">Upload Your CV</h2>
            <p className="text-muted-foreground mb-6">Get personalized feedback from our AI career coach</p>
          </div>
          
          {/* File Upload Area */}
          <div
            className={`upload-area border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
              dragActive
                ? 'border-primary/50 bg-primary/10'
                : 'border-border/30 hover:border-primary/30'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={handleClick}
          >
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <FileText className="text-primary w-8 h-8" />
              </div>
              <div>
                <p className="text-lg font-medium text-foreground">Drop your CV here</p>
                <p className="text-muted-foreground">or click to browse files</p>
              </div>
              <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                <CheckCircle className="text-green-400 w-4 h-4" />
                <span>PDF files only • Max 10MB</span>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf"
              onChange={handleFileSelect}
            />
          </div>

          {/* Upload Button */}
          <Button 
            className="w-full mt-6 grok-gradient text-white hover:opacity-90 transition-opacity" 
            disabled={isUploading}
            onClick={handleClick}
          >
            <Rocket className="w-4 h-4 mr-2" />
            {isUploading ? 'Uploading...' : 'Analyze My CV'}
          </Button>
        </CardContent>
      </Card>

      {/* Features Card */}
      <Card className="glass-card shadow-xl border-border/20">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">What You'll Get</h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Brain className="text-primary mt-1 w-5 h-5" />
              <div>
                <p className="font-medium text-foreground">AI-Powered Analysis</p>
                <p className="text-sm text-muted-foreground">Deep analysis of your skills, experience, and achievements</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Mic className="text-green-400 mt-1 w-5 h-5" />
              <div>
                <p className="font-medium text-foreground">Voice Feedback</p>
                <p className="text-sm text-muted-foreground">Natural speech with personalized recommendations</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <TrendingUp className="text-purple-400 mt-1 w-5 h-5" />
              <div>
                <p className="font-medium text-foreground">Actionable Insights</p>
                <p className="text-sm text-muted-foreground">Specific suggestions to improve your CV</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
