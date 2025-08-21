import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Stethoscope, Clock, Package, CheckCircle, AlertTriangle, ArrowLeft, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { queryClient } from "@/lib/queryClient";
import RoleShortcuts from "@/components/role-shortcuts";
import ArrivalEstimate, { RunnerLocationStatus } from "@/components/arrival-estimate";
import type { CodeRedEvent, Pack } from "@shared/schema";

interface ActiveCodeRed extends CodeRedEvent {
  packs: Pack[];
}

export default function ClinicianDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [, setLocation] = useLocation();

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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-GB", { 
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  const calculateElapsed = (startTime: Date) => {
    const elapsed = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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

  const getPackDisplayName = (pack: Pack) => {
    if (!activeCodeRed) return pack.name;
    const samePacks = activeCodeRed.packs.filter(p => p.name === pack.name);
    const packIndex = samePacks.findIndex(p => p.id === pack.id);
    return `${pack.name} (${packIndex + 1})`;
  };

  const getStageDisplay = (stage: number) => {
    switch (stage) {
      case 1: return { text: "Order received", color: "bg-gray-500", progress: 16 };
      case 2: return { text: "Ready for collection", color: "bg-blue-600", progress: 33 };
      case 3: return { text: "Runner en route to lab", color: "bg-yellow-600", progress: 50 };
      case 4: return { text: "Order collected", color: "bg-orange-600", progress: 66 };
      case 5: return { text: "En route to clinical area", color: "bg-purple-600", progress: 83 };
      case 6: return { text: "Product arrived", color: "bg-green-600", progress: 100 };
      default: return { text: "Unknown", color: "bg-gray-400", progress: 0 };
    }
  };

  const getTotalProductsSummary = () => {
    if (!activeCodeRed) return { total: 0, arrived: 0, ffp: 0, cryo: 0, platelets: 0 };
    
    const arrivedPacks = activeCodeRed.packs.filter(pack => pack.currentStage === 6);
    const totalProducts = arrivedPacks.reduce((totals, pack) => ({
      ffp: totals.ffp + pack.ffp,
      cryo: totals.cryo + pack.cryo,
      platelets: totals.platelets + pack.platelets,
    }), { ffp: 0, cryo: 0, platelets: 0 });

    return {
      total: activeCodeRed.packs.length,
      arrived: arrivedPacks.length,
      ...totalProducts
    };
  };

  const getUrgentPacks = () => {
    if (!activeCodeRed) return [];
    
    // Show packs that are delayed or need attention
    return activeCodeRed.packs.filter(pack => {
      if (pack.currentStage === 6) return false; // Already arrived
      
      const orderTime = new Date(pack.orderReceivedTime);
      const elapsedMinutes = (currentTime.getTime() - orderTime.getTime()) / (1000 * 60);
      
      // Flag packs that have been in the system for more than 30 minutes
      return elapsedMinutes > 30;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading Clinical Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!activeCodeRed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Stethoscope className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No active Code Red event</p>
        </div>
      </div>
    );
  }

  const productsSummary = getTotalProductsSummary();
  const urgentPacks = getUrgentPacks();

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
                Back to Dashboard
              </Button>
              <Stethoscope className="text-green-600 text-2xl h-8 w-8" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Clinical Dashboard - Code Red {allActiveCodeReds ? allActiveCodeReds.findIndex(cr => cr.id === activeCodeRed.id) + 1 : ''}
                </h1>
                <p className="text-sm text-gray-600">Code Red Status Overview</p>
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

      {/* Code Red Status Banner */}
      <div className="medical-red text-white">
        <div className="max-w-6xl mx-auto px-4 py-4">
          {allActiveCodeReds && allActiveCodeReds.length > 1 ? (
            // Multiple Code Reds - Split Layout
            <div className="grid grid-cols-2 gap-0">
              {allActiveCodeReds.map((codeRed, index) => {
                const codeRedProductsSummary = {
                  total: codeRed.packs.length,
                  arrived: codeRed.packs.filter(pack => pack.currentStage === 6).length,
                };
                
                return (
                  <div key={codeRed.id} className={`${index > 0 ? 'border-l-2 border-white pl-4' : 'pr-4'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center space-x-3">
                        <AlertTriangle className="h-6 w-6" />
                        <div>
                          <div className="font-bold text-lg">CODE RED ACTIVE {index + 1}</div>
                          <div className="text-sm opacity-90">
                            {codeRed.labType} - {codeRed.location} - MRN: {codeRed.patientMRN}
                          </div>
                          <div className="text-xs opacity-75">
                            Activated {formatTime(new Date(codeRed.activationTime))}
                          </div>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{calculateElapsed(new Date(codeRed.activationTime))}</div>
                        <div className="text-sm opacity-90">Time Elapsed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{codeRedProductsSummary.arrived} / {codeRedProductsSummary.total}</div>
                        <div className="text-sm opacity-90">Packs Arrived</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Single Code Red - Original Layout
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-6 w-6" />
                <div>
                  <div className="font-bold text-lg">CODE RED ACTIVE</div>
                  <div className="text-sm opacity-90">
                    {activeCodeRed.labType} - {activeCodeRed.location} - MRN: {activeCodeRed.patientMRN}
                  </div>
                  <div className="text-xs opacity-75">
                    Activated {formatTime(new Date(activeCodeRed.activationTime))}
                  </div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{calculateElapsed(new Date(activeCodeRed.activationTime))}</div>
                <div className="text-sm opacity-90">Time Elapsed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{productsSummary.arrived} / {productsSummary.total}</div>
                <div className="text-sm opacity-90">Packs Arrived</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pack Status Bars */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">All Pack Status</h3>
          <div className="space-y-3">
            {activeCodeRed.packs.map((pack) => {
              const stageDisplay = getStageDisplay(pack.currentStage);
              const countdown = getCountdownText(pack);
              const isOverdue = pack.estimatedReadyTime && new Date(pack.estimatedReadyTime) < currentTime;
              
              return (
                <div key={pack.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Package className="h-4 w-4 text-gray-600" />
                      <span className="font-medium text-gray-900">{getPackDisplayName(pack)}</span>
                      <span className="text-sm text-gray-600">{pack.composition}</span>
                      {countdown && (
                        <span className={`text-sm font-medium px-2 py-1 rounded ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                          {pack.currentStage === 2 ? `Ready in ${countdown}` : `Estimate: ${countdown}`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${stageDisplay.color}`}></div>
                      <span className="text-sm font-medium text-gray-700">{stageDisplay.text}</span>
                    </div>
                  </div>
                  
                  {/* Arrival Estimate for runner stages */}
                  <ArrivalEstimate
                    packId={pack.id}
                    packName={getPackDisplayName(pack)}
                    runnerUserId="runner1"
                    stage={pack.currentStage}
                    className="mb-2"
                  />
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${stageDisplay.color}`}
                      style={{ width: `${stageDisplay.progress}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
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

        {/* Quick Actions */}
        <RoleShortcuts 
          role="clinician" 
          packs={activeCodeRed.packs} 
          onRefetch={refetch} 
        />

        {/* Blood Products Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-red-600" />
                FFP Units
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{productsSummary.ffp}</div>
              <p className="text-sm text-gray-600">Fresh Frozen Plasma</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                Cryo Units
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{productsSummary.cryo}</div>
              <p className="text-sm text-gray-600">Cryoprecipitate</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-yellow-600" />
                Platelet Units
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{productsSummary.platelets}</div>
              <p className="text-sm text-gray-600">Platelets</p>
            </CardContent>
          </Card>
        </div>

        {/* Urgent Attention */}
        {urgentPacks.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-red-600 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Requires Attention ({urgentPacks.length})
            </h2>
            <div className="space-y-3">
              {urgentPacks.map((pack) => {
                const stageDisplay = getStageDisplay(pack.currentStage);
                const orderTime = new Date(pack.orderReceivedTime);
                const elapsedMinutes = Math.floor((currentTime.getTime() - orderTime.getTime()) / (1000 * 60));

                return (
                  <Card key={pack.id} className="border-l-4 border-l-red-500 bg-red-50">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                          <div>
                            <p className="font-medium">{getPackDisplayName(pack)}</p>
                            <p className="text-sm text-gray-600">{pack.composition}</p>
                            <p className="text-sm text-red-600">Delayed {elapsedMinutes} minutes</p>
                          </div>
                        </div>
                        <Badge className={`${stageDisplay.color} text-white`}>
                          {stageDisplay.text}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}


      </div>
    </div>
  );
}