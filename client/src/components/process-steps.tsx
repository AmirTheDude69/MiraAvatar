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
    <div className="mb-16">
      <div className="flex items-center justify-center">
        <div className="flex items-center space-x-4 md:space-x-12 lg:space-x-16">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = (
              (currentStep === 'processing' && step.id === 'upload') ||
              (currentStep === 'feedback' && (step.id === 'upload' || step.id === 'processing'))
            );
            
            return (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center group">
                  <div className={`relative w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all duration-500 ${
                    isCompleted 
                      ? 'hyperdash-gradient text-black shadow-2xl scale-110'
                      : step.active 
                        ? 'hyperdash-gradient text-black shadow-xl scale-105 animate-pulse' 
                        : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                  }`}>
                    {isCompleted ? <CheckCircle className="w-8 h-8" /> : <Icon className="w-8 h-8" />}
                    
                    {/* Enhanced active indicator */}
                    {step.active && (
                      <>
                        <div className="absolute -inset-2 hyperdash-gradient rounded-2xl blur opacity-30 animate-pulse"></div>
                        <div className="absolute -inset-4 border-2 border-primary/30 rounded-2xl animate-ping"></div>
                      </>
                    )}
                    
                    {/* Completion glow */}
                    {isCompleted && (
                      <div className="absolute -inset-1 hyperdash-gradient rounded-2xl blur opacity-50"></div>
                    )}
                  </div>
                  
                  <div className="text-center space-y-1">
                    <span className={`text-base font-semibold transition-colors duration-300 ${
                      step.active || isCompleted ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                    }`}>
                      {step.title}
                    </span>
                    <div className={`text-sm transition-colors duration-300 ${
                      step.active || isCompleted ? 'text-primary' : 'text-muted-foreground/70'
                    }`}>
                      {step.subtitle}
                    </div>
                  </div>
                </div>
                
                {/* Enhanced connector line */}
                {index < steps.length - 1 && (
                  <div className="flex items-center mx-4 md:mx-8 lg:mx-12">
                    <div className={`h-px transition-all duration-500 ${
                      isCompleted || (currentStep === 'feedback' && index === 0)
                        ? 'w-16 md:w-24 lg:w-32 bg-gradient-to-r from-primary to-cyan-500'
                        : step.active
                          ? 'w-12 md:w-20 lg:w-28 bg-gradient-to-r from-primary/50 to-transparent'
                          : 'w-8 md:w-16 lg:w-24 bg-border/30'
                    }`}></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
