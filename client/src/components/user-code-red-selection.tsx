import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Package, User, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CodeRedEvent, Pack } from "@shared/schema";

interface UserCodeRedSelectionProps {
  userType: "runner" | "clinician";
  userId: string;
}

interface ActiveCodeRed extends CodeRedEvent {
  packs: Pack[];
}

export default function UserCodeRedSelection({ userType, userId }: UserCodeRedSelectionProps) {
  const [, setLocation] = useLocation();

  const { data: userEvents, isLoading } = useQuery<ActiveCodeRed[]>({
    queryKey: [`/api/code-red/user/${userId}/${userType}`],
    refetchInterval: 5000,
  });

  const { data: allActiveEvents } = useQuery<ActiveCodeRed[]>({
    queryKey: ["/api/code-red/all-active"],
    refetchInterval: 5000,
  });

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-GB", { 
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  const calculateElapsed = (startTime: Date) => {
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000 / 60);
    const hours = Math.floor(elapsed / 60);
    const minutes = elapsed % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const handleSelectCodeRed = (codeRedId: number) => {
    if (userType === "runner") {
      setLocation(`/runner?codeRedId=${codeRedId}`);
    } else {
      setLocation(`/clinician?codeRedId=${codeRedId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading Code Red assignments...</p>
        </div>
      </div>
    );
  }

  const assignedEvents = userEvents || [];
  const unassignedEvents = (allActiveEvents || []).filter(event => {
    if (userType === "runner") {
      return !event.assignedRunnerId;
    } else {
      return !event.assignedClinicianId;
    }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="lg"
                onClick={() => setLocation("/")}
                className="text-gray-600 hover:bg-gray-100"
              >
                ← Back to Dashboard
              </Button>
              <div className="flex items-center gap-3">
                <User className="text-blue-600 h-10 w-10" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {userType === "runner" ? "Runner" : "Clinician"} Code Red Selection
                  </h1>
                  <p className="text-gray-600">User ID: {userId}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Assigned Code Red Events */}
        {assignedEvents.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Assigned Code Red Events</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {assignedEvents.map((event) => (
                <Card key={event.id} className="shadow-lg border-2 border-red-200 hover:shadow-xl transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <CardTitle className="text-xl flex items-center gap-3">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                        Code Red #{event.id}
                      </CardTitle>
                      <Badge className="bg-red-600 text-white">
                        ASSIGNED
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="text-lg font-medium">
                        {event.labType} - {event.location}
                      </div>
                      <div className="text-sm text-gray-600">
                        Patient MRN: {event.patientMRN}
                      </div>
                      <div className="text-sm text-gray-600">
                        Activated: {formatTime(new Date(event.activationTime))} 
                        ({calculateElapsed(new Date(event.activationTime))} ago)
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Active Packs:</span>
                        <span className="font-medium">{event.packs.length}</span>
                      </div>
                      
                      <Button 
                        onClick={() => handleSelectCodeRed(event.id)}
                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                        size="lg"
                      >
                        <Package className="h-5 w-5 mr-2" />
                        Enter Code Red #{event.id}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Unassigned Code Red Events */}
        {unassignedEvents.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Code Red Events</h2>
            <p className="text-gray-600 mb-4">
              These Code Red events need a {userType}. Contact lab staff to get assigned.
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {unassignedEvents.map((event) => (
                <Card key={event.id} className="shadow-lg border-2 border-orange-200 hover:shadow-xl transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <CardTitle className="text-xl flex items-center gap-3">
                        <AlertTriangle className="h-6 w-6 text-orange-600" />
                        Code Red #{event.id}
                      </CardTitle>
                      <Badge className="bg-orange-600 text-white">
                        UNASSIGNED
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="text-lg font-medium">
                        {event.labType} - {event.location}
                      </div>
                      <div className="text-sm text-gray-600">
                        Patient MRN: {event.patientMRN}
                      </div>
                      <div className="text-sm text-gray-600">
                        Activated: {formatTime(new Date(event.activationTime))} 
                        ({calculateElapsed(new Date(event.activationTime))} ago)
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Active Packs:</span>
                        <span className="font-medium">{event.packs.length}</span>
                      </div>
                      
                      <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <p className="text-sm text-orange-800">
                          Contact lab staff to get assigned to this Code Red event
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* No Events Available */}
        {assignedEvents.length === 0 && unassignedEvents.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Active Code Red Events</h2>
            <p className="text-gray-600">There are no Code Red events currently active.</p>
          </div>
        )}
      </div>
    </div>
  );
}