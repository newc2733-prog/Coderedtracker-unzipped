import { Info, Check, User, Building, Clock } from "lucide-react";
import { useEffect, useState } from "react";

export default function SystemInfo() {
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdate(new Date());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-GB", { 
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  return (
    <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-3 mb-4">
        <Info className="text-blue-600 text-xl h-6 w-6" />
        <h3 className="font-bold text-lg">System Information</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-semibold mb-2">Integration Status</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-medical-green" />
              <span>BloodTrack Courier Connected</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-medical-green" />
              <span>Main Lab System Online</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-medical-green" />
              <span>Satellite Lab System Online</span>
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="font-semibold mb-2">Current Session</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-gray-500" />
              <span><strong>User:</strong> Dr. Sarah Johnson</span>
            </div>
            <div className="flex items-center space-x-2">
              <Building className="h-4 w-4 text-gray-500" />
              <span><strong>Department:</strong> Emergency Department</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span><strong>Last Updated:</strong> {formatTime(lastUpdate)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
