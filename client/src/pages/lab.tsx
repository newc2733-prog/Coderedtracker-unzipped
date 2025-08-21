import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { FlaskConical, Clock, Package, AlertCircle, ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import InlinePackManagement from "@/components/inline-pack-management";
import LocationUpdate from "@/components/location-update";
import ActionButtons from "@/components/action-buttons";
import { RunnerLocationStatus } from "@/components/arrival-estimate";

import type { CodeRedEvent, Pack } from "@shared/schema";

interface ActiveCodeRed extends CodeRedEvent {
  packs: Pack[];
}

// Inline Code Red activation form component
function ActivateCodeRedFormInline({ onSuccess }: { onSuccess: () => void }) {
  const [selectedLabType, setSelectedLabType] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [patientMRN, setPatientMRN] = useState<string>("");
  const { toast } = useToast();

  const activateCodeRedMutation = useMutation({
    mutationFn: async (data: { labType: string; location: string; patientMRN: string }) => {
      return await apiRequest("/api/code-red", {
        method: "POST",
        body: JSON.stringify({
          activationTime: new Date().toISOString(),
          labType: data.labType,
          location: data.location,
          patientMRN: data.patientMRN,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/code-red/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/code-red/all-active"] });
      onSuccess();
      setSelectedLabType("");
      setLocation("");
      setPatientMRN("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to activate Code Red",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLabType && location && patientMRN) {
      activateCodeRedMutation.mutate({
        labType: selectedLabType,
        location,
        patientMRN,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="labType">Lab Type</Label>
        <select
          id="labType"
          value={selectedLabType}
          onChange={(e) => setSelectedLabType(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="">Select Lab Type</option>
          <option value="Main Lab">Main Lab</option>
          <option value="Satellite Lab">Satellite Lab</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="location">Exact Location</Label>
        <Input
          id="location"
          placeholder="e.g., Ward 7, Theatre 3, A&E Bay 2"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="patientMRN">Patient MRN</Label>
        <Input
          id="patientMRN"
          placeholder="Patient Medical Record Number"
          value={patientMRN}
          onChange={(e) => setPatientMRN(e.target.value)}
          required
        />
      </div>
      <Button 
        type="submit" 
        className="w-full bg-green-600 hover:bg-green-700"
        disabled={activateCodeRedMutation.isPending || !selectedLabType || !location || !patientMRN}
      >
        {activateCodeRedMutation.isPending ? "Activating..." : "Activate Code Red"}
      </Button>
    </form>
  );
}

export default function LabDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());

  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Get codeRedId from URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const codeRedId = urlParams.get('codeRedId');

  const { data: activeCodeRed, isLoading, refetch } = useQuery<ActiveCodeRed | null>({
    queryKey: codeRedId ? ["/api/code-red", codeRedId] : ["/api/code-red/active"],
    refetchInterval: 5000,
  });

  const { data: allActiveCodeReds, refetch: refetchAll } = useQuery<ActiveCodeRed[]>({
    queryKey: ["/api/code-red/all-active"],
    refetchInterval: 5000,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);



  const updateStageMutation = useMutation({
    mutationFn: async ({ packId, stage }: { packId: number; stage: number }) => {
      return await apiRequest("/api/packs/stage", {
        method: "PATCH",
        body: JSON.stringify({
          packId,
          stage,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/code-red/active"] });
      toast({
        title: "Status updated",
        description: "Pack moved to ready for collection",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update pack status",
        variant: "destructive",
      });
    },
  });

  const updateEstimateMutation = useMutation({
    mutationFn: async ({ packId, estimatedMinutes }: { packId: number; estimatedMinutes: number }) => {
      return await apiRequest("/api/packs/estimate", {
        method: "PATCH",
        body: JSON.stringify({
          packId,
          estimatedMinutes,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/code-red/active"] });
      refetch();
      toast({
        title: "Estimate Updated",
        description: "Ready time estimate has been updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update estimate",
        variant: "destructive",
      });
    },
  });

  const createPackMutation = useMutation({
    mutationFn: async (packType: "Pack A" | "Pack B" | "FFP" | "Cryo" | "Platelets") => {
      if (!activeCodeRed) throw new Error("No active Code Red");
      
      let packData;
      if (packType === "Pack A") {
        packData = { name: "Pack A", composition: "6 FFP", ffp: 6, cryo: 0, platelets: 0 };
      } else if (packType === "Pack B") {
        packData = { name: "Pack B", composition: "6 FFP, 2 Cryo, 1 Platelets", ffp: 6, cryo: 2, platelets: 1 };
      } else if (packType === "FFP") {
        packData = { name: "FFP", composition: "1 FFP", ffp: 1, cryo: 0, platelets: 0 };
      } else if (packType === "Cryo") {
        packData = { name: "Cryoprecipitate", composition: "1 Cryo", ffp: 0, cryo: 1, platelets: 0 };
      } else {
        packData = { name: "Platelets", composition: "1 Platelets", ffp: 0, cryo: 0, platelets: 1 };
      }
      
      return await apiRequest("/api/packs", {
        method: "POST",
        body: JSON.stringify({
          codeRedEventId: activeCodeRed.id,
          ...packData,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/code-red/active"] });
      refetch();
      toast({
        title: "Order Created",
        description: "New blood product order has been created",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create order",
        variant: "destructive",
      });
    },
  });

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-GB", { 
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  const getCountdownText = (pack: Pack) => {
    if (!pack.estimatedReadyTime) return null;
    
    const estimatedTime = new Date(pack.estimatedReadyTime);
    const timeDiff = estimatedTime.getTime() - currentTime.getTime();
    
    if (timeDiff <= 0) {
      return "Ready now";
    }
    
    const minutes = Math.floor(timeDiff / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s remaining`;
    } else {
      return `${seconds}s remaining`;
    }
  };

  const handleEstimateSubmit = (packId: number) => (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const minutes = parseInt(formData.get("minutes") as string);
    if (minutes && minutes > 0) {
      updateEstimateMutation.mutate({ packId, estimatedMinutes: minutes });
    }
  };





  const getReadyPacks = () => {
    if (!activeCodeRed) return [];
    return activeCodeRed.packs.filter(pack => pack.currentStage === 2);
  };

  const getInTransitPacks = () => {
    if (!activeCodeRed) return [];
    return activeCodeRed.packs.filter(pack => pack.currentStage >= 3);
  };



  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading Lab Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!activeCodeRed) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation("/")}
                  className="text-gray-600 hover:bg-gray-100"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Selection
                </Button>
                <FlaskConical className="text-blue-600 text-2xl h-8 w-8" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Lab Dashboard</h1>
                  <p className="text-sm text-gray-600">Ready to activate Code Red</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Current Time</div>
                <div className="font-mono text-lg font-semibold">
                  {formatTime(currentTime)}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Show existing Code Red events if any */}
        {allActiveCodeReds && allActiveCodeReds.length > 0 && (
          <div className="bg-yellow-50 border-b border-yellow-200">
            <div className="max-w-6xl mx-auto px-4 py-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Other Active Code Red Events</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allActiveCodeReds.map((codeRed, index) => (
                  <Card key={codeRed.id} className="border-yellow-300 bg-yellow-100">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-yellow-800">Code Red {index + 1}</span>
                        <Badge variant="outline" className="border-yellow-500 text-yellow-700">Active</Badge>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div><span className="font-medium">{codeRed.labType}</span> - {codeRed.location}</div>
                        <div className="text-gray-600">Patient: {codeRed.patientMRN}</div>
                        <div className="text-gray-600">{codeRed.packs.length} packs active</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        <main className="max-w-6xl mx-auto px-4 py-6">
          <div className="text-center py-12">
            <FlaskConical className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {allActiveCodeReds && allActiveCodeReds.length > 0 
                ? "Activate Additional Code Red" 
                : "No Active Code Red"}
            </h2>
            <p className="text-gray-600 mb-6">
              {allActiveCodeReds && allActiveCodeReds.length > 0 
                ? `Activate a new Code Red event alongside the ${allActiveCodeReds.length} existing event${allActiveCodeReds.length === 1 ? '' : 's'}`
                : "Ready to activate massive transfusion protocol"}
            </p>
            <ActionButtons onRefetch={refetch} />
          </div>
        </main>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-gray-50">
      {/* Multi-Event Warning Banner */}
      {allActiveCodeReds && allActiveCodeReds.length > 1 && (
        <div className="bg-orange-500 text-white">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center justify-center space-x-3">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-semibold">
                WARNING: {allActiveCodeReds.length} Code Red events are currently active. 
                You are working on Code Red {allActiveCodeReds.findIndex(cr => cr.id === activeCodeRed.id) + 1}.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/")}
                className="text-gray-600 hover:bg-gray-100"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Selection
              </Button>
              <FlaskConical className="text-blue-600 text-2xl h-8 w-8" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Lab Dashboard - Code Red {allActiveCodeReds ? allActiveCodeReds.findIndex(cr => cr.id === activeCodeRed.id) + 1 : ''}
                </h1>
                <p className="text-sm text-gray-600">{activeCodeRed.labType} - {activeCodeRed.location}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Current Time</div>
              <div className="font-mono text-lg font-semibold">
                {formatTime(currentTime)}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Code Red Alert */}
      <div className="medical-red text-white">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-6 w-6" />
              <div>
                <div className="font-bold">CODE RED ACTIVE</div>
                <div className="text-sm opacity-90">
                  {activeCodeRed.labType} - {activeCodeRed.location} - MRN: {activeCodeRed.patientMRN}
                </div>
                <div className="text-xs opacity-75">
                  Activated {formatTime(new Date(activeCodeRed.activationTime))}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm">Total Packs: {activeCodeRed.packs.length}</div>
              <div className="text-sm">All packs managed in sections below</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Runner Location Status */}
        <RunnerLocationStatus 
          runnerUserId="runner1"
          activePacksCount={activeCodeRed.packs.filter(p => p.currentStage >= 3 && p.currentStage <= 5).length}
          className="mb-4"
        />

        {/* Location Update */}
        <Card>
          <CardHeader>
            <CardTitle>Patient Location</CardTitle>
          </CardHeader>
          <CardContent>
            <LocationUpdate codeRed={activeCodeRed} />
          </CardContent>
        </Card>

        {/* Inline Order & Management - Each product shows its packs directly below its button */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order & Manage Blood Products
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Pack A Section */}
            <div className="space-y-2">
              <Button 
                onClick={() => createPackMutation.mutate("Pack A")}
                disabled={createPackMutation.isPending}
                className="flex flex-col items-center gap-2 h-auto py-4 w-full"
              >
                <Package className="h-5 w-5" />
                <div className="text-center">
                  <div className="font-medium">Order Pack A</div>
                  <div className="text-xs opacity-75">6 FFP</div>
                </div>
              </Button>
              {/* Show Pack A packs directly below button */}
              {activeCodeRed.packs.filter(pack => pack.name === "Pack A").map((pack, index) => (
                <InlinePackManagement 
                  key={pack.id} 
                  pack={pack} 
                  packNumber={index + 1}
                  onRefetch={refetch} 
                />
              ))}
            </div>

            {/* Pack B Section */}
            <div className="space-y-2">
              <Button 
                onClick={() => createPackMutation.mutate("Pack B")}
                disabled={createPackMutation.isPending}
                className="flex flex-col items-center gap-2 h-auto py-4 w-full"
              >
                <Package className="h-5 w-5" />
                <div className="text-center">
                  <div className="font-medium">Order Pack B</div>
                  <div className="text-xs opacity-75">6 FFP, 2 Cryo, 1 Platelets</div>
                </div>
              </Button>
              {/* Show Pack B packs directly below button */}
              {activeCodeRed.packs.filter(pack => pack.name === "Pack B").map((pack, index) => (
                <InlinePackManagement 
                  key={pack.id} 
                  pack={pack} 
                  packNumber={index + 1}
                  onRefetch={refetch} 
                />
              ))}
            </div>

            {/* FFP Section */}
            <div className="space-y-2">
              <Button 
                onClick={() => createPackMutation.mutate("FFP")}
                disabled={createPackMutation.isPending}
                variant="outline"
                className="flex flex-col items-center gap-2 h-auto py-4 w-full"
              >
                <FlaskConical className="h-5 w-5" />
                <div className="text-center">
                  <div className="font-medium">Order FFP</div>
                  <div className="text-xs opacity-75">1 Unit</div>
                </div>
              </Button>
              {/* Show FFP packs directly below button */}
              {activeCodeRed.packs.filter(pack => pack.name === "FFP").map((pack, index) => (
                <InlinePackManagement 
                  key={pack.id} 
                  pack={pack} 
                  packNumber={index + 1}
                  onRefetch={refetch} 
                />
              ))}
            </div>

            {/* Cryo Section */}
            <div className="space-y-2">
              <Button 
                onClick={() => createPackMutation.mutate("Cryo")}
                disabled={createPackMutation.isPending}
                variant="outline"
                className="flex flex-col items-center gap-2 h-auto py-4 w-full"
              >
                <FlaskConical className="h-5 w-5" />
                <div className="text-center">
                  <div className="font-medium">Order Cryoprecipitate</div>
                  <div className="text-xs opacity-75">1 Unit</div>
                </div>
              </Button>
              {/* Show Cryo packs directly below button */}
              {activeCodeRed.packs.filter(pack => pack.name === "Cryoprecipitate").map((pack, index) => (
                <InlinePackManagement 
                  key={pack.id} 
                  pack={pack} 
                  packNumber={index + 1}
                  onRefetch={refetch} 
                />
              ))}
            </div>

            {/* Platelets Section */}
            <div className="space-y-2">
              <Button 
                onClick={() => createPackMutation.mutate("Platelets")}
                disabled={createPackMutation.isPending}
                variant="outline"
                className="flex flex-col items-center gap-2 h-auto py-4 w-full"
              >
                <FlaskConical className="h-5 w-5" />
                <div className="text-center">
                  <div className="font-medium">Order Platelets</div>
                  <div className="text-xs opacity-75">1 Unit</div>
                </div>
              </Button>
              {/* Show Platelets packs directly below button */}
              {activeCodeRed.packs.filter(pack => pack.name === "Platelets").map((pack, index) => (
                <InlinePackManagement 
                  key={pack.id} 
                  pack={pack} 
                  packNumber={index + 1}
                  onRefetch={refetch} 
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Code Red Management - Fixed spacing to prevent overlap */}
        <div className="space-y-6">
          {/* Action Buttons Card */}
          <Card className="bg-red-50 border-red-200">
            <CardHeader>
              <CardTitle className="text-red-800 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Code Red Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActionButtons 
                codeRed={activeCodeRed} 
                onRefetch={refetch} 
              />
            </CardContent>
          </Card>
          

        </div>



        {/* No Packs */}
        {activeCodeRed.packs.length === 0 && (
          <div className="text-center py-12">
            <FlaskConical className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No packs to process</p>
          </div>
        )}
      </div>
    </div>
  );
}