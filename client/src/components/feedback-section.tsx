import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Star, AlertTriangle, PieChart, Download, Plus, CheckCircle } from "lucide-react";
import type { CvAnalysis } from "@shared/schema";

interface FeedbackSectionProps {
  analysis: CvAnalysis | null;
  onAnalyzeAnother: () => void;
}

export default function FeedbackSection({ analysis, onAnalyzeAnother }: FeedbackSectionProps) {
  if (!analysis || analysis.status !== 'completed' || !analysis.analysis) {
    return null;
  }

  const { strengths, improvements, score } = analysis.analysis;

  const downloadReport = () => {
    // In a real implementation, this would generate and download a PDF report
    const reportData = {
      filename: analysis.fileName,
      score,
      strengths,
      improvements,
      feedback: analysis.analysis?.feedback,
      date: new Date().toLocaleDateString()
    };
    
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cv-analysis-${analysis.fileName}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-12">
      <Card className="shadow-sm border border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-semibold text-gray-900">CV Analysis Results</h3>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-500 font-medium">Analysis Complete</span>
            </div>
          </div>
          
          {/* Feedback Content */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Strengths */}
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Star className="text-green-500 w-5 h-5" />
                <h4 className="font-semibold text-gray-900">Strengths</h4>
              </div>
              <ul className="space-y-2 text-sm">
                {strengths.map((strength, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <CheckCircle className="text-green-500 mt-0.5 w-3 h-3 flex-shrink-0" />
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Improvements */}
            <div className="bg-amber-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <AlertTriangle className="text-amber-500 w-5 h-5" />
                <h4 className="font-semibold text-gray-900">Areas to Improve</h4>
              </div>
              <ul className="space-y-2 text-sm">
                {improvements.map((improvement, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <div className="text-amber-500 mt-0.5 w-3 h-3 flex-shrink-0">↑</div>
                    <span>{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Overall Score */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <PieChart className="text-blue-500 w-5 h-5" />
                <h4 className="font-semibold text-gray-900">Overall Score</h4>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-500 mb-1">{score}</div>
                <div className="text-sm text-gray-500 mb-3">out of 100</div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${score}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              className="flex-1 bg-blue-500 hover:bg-blue-700" 
              onClick={downloadReport}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Full Report
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 border-blue-500 text-blue-500 hover:bg-blue-50" 
              onClick={onAnalyzeAnother}
            >
              <Plus className="w-4 h-4 mr-2" />
              Analyze Another CV
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
