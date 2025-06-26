import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Thermometer, Beaker, Droplets, CheckCircle, Flame, RotateCcw, Timer, Play, Pause, Square, Clock, Target, BookOpen, Snowflake } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import FlaskComponent from "./lab-equipment/flask-component";
import BeakerComponent from "./lab-equipment/beaker-component";
import ThermometerComponent from "./lab-equipment/thermometer-component";
import DroppingFunnel from "./lab-equipment/dropping-funnel";
import RefluxCondenser from "./lab-equipment/reflux-condenser";
import IceBath from "./lab-equipment/ice-bath";
import type { ExperimentStep } from "@shared/schema";

interface AcetanilideVirtualLabProps {
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
  isDropping: boolean;
  dropRate: number;
  waterFlow: boolean;
  hasIce: boolean;
  crystalFormation: number;
}

const ACETANILIDE_CHEMICALS: Chemical[] = [
  { id: "aniline", name: "Aniline", formula: "C₆H₅NH₂", amount: 2.0, unit: "mL", color: "#8B4513", added: false, density: 1.02, required: true },
  { id: "glacial_acetic", name: "Glacial Acetic Acid", formula: "CH₃COOH", amount: 3.0, unit: "mL", color: "#F0F8FF", added: false, density: 1.05, required: true },
  { id: "acetic_anhydride", name: "Acetic Anhydride", formula: "(CH₃CO)₂O", amount: 2.5, unit: "mL", color: "#FFFACD", added: false, density: 1.08, required: true },
  { id: "distilled_water", name: "Distilled Water", formula: "H₂O", amount: 50.0, unit: "mL", color: "#E6F3FF", added: false, density: 1.0, required: false },
];

const ACETANILIDE_EQUIPMENT: Equipment[] = [
  { id: "round_flask", name: "Round Bottom Flask", icon: "🧪", used: false, required: true },
  { id: "condenser", name: "Reflux Condenser", icon: "🔬", used: false, required: true },
  { id: "dropping_funnel", name: "Dropping Funnel", icon: "💧", used: false, required: true },
  { id: "magnetic_stirrer", name: "Magnetic Stirrer", icon: "🔄", used: false, required: true },
  { id: "ice_bath", name: "Ice Bath", icon: "❄️", used: false, required: false },
  { id: "thermometer", name: "Thermometer", icon: "🌡️", used: false, required: false },
];

export default function AcetanilideVirtualLab({ step, onStepComplete, isActive, stepNumber, totalSteps }: AcetanilideVirtualLabProps) {
  const { toast } = useToast();
  
  const [chemicals, setChemicals] = useState<Chemical[]>(ACETANILIDE_CHEMICALS);
  const [equipment, setEquipment] = useState<Equipment[]>(ACETANILIDE_EQUIPMENT);
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
    canProceed: false,
    isDropping: false,
    dropRate: 1,
    waterFlow: false,
    hasIce: false,
    crystalFormation: 0
  });

  const [draggedItem, setDraggedItem] = useState<{type: 'chemical' | 'equipment', id: string} | null>(null);
  const [stepInstructions, setStepInstructions] = useState<string[]>([]);
  const [completedInstructions, setCompletedInstructions] = useState<boolean[]>([]);
  
  const labBenchRef = useRef<HTMLDivElement>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout>();

  // Initialize step instructions
  useEffect(() => {
    if (step) {
      const instructions = getStepInstructions(step.id);
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

  // Temperature control simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setLabState(prev => {
        let newTemp = prev.temperature;
        
        if (prev.isHeating && newTemp < prev.targetTemperature) {
          newTemp = Math.min(prev.targetTemperature, newTemp + 1.5);
        } else if (prev.isCooling && newTemp > prev.targetTemperature) {
          newTemp = Math.max(prev.targetTemperature, newTemp - 2);
        } else if (!prev.isHeating && !prev.isCooling && newTemp > 22) {
          newTemp = Math.max(22, newTemp - 0.3);
        }

        // Update reaction progress based on conditions
        let newProgress = prev.reactionProgress;
        let newCrystalFormation = prev.crystalFormation;
        
        if (prev.flaskContents.length >= 3 && newTemp > 60 && prev.stirringSpeed > 0) {
          newProgress = Math.min(100, prev.reactionProgress + 1.5);
        }
        
        // Crystal formation during cooling
        if (newTemp < 10 && prev.reactionProgress > 80) {
          newCrystalFormation = Math.min(100, prev.crystalFormation + 2);
        }

        return {
          ...prev,
          temperature: newTemp,
          reactionProgress: newProgress,
          crystalFormation: newCrystalFormation,
          isReacting: newTemp > 60 && prev.flaskContents.length >= 3 && prev.stirringSpeed > 0,
          bubbleIntensity: prev.isReacting ? Math.min(8, Math.floor(newTemp / 10)) : 0
        };
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Check step completion criteria
  useEffect(() => {
    const checkCompletion = () => {
      const canProceed = getStepCompletionCriteria(step.id);
      setLabState(prev => ({ ...prev, canProceed, stepCompleted: canProceed }));
      
      if (canProceed && !labState.stepCompleted) {
        addCheckpoint(`Step ${step.id} requirements completed successfully`);
        toast({
          title: "Step Complete!",
          description: "All requirements met. You can proceed to the next step.",
        });
      }
    };

    checkCompletion();
  }, [chemicals, equipment, labState.reactionProgress, labState.timer, labState.temperature, labState.crystalFormation, step.id, toast]);

  const getStepInstructions = (stepId: number): string[] => {
    switch (stepId) {
      case 1:
        return [
          "Set up round bottom flask with reflux condenser",
          "Add aniline (2.0 mL) to the flask",
          "Add glacial acetic acid (3.0 mL)",
          "Ensure proper cooling water flow",
          "Start magnetic stirring"
        ];
      case 2:
        return [
          "Set up dropping funnel with acetic anhydride",
          "Begin dropwise addition slowly",
          "Monitor temperature (should reach 60-70°C)",
          "Control addition rate to prevent overheating",
          "Complete addition over 5-10 minutes"
        ];
      case 3:
        return [
          "Heat reaction mixture under reflux",
          "Maintain temperature at 70°C for 15 minutes",
          "Prepare ice bath for cooling",
          "Cool reaction mixture to 0-5°C",
          "Observe white crystal formation"
        ];
      case 4:
        return [
          "Set up vacuum filtration apparatus",
          "Filter crystallized acetanilide",
          "Wash crystals with cold water",
          "Remove excess solvent",
          "Collect pure white crystals"
        ];
      case 5:
        return [
          "Dry crystals on filter paper",
          "Weigh the final product",
          "Calculate percentage yield",
          "Determine melting point",
          "Record observations and results"
        ];
      default:
        return ["Follow the step instructions carefully"];
    }
  };

  const getStepCompletionCriteria = (stepId: number): boolean => {
    switch (stepId) {
      case 1:
        return labState.flaskContents.some(c => c.id === "aniline") && 
               labState.flaskContents.some(c => c.id === "glacial_acetic") &&
               labState.waterFlow && labState.stirringSpeed > 0;
      case 2:
        return labState.flaskContents.some(c => c.id === "acetic_anhydride") &&
               labState.temperature >= 60 && labState.isDropping;
      case 3:
        return labState.reactionProgress > 80 && labState.temperature < 10 && 
               labState.crystalFormation > 50;
      case 4:
        return labState.crystalFormation > 80 && 
               labState.flaskContents.some(c => c.id === "distilled_water");
      case 5:
        return labState.timer > 30 && labState.crystalFormation >= 100;
      default:
        return true;
    }
  };

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
      flaskColor: getFlaskColor([...prev.flaskContents, chemical])
    }));

    addCheckpoint(`Added ${chemical.name} to reaction flask`);
    toast({
      title: "Chemical Added",
      description: `${chemical.name} (${chemical.amount}${chemical.unit}) added to flask`,
    });
  };

  const getFlaskColor = (contents: Chemical[]): string => {
    if (contents.length === 0) return 'transparent';
    if (contents.some(c => c.id === 'aniline') && contents.some(c => c.id === 'acetic_anhydride')) {
      return '#F5DEB3'; // Wheat color for acetanilide formation
    }
    if (contents.some(c => c.id === 'aniline')) {
      return '#DEB887'; // Burlywood for aniline mixture
    }
    return contents[contents.length - 1].color;
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
    setLabState(prev => ({ ...prev, isHeating: true, isCooling: false, targetTemperature: 70 }));
    handleEquipmentUse('round_flask');
    addCheckpoint("Started heating under reflux");
  };

  const stopHeating = () => {
    setLabState(prev => ({ ...prev, isHeating: false }));
    addCheckpoint("Stopped heating");
  };

  const startCooling = () => {
    setLabState(prev => ({ ...prev, isCooling: true, isHeating: false, targetTemperature: 5, hasIce: true }));
    handleEquipmentUse('ice_bath');
    addCheckpoint("Started cooling in ice bath");
  };

  const startStirring = (speed: number) => {
    setLabState(prev => ({ ...prev, stirringSpeed: speed }));
    handleEquipmentUse('magnetic_stirrer');
    addCheckpoint(`${speed > 0 ? 'Started' : 'Stopped'} magnetic stirring${speed > 0 ? ` at speed ${speed}` : ''}`);
  };

  const toggleDropping = () => {
    setLabState(prev => ({ ...prev, isDropping: !prev.isDropping }));
    if (!labState.isDropping) {
      handleEquipmentUse('dropping_funnel');
      addCheckpoint("Started dropwise addition of acetic anhydride");
    } else {
      addCheckpoint("Stopped dropwise addition");
    }
  };

  const toggleWaterFlow = () => {
    setLabState(prev => ({ ...prev, waterFlow: !prev.waterFlow }));
    if (!labState.waterFlow) {
      handleEquipmentUse('condenser');
      addCheckpoint("Started cooling water flow");
    } else {
      addCheckpoint("Stopped cooling water flow");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderLabBench = () => (
    <div className="relative bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 rounded-xl p-8 min-h-96 border-2 border-gray-200 shadow-inner">
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
        {/* Main Reaction Setup */}
        <div className="flex flex-col items-center space-y-4">
          {/* Reflux Condenser */}
          <RefluxCondenser
            isActive={labState.isReacting}
            temperature={labState.temperature}
            waterFlow={labState.waterFlow}
            onToggleWater={toggleWaterFlow}
            className="scale-75"
          />
          
          {/* Main Flask */}
          <FlaskComponent
            contents={labState.flaskContents.map((content, index) => ({
              color: content.color,
              level: 15,
              name: content.name
            }))}
            temperature={labState.temperature}
            isHeating={labState.isHeating}
            bubbles={[]}
            stirringAngle={0}
            isStirring={labState.stirringSpeed > 0}
            onDrop={() => {
              if (draggedItem?.type === 'chemical') {
                handleChemicalDrop(draggedItem.id);
                setDraggedItem(null);
              }
            }}
            className="scale-90"
          />
        </div>
        
        {/* Dropping Funnel */}
        <DroppingFunnel
          isDropping={labState.isDropping}
          dropRate={labState.dropRate}
          contents={chemicals.find(c => c.id === 'acetic_anhydride')?.added ? undefined : {
            color: "#FFFACD",
            volume: 80,
            name: "Acetic Anhydride"
          }}
          onToggleDropping={toggleDropping}
          className="scale-75"
        />
        
        {/* Supporting Equipment */}
        <div className="space-y-6">
          <ThermometerComponent
            temperature={labState.temperature}
            label="Digital"
            className="scale-75"
          />
          
          <BeakerComponent
            size="medium"
            contents={labState.crystalFormation > 0 ? {
              color: "#F5F5DC",
              level: Math.min(60, labState.crystalFormation),
              name: "Acetanilide Crystals"
            } : undefined}
            label="Product"
            className="scale-75"
          />
        </div>
      </div>
      
      {/* Ice Bath (when cooling) */}
      {(labState.isCooling || labState.hasIce) && (
        <div className="absolute bottom-4 left-1/4 transform -translate-x-1/2">
          <IceBath
            temperature={labState.temperature}
            hasIce={labState.hasIce}
            onAddIce={() => setLabState(prev => ({ ...prev, hasIce: true }))}
            className="scale-75"
          />
        </div>
      )}
      
      {/* Progress Indicators */}
      <div className="absolute top-4 right-4 space-y-2">
        {labState.reactionProgress > 0 && (
          <div className="bg-white rounded-lg shadow-md p-3 border">
            <div className="text-sm font-medium mb-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
              Reaction Progress
            </div>
            <Progress value={labState.reactionProgress} className="w-32 h-2" />
            <div className="text-xs text-gray-500 mt-1">{Math.round(labState.reactionProgress)}% Complete</div>
          </div>
        )}
        
        {labState.crystalFormation > 0 && (
          <div className="bg-white rounded-lg shadow-md p-3 border">
            <div className="text-sm font-medium mb-2 flex items-center gap-2">
              <Snowflake className="w-3 h-3 text-blue-500" />
              Crystal Formation
            </div>
            <Progress value={labState.crystalFormation} className="w-32 h-2" />
            <div className="text-xs text-gray-500 mt-1">{Math.round(labState.crystalFormation)}% Crystallized</div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Step Progress Header */}
      <Card className="bg-gradient-to-r from-purple-50 to-indigo-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-600" />
                Step {stepNumber} of {totalSteps}: {step.title}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">{step.description}</p>
              <div className="mt-2 text-sm text-purple-700 font-mono">
                C₆H₅NH₂ + (CH₃CO)₂O → C₆H₅NHCOCH₃ + CH₃COOH
              </div>
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
                Acetanilide Synthesis Lab
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
                Reaction Timer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-3">
                <div className="text-2xl font-mono font-bold text-purple-600">
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

          {/* Process Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Thermometer className="h-4 w-4" />
                Process Control
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Temperature</span>
                  <Badge variant={labState.temperature > 50 ? "destructive" : labState.temperature < 10 ? "secondary" : "default"}>
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
                  <span className="text-sm">Water Flow</span>
                  <Badge variant={labState.waterFlow ? "default" : "secondary"}>
                    {labState.waterFlow ? "Active" : "Off"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Dropping</span>
                  <Badge variant={labState.isDropping ? "default" : "secondary"}>
                    {labState.isDropping ? "Active" : "Off"}
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
                  variant={labState.isCooling ? "secondary" : "outline"}
                  onClick={startCooling}
                >
                  <Snowflake className="h-3 w-3 mr-1" />
                  Cool
                </Button>
                <Button 
                  size="sm" 
                  variant={labState.stirringSpeed > 0 ? "default" : "outline"}
                  onClick={() => startStirring(labState.stirringSpeed > 0 ? 0 : 300)}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  {labState.stirringSpeed > 0 ? "Stop" : "Stir"}
                </Button>
                <Button 
                  size="sm" 
                  variant={labState.waterFlow ? "default" : "outline"}
                  onClick={toggleWaterFlow}
                >
                  💧 Water
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
                        : 'bg-white border-gray-200 hover:border-purple-300 hover:shadow-sm'
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

      {/* Step Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <BookOpen className="h-4 w-4" />
            Step Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stepInstructions.map((instruction, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                  completedInstructions[index] ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {completedInstructions[index] ? '✓' : index + 1}
                </div>
                <span className={`text-sm ${completedInstructions[index] ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                  {instruction}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
                <div key={index} className="text-xs text-gray-600 border-l-2 border-purple-200 pl-2">
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
          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
        >
          {labState.canProceed ? "Proceed to Next Step" : "Complete Requirements First"}
        </Button>
      </div>
    </div>
  );
}