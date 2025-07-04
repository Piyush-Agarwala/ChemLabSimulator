import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { AlertTriangle, Thermometer, Beaker, Droplets, CheckCircle, Flame, RotateCcw, Scale, Timer, Play, Pause, Square, Clock, Target, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import FlaskComponent from "./lab-equipment/flask-component";
import TestTubeRack from "./lab-equipment/test-tube-rack";
import BeakerComponent from "./lab-equipment/beaker-component";
import BurnerComponent from "./lab-equipment/burner-component";
import ThermometerComponent from "./lab-equipment/thermometer-component";
import StirringPlate from "./lab-equipment/stirring-plate";
import GraduatedCylinder from "./lab-equipment/graduated-cylinder";
import AcetanilideVirtualLab from "./acetanilide-virtual-lab";
import type { ExperimentStep } from "@shared/schema";

interface VirtualLabProps {
  step: ExperimentStep;
  onStepComplete: () => void;
  isActive: boolean;
  stepNumber: number;
  totalSteps: number;
}

interface Chemical {
  id: string;
  name: string;
  formula: string;
  amount: number;
  unit: string;
  color: string;
  added: boolean;
  density?: number;
  required?: boolean;
}

interface Equipment {
  id: string;
  name: string;
  icon: string;
  used: boolean;
  required?: boolean;
  position?: { x: number; y: number };
}

interface LabState {
  temperature: number;
  targetTemperature: number;
  isHeating: boolean;
  isCooling: boolean;
  stirringSpeed: number;
  reactionProgress: number;
  flaskColor: string;
  isReacting: boolean;
  flaskContents: Chemical[];
  bubbleIntensity: number;
  stepCompleted: boolean;
  timer: number;
  isTimerRunning: boolean;
  checkpoints: string[];
  canProceed: boolean;
}

interface Bubble {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  velocity: { x: number; y: number };
}

const ASPIRIN_CHEMICALS: Chemical[] = [
  { id: "salicylic", name: "Salicylic Acid", formula: "C₇H₆O₃", amount: 2.0, unit: "g", color: "#ffffff", added: false, density: 1.44, required: true },
  { id: "acetic", name: "Acetic Anhydride", formula: "(CH₃CO)₂O", amount: 5.0, unit: "mL", color: "#fff3cd", added: false, density: 1.08, required: true },
  { id: "phosphoric", name: "Phosphoric Acid", formula: "H₃PO₄", amount: 3, unit: "drops", color: "#f8d7da", added: false, density: 1.69, required: true },
  { id: "water", name: "Distilled Water", formula: "H₂O", amount: 20.0, unit: "mL", color: "#cce7ff", added: false, density: 1.0, required: false },
];

const TITRATION_CHEMICALS: Chemical[] = [
  { id: "naoh", name: "NaOH Solution", formula: "NaOH", amount: 0.1, unit: "M", color: "#e3f2fd", added: false, density: 1.04, required: true },
  { id: "hcl", name: "HCl Solution", formula: "HCl", amount: 0.1, unit: "M", color: "#fff3e0", added: false, density: 1.02, required: true },
  { id: "phenolphthalein", name: "Phenolphthalein", formula: "C₂₀H₁₄O₄", amount: 2, unit: "drops", color: "#fce4ec", added: false, density: 1.0, required: true },
];

const EQUIPMENT: Equipment[] = [
  { id: "thermometer", name: "Digital Thermometer", icon: "🌡️", used: false, required: false },
  { id: "stirrer", name: "Magnetic Stirrer", icon: "🔄", used: false, required: false },
  { id: "heater", name: "Hot Plate", icon: "🔥", used: false, required: false },
  { id: "timer", name: "Lab Timer", icon: "⏱️", used: false, required: false },
];

export default function EnhancedVirtualLab({ step, onStepComplete, isActive, stepNumber, totalSteps }: VirtualLabProps) {
  const { toast } = useToast();
  
  // Check if this is the acetanilide synthesis experiment
  const isAcetanilideExperiment = step.title.toLowerCase().includes('acetanilide');
  
  // If it's acetanilide synthesis, use the specialized component
  if (isAcetanilideExperiment) {
    return (
      <AcetanilideVirtualLab
        step={step}
        onStepComplete={onStepComplete}
        isActive={isActive}
        stepNumber={stepNumber}
        totalSteps={totalSteps}
      />
    );
  }
  
  const getChemicalsForExperiment = () => {
    const stepTitle = step.title.toLowerCase();
    if (stepTitle.includes('titration') || stepTitle.includes('acid') || stepTitle.includes('base')) {
      return TITRATION_CHEMICALS;
    }
    return ASPIRIN_CHEMICALS;
  };

  const [chemicals, setChemicals] = useState<Chemical[]>(getChemicalsForExperiment());
  const [equipment, setEquipment] = useState<Equipment[]>(EQUIPMENT);
  const [labState, setLabState] = useState<LabState>({
    temperature: 22,
    targetTemperature: 22,
    isHeating: false,
    isCooling: false,
    stirringSpeed: 0,
    reactionProgress: 0,
    flaskColor: 'transparent',
    isReacting: false,
    flaskContents: [],
    bubbleIntensity: 0,
    stepCompleted: false,
    timer: 0,
    isTimerRunning: false,
    checkpoints: [],
    canProceed: false
  });

  const [draggedItem, setDraggedItem] = useState<{type: 'chemical' | 'equipment', id: string} | null>(null);
  const [isStirring, setIsStirring] = useState(false);
  const [stirringAngle, setStirringAngle] = useState(0);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [stepInstructions, setStepInstructions] = useState<string[]>([]);
  const [completedInstructions, setCompletedInstructions] = useState<boolean[]>([]);
  
  const labBenchRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const timerIntervalRef = useRef<NodeJS.Timeout>();
  const bubbleIdRef = useRef(0);

  // Initialize step instructions based on step content
  useEffect(() => {
    if (step) {
      const instructions = [
        "Read the step instructions carefully",
        "Gather required chemicals and equipment",
        "Follow safety protocols",
        "Complete all required actions",
        "Verify results before proceeding"
      ];
      setStepInstructions(instructions);
      setCompletedInstructions(new Array(instructions.length).fill(false));
    }
  }, [step]);

  // Timer management
  useEffect(() => {
    if (labState.isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setLabState(prev => ({ ...prev, timer: prev.timer + 1 }));
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [labState.isTimerRunning]);

  // Stirring animation
  useEffect(() => {
    if (isStirring && labState.stirringSpeed > 0) {
      const animate = () => {
        setStirringAngle(prev => (prev + (labState.stirringSpeed / 10)) % 360);
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isStirring, labState.stirringSpeed]);

  // Temperature control simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setLabState(prev => {
        let newTemp = prev.temperature;
        
        if (prev.isHeating && newTemp < prev.targetTemperature) {
          newTemp = Math.min(prev.targetTemperature, newTemp + 2);
        } else if (prev.isCooling && newTemp > prev.targetTemperature) {
          newTemp = Math.max(prev.targetTemperature, newTemp - 1);
        } else if (!prev.isHeating && !prev.isCooling && newTemp > 22) {
          newTemp = Math.max(22, newTemp - 0.5); // Natural cooling to room temperature
        }

        // Update reaction progress based on temperature and mixing
        let newProgress = prev.reactionProgress;
        if (prev.flaskContents.length > 1 && newTemp > 60 && prev.stirringSpeed > 0) {
          newProgress = Math.min(100, prev.reactionProgress + 1);
        }

        return {
          ...prev,
          temperature: newTemp,
          reactionProgress: newProgress,
          isReacting: newTemp > 60 && prev.flaskContents.length > 1 && prev.stirringSpeed > 0,
          bubbleIntensity: prev.isReacting ? Math.min(10, Math.floor(newTemp / 10)) : 0
        };
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Bubble generation and animation
  useEffect(() => {
    if (labState.isReacting && labState.bubbleIntensity > 0) {
      const generateBubbles = () => {
        const newBubbles: Bubble[] = [];
        for (let i = 0; i < labState.bubbleIntensity; i++) {
          if (Math.random() < 0.3) {
            newBubbles.push({
              id: bubbleIdRef.current++,
              x: 50 + Math.random() * 100,
              y: 80,
              size: 2 + Math.random() * 4,
              opacity: 0.6 + Math.random() * 0.4,
              velocity: { x: (Math.random() - 0.5) * 2, y: -1 - Math.random() * 2 }
            });
          }
        }
        setBubbles(prev => [...prev.slice(-20), ...newBubbles]);
      };

      const animateBubbles = () => {
        setBubbles(prev => prev
          .map(bubble => ({
            ...bubble,
            x: bubble.x + bubble.velocity.x,
            y: bubble.y + bubble.velocity.y,
            opacity: bubble.opacity - 0.01
          }))
          .filter(bubble => bubble.opacity > 0 && bubble.y > 0)
        );
      };

      const bubbleInterval = setInterval(generateBubbles, 200);
      const animateInterval = setInterval(animateBubbles, 50);

      return () => {
        clearInterval(bubbleInterval);
        clearInterval(animateInterval);
      };
    }
  }, [labState.isReacting, labState.bubbleIntensity]);

  // Check step completion criteria
  useEffect(() => {
    const checkCompletion = () => {
      const requiredChemicals = chemicals.filter(c => c.required);
      const addedRequiredChemicals = requiredChemicals.filter(c => c.added);
      const hasRequiredEquipment = equipment.some(e => e.required && e.used);
      
      const completionCriteria = [
        addedRequiredChemicals.length === requiredChemicals.length,
        labState.reactionProgress > 50 || labState.timer > 30,
        labState.temperature > 50 || !step.description.toLowerCase().includes('heat')
      ];

      const canProceed = completionCriteria.every(Boolean);
      
      setLabState(prev => ({ ...prev, canProceed, stepCompleted: canProceed }));
      
      if (canProceed && !labState.stepCompleted) {
        addCheckpoint("Step requirements completed successfully");
        toast({
          title: "Step Complete!",
          description: "All requirements met. You can proceed to the next step.",
        });
      }
    };

    checkCompletion();
  }, [chemicals, equipment, labState.reactionProgress, labState.timer, labState.temperature, step.description, toast]);

  const addCheckpoint = (description: string) => {
    setLabState(prev => ({
      ...prev,
      checkpoints: [...prev.checkpoints, `${new Date().toLocaleTimeString()}: ${description}`]
    }));
  };

  const handleChemicalDrop = (chemicalId: string) => {
    const chemical = chemicals.find(c => c.id === chemicalId);
    if (!chemical || chemical.added) return;

    setChemicals(prev => prev.map(c => 
      c.id === chemicalId ? { ...c, added: true } : c
    ));

    setLabState(prev => ({
      ...prev,
      flaskContents: [...prev.flaskContents, chemical],
      flaskColor: chemical.color !== 'transparent' ? chemical.color : prev.flaskColor
    }));

    addCheckpoint(`Added ${chemical.name} to flask`);
    toast({
      title: "Chemical Added",
      description: `${chemical.name} (${chemical.amount}${chemical.unit}) added to flask`,
    });
  };

  const handleEquipmentUse = (equipmentId: string) => {
    setEquipment(prev => prev.map(e => 
      e.id === equipmentId ? { ...e, used: true } : e
    ));
    addCheckpoint(`Used ${equipment.find(e => e.id === equipmentId)?.name}`);
  };

  const startTimer = () => {
    setLabState(prev => ({ ...prev, isTimerRunning: true }));
    addCheckpoint("Timer started");
  };

  const pauseTimer = () => {
    setLabState(prev => ({ ...prev, isTimerRunning: false }));
    addCheckpoint("Timer paused");
  };

  const resetTimer = () => {
    setLabState(prev => ({ ...prev, timer: 0, isTimerRunning: false }));
    addCheckpoint("Timer reset");
  };

  const startHeating = () => {
    setLabState(prev => ({ ...prev, isHeating: true, isCooling: false, targetTemperature: 85 }));
    handleEquipmentUse('heater');
    addCheckpoint("Started heating");
  };

  const stopHeating = () => {
    setLabState(prev => ({ ...prev, isHeating: false, isCooling: true, targetTemperature: 22 }));
    addCheckpoint("Stopped heating - cooling down");
  };

  const startStirring = (speed: number) => {
    setLabState(prev => ({ ...prev, stirringSpeed: speed }));
    setIsStirring(speed > 0);
    handleEquipmentUse('stirrer');
    addCheckpoint(`${speed > 0 ? 'Started' : 'Stopped'} stirring${speed > 0 ? ` at speed ${speed}` : ''}`);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderLabBench = () => (
    <div className="relative bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 rounded-xl p-8 min-h-96 border-2 border-gray-200 shadow-inner">
      {/* Lab Bench Surface */}
      <div 
        className="absolute inset-0 rounded-xl"
        style={{
          backgroundImage: `
            linear-gradient(45deg, transparent 24%, rgba(59, 130, 246, 0.05) 25%, rgba(59, 130, 246, 0.05) 26%, transparent 27%, transparent 74%, rgba(59, 130, 246, 0.05) 75%, rgba(59, 130, 246, 0.05) 76%, transparent 77%, transparent),
            linear-gradient(45deg, transparent 24%, rgba(59, 130, 246, 0.05) 25%, rgba(59, 130, 246, 0.05) 26%, transparent 27%, transparent 74%, rgba(59, 130, 246, 0.05) 75%, rgba(59, 130, 246, 0.05) 76%, transparent 77%, transparent)
          `,
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 10px 10px'
        }}
      />
      
      <div className="relative z-10 flex items-center justify-center space-x-8">
        {/* Main Flask */}
        <FlaskComponent
          contents={labState.flaskContents.map((content, index) => ({
            color: content.color,
            level: 20,
            name: content.name
          }))}
          temperature={labState.temperature}
          isHeating={labState.isHeating}
          bubbles={bubbles}
          stirringAngle={stirringAngle}
          isStirring={isStirring}
          onDrop={() => {
            if (draggedItem?.type === 'chemical') {
              handleChemicalDrop(draggedItem.id);
              setDraggedItem(null);
            }
          }}
        />
        
        {/* Supporting Equipment */}
        <div className="space-y-4">
          <BeakerComponent
            size="medium"
            contents={labState.flaskContents.length > 2 ? {
              color: "#e0f2fe",
              level: 40,
              name: "Wash Water"
            } : undefined}
            label="Wash"
          />
          
          <TestTubeRack
            testTubes={[
              { id: "sample1", label: "S1", contents: { color: "#fef3c7", level: 30, name: "Sample" } },
              { id: "sample2", label: "S2" },
              { id: "sample3", label: "S3" },
              { id: "blank", label: "Blank", contents: { color: "#f0f9ff", level: 25, name: "Control" } }
            ]}
            className="scale-75"
          />
        </div>
        
        {/* Lab Equipment Station */}
        <div className="space-y-6">
          <ThermometerComponent
            temperature={labState.temperature}
            label="Digital"
            className="scale-90"
          />
          
          <GraduatedCylinder
            capacity={100}
            contents={labState.flaskContents.length > 1 ? {
              color: "#ddd6fe",
              volume: 75,
              name: "Solution"
            } : undefined}
            accuracy="high"
            label="100mL"
            className="scale-75"
          />
        </div>
      </div>
      
      {/* Hot Plate */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <StirringPlate
          isOn={labState.stirringSpeed > 0}
          speed={labState.stirringSpeed}
          temperature={labState.temperature}
          isHeating={labState.isHeating}
          onToggle={() => startStirring(labState.stirringSpeed > 0 ? 0 : 50)}
          onSpeedChange={(speed) => startStirring(speed)}
          onHeatToggle={() => labState.isHeating ? stopHeating() : startHeating()}
          className="scale-75"
        />
      </div>
      
      {/* Burner (Alternative heating) */}
      {step.description.toLowerCase().includes('flame') && (
        <div className="absolute bottom-4 right-4">
          <BurnerComponent
            isOn={labState.isHeating}
            intensity={Math.round((labState.temperature - 22) / 80 * 100)}
            onToggle={() => labState.isHeating ? stopHeating() : startHeating()}
            className="scale-75"
          />
        </div>
      )}
      
      {/* Progress Indicator */}
      {labState.reactionProgress > 0 && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-md p-3 border">
          <div className="text-sm font-medium mb-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            Reaction Progress
          </div>
          <Progress value={labState.reactionProgress} className="w-32 h-2" />
          <div className="text-xs text-gray-500 mt-1">{Math.round(labState.reactionProgress)}% Complete</div>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Step Progress Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                Step {stepNumber} of {totalSteps}: {step.title}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">{step.description}</p>
            </div>
            <div className="text-right">
              <Badge variant={labState.canProceed ? "default" : "secondary"} className="mb-2">
                {labState.canProceed ? "Complete" : "In Progress"}
              </Badge>
              <Progress value={(stepNumber / totalSteps) * 100} className="w-32" />
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lab Bench */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Beaker className="h-5 w-5" />
                Virtual Lab Bench
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div ref={labBenchRef}>
                {renderLabBench()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls Panel */}
        <div className="space-y-4">
          {/* Timer Control */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                Lab Timer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-3">
                <div className="text-2xl font-mono font-bold text-blue-600">
                  {formatTime(labState.timer)}
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant={labState.isTimerRunning ? "secondary" : "default"}
                  onClick={labState.isTimerRunning ? pauseTimer : startTimer}
                  className="flex-1"
                >
                  {labState.isTimerRunning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                </Button>
                <Button size="sm" variant="outline" onClick={resetTimer}>
                  <Square className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Equipment Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Thermometer className="h-4 w-4" />
                Equipment Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Temperature</span>
                  <Badge variant={labState.temperature > 50 ? "destructive" : "secondary"}>
                    {Math.round(labState.temperature)}°C
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Stirring</span>
                  <Badge variant={labState.stirringSpeed > 0 ? "default" : "secondary"}>
                    {labState.stirringSpeed > 0 ? `${labState.stirringSpeed}%` : "Off"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Heating</span>
                  <Badge variant={labState.isHeating ? "destructive" : "secondary"}>
                    {labState.isHeating ? "Active" : "Off"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <RotateCcw className="h-4 w-4" />
                Quick Controls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  size="sm" 
                  variant={labState.isHeating ? "destructive" : "outline"}
                  onClick={labState.isHeating ? stopHeating : startHeating}
                >
                  <Flame className="h-3 w-3 mr-1" />
                  {labState.isHeating ? "Stop" : "Heat"}
                </Button>
                <Button 
                  size="sm" 
                  variant={labState.stirringSpeed > 0 ? "default" : "outline"}
                  onClick={() => startStirring(labState.stirringSpeed > 0 ? 0 : 50)}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  {labState.stirringSpeed > 0 ? "Stop" : "Stir"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Chemical Inventory */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Droplets className="h-4 w-4" />
                Chemicals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {chemicals.map(chemical => (
                  <div
                    key={chemical.id}
                    draggable={!chemical.added}
                    onDragStart={() => setDraggedItem({ type: 'chemical', id: chemical.id })}
                    className={`p-2 rounded border cursor-pointer transition-all ${
                      chemical.added 
                        ? 'bg-green-50 border-green-200 cursor-not-allowed opacity-60' 
                        : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-xs">{chemical.name}</div>
                        <div className="text-xs text-gray-500">{chemical.formula}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-medium">{chemical.amount}{chemical.unit}</div>
                        {chemical.added && <CheckCircle className="h-3 w-3 text-green-600 ml-auto mt-1" />}
                        {chemical.required && !chemical.added && <Badge variant="outline" className="text-xs">Required</Badge>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Checkpoints */}
      {labState.checkpoints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <BookOpen className="h-4 w-4" />
              Lab Progress Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {labState.checkpoints.map((checkpoint, index) => (
                <div key={index} className="text-xs text-gray-600 border-l-2 border-blue-200 pl-2">
                  {checkpoint}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step Completion */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {labState.canProceed ? "✅ All requirements completed" : "⏳ Complete all requirements to proceed"}
        </div>
        <Button 
          onClick={onStepComplete}
          disabled={!labState.canProceed}
          size="lg"
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
        >
          {labState.canProceed ? "Proceed to Next Step" : "Complete Requirements First"}
        </Button>
      </div>
    </div>
  );
}