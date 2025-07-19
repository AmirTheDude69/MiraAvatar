import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ProcessSteps from "@/components/process-steps";
import UploadSection from "@/components/upload-section";
import AvatarSection from "@/components/avatar-section";
import FeedbackSection from "@/components/feedback-section";
import { Button } from "@/components/ui/button";
import { HelpCircle, User, Github, Twitter, Linkedin } from "lucide-react";
import type { CvAnalysis } from "@shared/schema";

export default function Home() {
  const [analysisId, setAnalysisId] = useState<number | null>(null);
  const { toast } = useToast();

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('cv', file);
      
      const response = await fetch('/api/cv/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setAnalysisId(data.id);
      toast({
        title: "Upload successful",
        description: "Your CV is being analyzed. Please wait...",
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Analysis query
  const { data: analysis } = useQuery({
    queryKey: ['/api/cv/analysis', analysisId],
    enabled: !!analysisId,
    refetchInterval: (data) => {
      // Poll every 2 seconds if still processing
      return data?.status === 'processing' ? 2000 : false;
    },
  }) as { data: CvAnalysis | undefined };

  const handleFileUpload = (file: File) => {
    uploadMutation.mutate(file);
  };

  const handleAnalyzeAnother = () => {
    setAnalysisId(null);
    queryClient.clear();
  };

  const currentStep = analysisId 
    ? analysis?.status === 'completed' 
      ? 'feedback' 
      : 'processing'
    : 'upload';

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <User className="text-white w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">AI Avatar CV Analyzer</h1>
                <p className="text-sm text-gray-500">Professional Career Feedback</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-900">
                <HelpCircle className="w-4 h-4 mr-1" />
                Help
              </Button>
              <Button size="sm" className="bg-blue-500 hover:bg-blue-700">
                <User className="w-4 h-4 mr-1" />
                Account
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Process Steps */}
        <ProcessSteps currentStep={currentStep} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <UploadSection 
            onFileUpload={handleFileUpload}
            isUploading={uploadMutation.isPending}
          />

          {/* Avatar Section */}
          <AvatarSection 
            analysis={analysis || null}
            isProcessing={currentStep === 'processing'}
          />
        </div>

        {/* Feedback Section */}
        <FeedbackSection 
          analysis={analysis || null}
          onAnalyzeAnother={handleAnalyzeAnother}
        />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <User className="text-white w-4 h-4" />
                </div>
                <span className="text-lg font-semibold text-gray-900">AI Avatar CV Analyzer</span>
              </div>
              <p className="text-gray-500 mb-4">Revolutionizing career development with AI-powered CV analysis and personalized feedback.</p>
              <div className="flex space-x-4">
                <Button variant="ghost" size="sm">
                  <Twitter className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Linkedin className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Github className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Product</h4>
              <ul className="space-y-2 text-gray-500">
                <li><Button variant="link" className="p-0 h-auto">Features</Button></li>
                <li><Button variant="link" className="p-0 h-auto">Pricing</Button></li>
                <li><Button variant="link" className="p-0 h-auto">API</Button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Support</h4>
              <ul className="space-y-2 text-gray-500">
                <li><Button variant="link" className="p-0 h-auto">Help Center</Button></li>
                <li><Button variant="link" className="p-0 h-auto">Contact Us</Button></li>
                <li><Button variant="link" className="p-0 h-auto">Privacy Policy</Button></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-8 pt-8 text-center text-gray-500">
            <p>&copy; 2024 AI Avatar CV Analyzer. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
