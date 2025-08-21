import { useEffect, useState } from "react";
import { Clock, MapPin, Navigation } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useArrivalEstimate } from "@/hooks/use-location-tracking";

interface ArrivalEstimateProps {
  packId: number;
  packName: string;
  runnerUserId?: string;
  stage: number;
  labLocation?: { lat: string; lng: string };
  clinicalLocation?: { lat: string; lng: string };
  className?: string;
}

// Sample hospital locations (in real implementation, these would come from hospital configuration)
const HOSPITAL_LOCATIONS = {
  "Main Lab": { lat: "51.5074", lng: "-0.1278" }, // London coordinates as example
  "Satellite Lab": { lat: "51.5085", lng: "-0.1290" },
  "ICU": { lat: "51.5080", lng: "-0.1285" },
  "Emergency Department": { lat: "51.5070", lng: "-0.1275" },
  "Theatre Complex": { lat: "51.5077", lng: "-0.1283" },
  "Ward 10": { lat: "51.5072", lng: "-0.1270" },
};

export default function ArrivalEstimate({ 
  packId, 
  packName, 
  runnerUserId = "runner1", // Default runner ID for demo
  stage, 
  labLocation,
  clinicalLocation,
  className = ""
}: ArrivalEstimateProps) {
  const [targetLocation, setTargetLocation] = useState<{ lat: string; lng: string } | null>(null);
  const [estimateType, setEstimateType] = useState<"lab" | "clinical" | null>(null);

  // Determine target location based on pack stage
  useEffect(() => {
    if (stage === 3) {
      // Runner en route to lab
      setTargetLocation(labLocation || HOSPITAL_LOCATIONS["Main Lab"]);
      setEstimateType("lab");
    } else if (stage === 5) {
      // Runner en route to clinical area
      setTargetLocation(clinicalLocation || HOSPITAL_LOCATIONS["ICU"]);
      setEstimateType("clinical");
    } else {
      setTargetLocation(null);
      setEstimateType(null);
    }
  }, [stage, labLocation, clinicalLocation]);

  const { estimate, isCalculating } = useArrivalEstimate(runnerUserId, targetLocation);

  // Don't show estimate if not relevant for current stage
  if (!targetLocation || !estimateType || (stage !== 3 && stage !== 5)) {
    return null;
  }

  const formatEstimate = (minutes: number | null) => {
    if (minutes === null) return "Calculating...";
    if (minutes <= 1) return "Arriving now";
    if (minutes <= 5) return `${minutes}min`;
    return `${minutes}min`;
  };

  const getEstimateColor = (minutes: number | null) => {
    if (minutes === null) return "bg-gray-500";
    if (minutes <= 2) return "bg-green-600";
    if (minutes <= 5) return "bg-yellow-600";
    return "bg-blue-600";
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1">
        <Navigation className="h-4 w-4 text-blue-600" />
        <span className="text-sm text-gray-600">
          {estimateType === "lab" ? "Arriving at lab" : "Arriving at clinical area"}
        </span>
      </div>
      
      <Badge className={`${getEstimateColor(estimate)} text-white text-xs px-2 py-1`}>
        {isCalculating ? (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 animate-spin" />
            <span>Calculating...</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatEstimate(estimate)}</span>
          </div>
        )}
      </Badge>
    </div>
  );
}

// Component for showing runner location status in lab/clinician views
interface RunnerLocationStatusProps {
  runnerUserId?: string;
  activePacksCount: number;
  className?: string;
}

export function RunnerLocationStatus({ 
  runnerUserId = "runner1", 
  activePacksCount,
  className = "" 
}: RunnerLocationStatusProps) {
  const [isOnline, setIsOnline] = useState(false);
  
  // Check if runner location is being tracked (simplified for demo)
  useEffect(() => {
    // In real implementation, this would check the last location update timestamp
    setIsOnline(true);
  }, [runnerUserId]);

  if (activePacksCount === 0) return null;

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <div className="flex items-center gap-1">
        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
        <MapPin className="h-4 w-4 text-gray-600" />
        <span className="text-gray-600">
          Runner {isOnline ? 'location tracked' : 'offline'}
        </span>
      </div>
      
      {isOnline && (
        <Badge variant="outline" className="text-xs">
          Live tracking active
        </Badge>
      )}
    </div>
  );
}