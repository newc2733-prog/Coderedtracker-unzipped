import { TriangleAlert, FlaskConical, Clock, Check } from "lucide-react";
import type { CodeRedEvent, Pack } from "@shared/schema";

interface CodeRedBannerProps {
  codeRed: CodeRedEvent & { packs: Pack[] };
  currentTime: Date;
  onRefetch: () => void;
}

export default function CodeRedBanner({ codeRed, currentTime }: CodeRedBannerProps) {
  const activationTime = new Date(codeRed.activationTime);
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-GB", { 
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };



  return (
    <div className="medical-red text-white">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="flex items-center space-x-4">
            <TriangleAlert className="h-8 w-8" />
            <div>
              <div className="font-bold text-2xl">CODE RED ACTIVE</div>
              <div className="text-lg opacity-90">
                {formatTime(activationTime)}
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold">{codeRed.location}</div>
            <div className="text-base opacity-90">Location</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold">MRN: {codeRed.patientMRN}</div>
            <div className="text-base opacity-90">Patient</div>
          </div>
        </div>
      </div>
    </div>
  );
}
