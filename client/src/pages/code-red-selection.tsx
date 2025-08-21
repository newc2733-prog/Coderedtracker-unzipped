import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AlertCircle, MapPin, Clock, Package, CheckCircle, Users, FlaskConical, Play, Stethoscope } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { CodeRedEvent, Pack } from "@shared/schema";

interface ActiveCodeRed extends CodeRedEvent {
  packs: Pack[];
}

export default function CodeRedSelection() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const { data: activeCodeReds = [], isLoading } = useQuery<ActiveCodeRed[]>({
    queryKey: ["/api/code-red/all-active"],
    refetchInterval: 5000,
  });



  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-GB", { 
      hour12: false,
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const calculateElapsed = (startTime: Date) => {
    const elapsed = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getPacksSummary = (packs: Pack[]) => {
    const total = packs.length;
    const delivered = packs.filter(pack => pack.currentStage === 6).length;
    const inProgress = packs.filter(pack => pack.currentStage > 1 && pack.currentStage < 6).length;
    const pending = packs.filter(pack => pack.currentStage === 1).length;
    
    return { total, delivered, inProgress, pending };
  };

  const handleSelectCodeRed = (codeRedId: number) => {
    if (!selectedRole) {
      toast({
        title: "Select Role",
        description: "Please select your role before proceeding",
        variant: "destructive",
      });
      return;
    }

    // Store the selected Code Red ID in localStorage for the role pages
    localStorage.setItem("selectedCodeRedId", codeRedId.toString());
    
    // Navigate to the appropriate role page
    setLocation(`/${selectedRole}?codeRedId=${codeRedId}`);
  };



  const getRoleIcon = (role: string) => {
    switch (role) {
      case "lab":
        return <FlaskConical className="h-4 w-4" />;
      case "runner":
        return <Play className="h-4 w-4" />;
      case "clinician":
        return <Stethoscope className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
      <div className="bg-red-600 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-8 w-8" />
                <h1 className="text-2xl font-bold">Code Red Tracker</h1>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-90">Current Time</p>
              <p className="text-lg font-mono">{formatTime(currentTime)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Role Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Select Your Role
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: "lab", name: "Lab Staff", icon: "lab", description: "Prepare and manage blood products" },
                { id: "runner", name: "Runner", icon: "runner", description: "Transport products between locations" },
                { id: "clinician", name: "Clinician", icon: "clinician", description: "Monitor patient care and product delivery" }
              ].map((role) => (
                <Card 
                  key={role.id}
                  className={`cursor-pointer transition-all ${
                    selectedRole === role.id 
                      ? 'border-2 border-blue-500 bg-blue-50' 
                      : 'hover:border-blue-300 hover:bg-blue-25'
                  }`}
                  onClick={() => setSelectedRole(role.id)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      {getRoleIcon(role.id)}
                      {role.name}
                      {selectedRole === role.id && <CheckCircle className="h-4 w-4 text-green-600" />}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">{role.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Code Red Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Code Red Events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Activate Code Red for Lab Staff */}
            {selectedRole === "lab" && (
              <div className="text-center p-4 bg-red-50 rounded-lg border-2 border-red-200">
                <FlaskConical className="h-8 w-8 text-red-600 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-3">
                  No Code Red events to join? Activate a new one:
                </p>
                <Button
                  onClick={() => setLocation("/lab")}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2"
                >
                  <FlaskConical className="h-4 w-4 mr-2" />
                  Activate New Code Red
                </Button>
              </div>
            )}

            {/* General note for other roles */}
            {selectedRole && selectedRole !== "lab" && (
              <div className="text-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <FlaskConical className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  Code Red events are activated by Lab Staff. Select an active event below to proceed.
                </p>
              </div>
            )}

            {/* Active Code Red Events */}
            {isLoading ? (
              <div className="text-center py-8">
                <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2 animate-spin" />
                <p className="text-gray-600">Loading active Code Red events...</p>
              </div>
            ) : activeCodeReds.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Active Code Red Events ({activeCodeReds.length})</h3>
                <div className="space-y-3">
                  {activeCodeReds.map((codeRed) => {
                    const summary = getPacksSummary(codeRed.packs);
                    
                    return (
                      <Card 
                        key={codeRed.id}
                        className="cursor-pointer hover:border-red-300 hover:bg-red-25 transition-all"
                        onClick={() => handleSelectCodeRed(codeRed.id)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                              <MapPin className="h-5 w-5 text-red-600" />
                              {codeRed.labType}
                            </CardTitle>
                            <Badge variant="destructive">
                              {calculateElapsed(new Date(codeRed.activationTime))}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">
                                  Activated: {formatTime(new Date(codeRed.activationTime))}
                                </span>
                                <span className="font-medium">
                                  Code Red {activeCodeReds.findIndex(cr => cr.id === codeRed.id) + 1}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">
                                  Location: {codeRed.location}
                                </span>
                                <span className="text-gray-600">
                                  MRN: {codeRed.patientMRN}
                                </span>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-4 gap-2 text-center">
                              <div className="p-2 bg-gray-50 rounded">
                                <div className="text-lg font-bold">{summary.total}</div>
                                <div className="text-xs text-gray-600">Total</div>
                              </div>
                              <div className="p-2 bg-yellow-50 rounded">
                                <div className="text-lg font-bold text-yellow-600">{summary.pending}</div>
                                <div className="text-xs text-gray-600">Pending</div>
                              </div>
                              <div className="p-2 bg-blue-50 rounded">
                                <div className="text-lg font-bold text-blue-600">{summary.inProgress}</div>
                                <div className="text-xs text-gray-600">In Progress</div>
                              </div>
                              <div className="p-2 bg-green-50 rounded">
                                <div className="text-lg font-bold text-green-600">{summary.delivered}</div>
                                <div className="text-xs text-gray-600">Delivered</div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No active Code Red events</p>
                <p className="text-sm">Create a new Code Red to begin</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <h3 className="font-semibold text-blue-900">Instructions</h3>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. Select your role from the options above</li>
                <li>2. Either activate a new Code Red or select an existing active event</li>
                <li>3. You'll be taken to your role-specific dashboard</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}