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
    <div className="space-y-8">
      {/* Main Upload Card */}
      <Card className="hyperdash-card shadow-2xl border-border/20 interactive-hover relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5"></div>
        <CardContent className="relative p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center space-x-3 mb-4">
              <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
              <h2 className="text-3xl font-bold text-gradient-primary">Upload Your CV</h2>
              <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse delay-1000"></div>
            </div>
            <p className="text-lg text-muted-foreground">
              Get instant AI-powered career insights with personalized voice feedback
            </p>
          </div>
          
          {/* Enhanced File Upload Area */}
          <div
            className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-500 group ${
              dragActive
                ? 'border-primary/60 bg-primary/10 scale-105'
                : 'border-border/40 hover:border-primary/50 hover:bg-primary/5'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={handleClick}
          >
            <div className="space-y-6">
              <div className="relative mx-auto w-20 h-20 hyperdash-gradient rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300">
                <FileText className="text-black w-10 h-10" />
                <div className="absolute -inset-2 hyperdash-gradient rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground">Drop your CV here</h3>
                <p className="text-muted-foreground">or click to browse your files</p>
                
                <div className="flex items-center justify-center space-x-3 text-sm">
                  <div className="flex items-center space-x-2 px-3 py-1 bg-primary/10 rounded-full">
                    <CheckCircle className="text-primary w-4 h-4" />
                    <span className="text-primary font-medium">PDF Only</span>
                  </div>
                  <div className="flex items-center space-x-2 px-3 py-1 bg-purple-500/10 rounded-full">
                    <CheckCircle className="text-purple-400 w-4 h-4" />
                    <span className="text-purple-400 font-medium">Max 10MB</span>
                  </div>
                </div>
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

          {/* Enhanced Upload Button */}
          <div className="flex justify-center mt-8">
            <Button 
              size="lg"
              className="px-12 py-4 text-lg font-semibold hyperdash-gradient text-black hover:shadow-2xl hover:scale-105 transition-all duration-300 border-0" 
              disabled={isUploading}
              onClick={handleClick}
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-3"></div>
                  Processing Upload...
                </>
              ) : (
                <>
                  <Rocket className="w-5 h-5 mr-3" />
                  Start AI Analysis
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-enhanced interactive-hover border-primary/20">
          <CardContent className="p-6 text-center">
            <div className="w-14 h-14 hyperdash-gradient rounded-2xl flex items-center justify-center mx-auto mb-4 floating-animation">
              <Brain className="text-black w-7 h-7" />
            </div>
            <h3 className="font-bold text-foreground mb-2">AI Analysis</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Advanced machine learning evaluates your experience and skills
            </p>
          </CardContent>
        </Card>

        <Card className="glass-enhanced interactive-hover border-purple-500/20">
          <CardContent className="p-6 text-center">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 floating-animation delay-1000">
              <Mic className="text-white w-7 h-7" />
            </div>
            <h3 className="font-bold text-foreground mb-2">Voice Feedback</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Natural speech delivery with personalized career recommendations
            </p>
          </CardContent>
        </Card>

        <Card className="glass-enhanced interactive-hover border-cyan-500/20">
          <CardContent className="p-6 text-center">
            <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-4 floating-animation delay-2000">
              <TrendingUp className="text-white w-7 h-7" />
            </div>
            <h3 className="font-bold text-foreground mb-2">Career Insights</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Actionable suggestions to boost your professional profile
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
