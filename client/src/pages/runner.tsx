import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Play, Package, ArrowRight, CheckCircle, Clock, Timer, ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import RoleShortcuts from "@/components/role-shortcuts";
import { useLocationTracking } from "@/hooks/use-location-tracking";
import ArrivalEstimate from "@/components/arrival-estimate";
import type { CodeRedEvent, Pack } from "@shared/schema";

interface ActiveCodeRed extends CodeRedEvent {
  packs: Pack[];
}

export default function RunnerDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Start location tracking for runner
  const { location: userLocation, error: locationError, isTracking } = useLocationTracking({
    userId: "runner1", // In real app, this would be the actual user ID
    userType: "runner",
    enabled: true,
  });

  // Get Code Red ID from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const selectedCodeRedId = urlParams.get('codeRedId');

  const { data: activeCodeRed, isLoading, refetch } = useQuery<ActiveCodeRed | null>({
    queryKey: selectedCodeRedId ? ["/api/code-red", parseInt(selectedCodeRedId)] : ["/api/code-red/active"],
    refetchInterval: 5000,
  });

  const { data: allActiveCodeReds } = useQuery<ActiveCodeRed[]>({
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
        description: "Pack status updated successfully",
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
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getStageDisplay = (stage: number) => {
    switch (stage) {
      case 1: return { text: "Order received", color: "bg-gray-500" };
      case 2: return { text: "Ready for collection", color: "bg-blue-600" };
      case 3: return { text: "Runner en route to lab", color: "bg-yellow-600" };
      case 4: return { text: "Order collected", color: "bg-orange-600" };
      case 5: return { text: "En route to clinical area", color: "bg-purple-600" };
      case 6: return { text: "Product arrived", color: "bg-green-600" };
      default: return { text: "Unknown", color: "bg-gray-400" };
    }
  };

  const getRunnerAction = (pack: Pack) => {
    switch (pack.currentStage) {
      case 1:
        // For stage 1, show a preparation message instead of action button
        return null;
      case 2:
        return {
          text: "Start Collection",
          icon: Play,
          nextStage: 3,
          disabled: false,
          color: "bg-blue-600 hover:bg-blue-700"
        };
      case 3:
        return {
          text: "Confirm Collected",
          icon: Package,
          nextStage: 4,
          disabled: false,
          color: "bg-orange-600 hover:bg-orange-700"
        };
      case 4:
        return {
          text: "Start Delivery",
          icon: ArrowRight,
          nextStage: 5,
          disabled: false,
          color: "bg-purple-600 hover:bg-purple-700"
        };
      case 5:
        return {
          text: "Confirm Delivered",
          icon: CheckCircle,
          nextStage: 6,
          disabled: false,
          color: "bg-green-600 hover:bg-green-700"
        };
      default:
        return null;
    }
  };

  const getPacksForRunner = () => {
    if (!activeCodeRed) return [];
    
    // Show packs that are ordered (stage 1) with time estimates, ready for collection, or in transit
    return activeCodeRed.packs.filter(pack => {
      // Include stage 1 packs that have time estimates (so runner can prepare)
      if (pack.currentStage === 1 && pack.estimatedReadyTime) return true;
      // Include packs ready for collection or in transit
      return pack.currentStage >= 2 && pack.currentStage < 6;
    });
  };

  const getPackDisplayName = (pack: Pack) => {
    if (!activeCodeRed) return pack.name;
    const samePacks = activeCodeRed.packs.filter(p => p.name === pack.name);
    const packIndex = samePacks.findIndex(p => p.id === pack.id);
    return `${pack.name} (${packIndex + 1})`;
  };

  const getCompletedPacks = () => {
    if (!activeCodeRed) return [];
    return activeCodeRed.packs.filter(pack => pack.currentStage === 6);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading Runner Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!activeCodeRed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No active Code Red event</p>
        </div>
      </div>
    );
  }

  const activePacks = getPacksForRunner();
  const completedPacks = getCompletedPacks();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Multi-Event Warning Banner */}
      {allActiveCodeReds && allActiveCodeReds.length > 1 && (
        <div className="bg-orange-500 text-white">
          <div className="max-w-7xl mx-auto px-6 py-3">
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
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="lg"
                onClick={() => setLocation("/")}
                className="text-gray-600 hover:bg-gray-100"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Dashboard
              </Button>
              <Package className="text-blue-600 h-10 w-10" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Runner Dashboard - Code Red {allActiveCodeReds ? allActiveCodeReds.findIndex(cr => cr.id === activeCodeRed.id) + 1 : ''}
                </h1>
                <div className="mt-2">
                  <div className="text-sm text-gray-600 mb-1">PICKUP LOCATION:</div>
                  <div className="bg-red-100 border-2 border-red-500 rounded-lg px-4 py-2 inline-block">
                    <span className="text-2xl font-black text-red-800 uppercase tracking-wide">
                      {activeCodeRed.labType}
                    </span>
                    <div className="text-lg font-bold text-red-700 mt-1">
                      {activeCodeRed.location}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Current Time</div>
              <div className="font-mono text-lg font-semibold">
                {formatTime(currentTime)}
              </div>
              {/* Location tracking status */}
              <div className="flex items-center gap-1 mt-1 justify-end">
                <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className="text-xs text-gray-600">
                  {isTracking ? 'Location tracked' : 'Location offline'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Large, Simple Pack Cards - Moved to Top */}
        {activePacks.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Packs & Preparation ({activePacks.length})
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {activePacks.map((pack) => {
                const stageDisplay = getStageDisplay(pack.currentStage);
                const action = getRunnerAction(pack);
                const countdown = getCountdownText(pack);
                const ActionIcon = action?.icon || Clock;

                return (
                  <Card key={pack.id} className="shadow-lg border-2 border-blue-200 hover:shadow-xl transition-shadow">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between mb-2">
                        <CardTitle className="text-2xl flex items-center gap-3">
                          <Package className="h-8 w-8 text-blue-600" />
                          {getPackDisplayName(pack)}
                        </CardTitle>
                        <Badge className={`${stageDisplay.color} text-white text-sm px-3 py-1`}>
                          {stageDisplay.text}
                        </Badge>
                      </div>
                      <div className="text-lg text-gray-600 font-medium">
                        {pack.composition}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {/* Order Time Display */}
                        <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-3 rounded-lg">
                          <Clock className="h-5 w-5" />
                          <span className="text-md">
                            Ordered: {formatTime(new Date(pack.orderReceivedTime || new Date()))}
                          </span>
                        </div>
                        
                        {countdown && (
                          <div className={`flex items-center gap-3 p-4 rounded-lg ${
                            pack.currentStage === 1 ? 'text-orange-600 bg-orange-50' : 'text-blue-600 bg-blue-50'
                          }`}>
                            <Timer className="h-6 w-6" />
                            <span className="text-lg font-semibold">
                              {pack.currentStage === 1 ? `Processing - Ready in ${countdown}` : 
                               pack.currentStage === 2 ? `Ready in ${countdown}` : `Estimate: ${countdown}`}
                            </span>
                          </div>
                        )}

                        {/* Arrival Estimate */}
                        <ArrivalEstimate
                          packId={pack.id}
                          packName={getPackDisplayName(pack)}
                          runnerUserId="runner1"
                          stage={pack.currentStage}
                          className="bg-blue-50 p-3 rounded-lg"
                        />
                        
                        {action ? (
                          <div className="flex justify-center">
                            <Button
                              onClick={() => updateStageMutation.mutate({
                                packId: pack.id,
                                stage: action.nextStage
                              })}
                              disabled={updateStageMutation.isPending}
                              className={`${action.color} text-white text-xl px-8 py-6 h-auto flex items-center gap-3`}
                              size="lg"
                            >
                              <ActionIcon className="h-6 w-6" />
                              {updateStageMutation.isPending ? "Updating..." : action.text}
                            </Button>
                          </div>
                        ) : pack.currentStage === 1 && countdown && (
                          <div className="flex justify-center">
                            <div className="text-center p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                              <Clock className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                              <p className="text-lg font-semibold text-orange-800">Prepare to Leave</p>
                              <p className="text-sm text-orange-600">
                                {countdown.includes('m') && parseInt(countdown) <= 5 ? 
                                  'Leave now - pack will be ready soon!' : 
                                  'Wait for countdown to reach 5 minutes'}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <RoleShortcuts 
          role="runner" 
          packs={activeCodeRed.packs} 
          onRefetch={refetch} 
        />

        {/* Completed Packs */}
        {completedPacks.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Completed Deliveries ({completedPacks.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedPacks.map((pack) => (
                <Card key={pack.id} className="shadow-sm bg-green-50 border-green-200">
                  <CardContent className="py-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="font-medium">{getPackDisplayName(pack)}</p>
                            <p className="text-sm text-gray-600">{pack.composition}</p>
                          </div>
                        </div>
                        <Badge className="bg-green-600 text-white">
                          Delivered
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>Ordered: {formatTime(new Date(pack.orderReceivedTime || new Date()))}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* No Active Packs */}
        {activePacks.length === 0 && completedPacks.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No packs ready for collection</p>
          </div>
        )}
      </div>
    </div>
  );
}