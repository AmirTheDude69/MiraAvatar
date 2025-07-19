import { CheckCircle, Clock, MessageSquare, Upload, Cog } from "lucide-react";

interface ProcessStepsProps {
  currentStep: 'upload' | 'processing' | 'feedback';
}

export default function ProcessSteps({ currentStep }: ProcessStepsProps) {
  const steps = [
    {
      id: 'upload',
      icon: Upload,
      title: 'Upload CV',
      subtitle: 'PDF Format',
      active: currentStep === 'upload'
    },
    {
      id: 'processing',
      icon: Cog,
      title: 'AI Analysis',
      subtitle: 'Processing',
      active: currentStep === 'processing'
    },
    {
      id: 'feedback',
      icon: MessageSquare,
      title: 'Avatar Feedback',
      subtitle: 'Voice & Visual',
      active: currentStep === 'feedback'
    }
  ];

  return (
    <div className="mb-12">
      <div className="flex items-center justify-center space-x-8 md:space-x-16">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = (
            (currentStep === 'processing' && step.id === 'upload') ||
            (currentStep === 'feedback' && (step.id === 'upload' || step.id === 'processing'))
          );
          
          return (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 relative ${
                  isCompleted 
                    ? 'hyperdash-gradient text-black status-long'
                    : step.active 
                      ? 'step-indicator active hyperdash-gradient text-black' 
                      : 'bg-muted text-muted-foreground metallic-accent'
                }`}>
                  {isCompleted ? <CheckCircle className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                  {step.active && (
                    <div className="absolute -inset-1 hyperdash-gradient rounded-full pulse-ring opacity-40"></div>
                  )}
                </div>
                <span className={`text-sm font-medium ${
                  step.active || isCompleted ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {step.title}
                </span>
                <span className="text-xs text-muted-foreground/70">{step.subtitle}</span>
              </div>
              {index < steps.length - 1 && (
                <div className="w-16 h-px bg-border/50 mx-4"></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
