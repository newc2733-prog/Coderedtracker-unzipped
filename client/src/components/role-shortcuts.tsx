import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Clock, FlaskConical, Package, Stethoscope, Timer, CheckCircle, Play, Pause, Undo, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Pack } from "@shared/schema";

interface RoleShortcutsProps {
  role: "lab" | "runner" | "clinician";
  packs: Pack[];
  onRefetch: () => void;
}

export default function RoleShortcuts({ role, packs, onRefetch }: RoleShortcutsProps) {
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  const updateStageMutation = useMutation({
    mutationFn: async (data: { packId: number; stage: number }) => {
      return await apiRequest(`/api/packs/stage`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/code-red/active"] });
      onRefetch();
      toast({
        title: "Success",
        description: "Pack status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update pack status",
        variant: "destructive",
      });
    },
  });

  const setEstimateMutation = useMutation({
    mutationFn: async (data: { packId: number; estimatedMinutes: number | null }) => {
      return await apiRequest(`/api/packs/estimate`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/code-red/active"] });
      onRefetch();
      toast({
        title: "Success",
        description: "Defrosting time set successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to set defrosting time",
        variant: "destructive",
      });
    },
  });

  const deletePackMutation = useMutation({
    mutationFn: async (packId: number) => {
      return await apiRequest(`/api/packs/${packId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/code-red/active"] });
      onRefetch();
      toast({
        title: "Success",
        description: "Pack deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete pack",
        variant: "destructive",
      });
    },
  });

  const handleQuickAction = (packId: number, action: string) => {
    switch (action) {
      case "set_ready":
        // Clear the time estimate when marking as ready
        setEstimateMutation.mutate({ packId, estimatedMinutes: null }, {
          onSuccess: () => {
            updateStageMutation.mutate({ packId, stage: 2 });
          }
        });
        break;
      case "collect":
        updateStageMutation.mutate({ packId, stage: 4 });
        break;
      case "deliver":
        updateStageMutation.mutate({ packId, stage: 6 });
        break;
      case "set_estimate_15":
        setEstimateMutation.mutate({ packId, estimatedMinutes: 15 });
        break;
      case "set_estimate_20":
        setEstimateMutation.mutate({ packId, estimatedMinutes: 20 });
        break;
      case "runner_enroute":
        updateStageMutation.mutate({ packId, stage: 3 });
        break;
      case "start_delivery":
        updateStageMutation.mutate({ packId, stage: 5 });
        break;
      case "undo_stage":
        const pack = packs.find(p => p.id === packId);
        if (pack && pack.currentStage > 1) {
          updateStageMutation.mutate({ packId, stage: pack.currentStage - 1 });
        }
        break;
      case "delete_pack":
        deletePackMutation.mutate(packId);
        break;
    }
  };

  const getLabShortcuts = () => {
    const processingPacks = packs.filter(pack => pack.currentStage === 1);
    const readyPacks = packs.filter(pack => pack.currentStage === 2);
    const nonReadyPacks = packs.filter(pack => pack.currentStage !== 2);

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-blue-600" />
              Lab Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {processingPacks.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Processing Packs</h4>
                <div className="space-y-2">
                  {processingPacks.map((pack) => {
                    const countdown = getCountdownText(pack);
                    const isOverdue = pack.estimatedReadyTime && new Date(pack.estimatedReadyTime) < currentTime;
                    
                    return (
                      <div key={pack.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{pack.name}</span>
                            <Badge variant="outline">{pack.composition}</Badge>
                          </div>
                          {countdown && (
                            <div className={`flex items-center gap-1 mt-1 text-sm ${isOverdue ? 'text-red-600 font-semibold' : 'text-blue-600'}`}>
                              <Timer className="h-3 w-3" />
                              <span>{countdown}</span>
                              {isOverdue && <span className="text-xs">(Overdue)</span>}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {/* Always show time estimate buttons until ready */}
                          <Button
                            size="sm"
                            onClick={() => handleQuickAction(pack.id, "set_estimate_15")}
                            disabled={updateStageMutation.isPending}
                            variant={pack.estimatedReadyTime ? "outline" : "default"}
                          >
                            <Timer className="h-4 w-4 mr-1" />
                            15min
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleQuickAction(pack.id, "set_estimate_20")}
                            disabled={updateStageMutation.isPending}
                            variant={pack.estimatedReadyTime ? "outline" : "default"}
                          >
                            <Timer className="h-4 w-4 mr-1" />
                            20min
                          </Button>
                          {pack.estimatedReadyTime && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEstimateMutation.mutate({ packId: pack.id, estimatedMinutes: null })}
                              disabled={setEstimateMutation.isPending}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Clear
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleQuickAction(pack.id, "set_ready")}
                            disabled={updateStageMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Ready
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickAction(pack.id, "delete_pack")}
                            disabled={deletePackMutation.isPending}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {readyPacks.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Ready for Collection</h4>
                <div className="space-y-2">
                  {readyPacks.map((pack) => (
                    <div key={pack.id} className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <div>
                        <span className="font-medium">{pack.name}</span>
                        <Badge variant="outline" className="ml-2">{pack.composition}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-green-600">Ready</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuickAction(pack.id, "undo_stage")}
                          disabled={updateStageMutation.isPending}
                          className="border-red-300 text-red-600 hover:bg-red-50 h-6 px-2 text-xs"
                        >
                          <Undo className="h-3 w-3 mr-1" />
                          Undo
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {nonReadyPacks.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">All Packs - Mark Ready</h4>
                <div className="space-y-2">
                  {nonReadyPacks.map((pack) => (
                    <div key={pack.id} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                      <div>
                        <span className="font-medium">{pack.name}</span>
                        <Badge variant="outline" className="ml-2">{pack.composition}</Badge>
                        <Badge variant="outline" className="ml-2 bg-yellow-100">
                          Stage {pack.currentStage}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleQuickAction(pack.id, "set_ready")}
                          disabled={updateStageMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Mark Ready
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const getRunnerShortcuts = () => {
    const collectablePacks = packs.filter(pack => pack.currentStage === 2);
    const enRoutePacks = packs.filter(pack => pack.currentStage === 3);
    const collectedPacks = packs.filter(pack => pack.currentStage === 4);
    const deliveringPacks = packs.filter(pack => pack.currentStage === 5);

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-green-600" />
              Runner Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {collectablePacks.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Ready for Collection</h4>
                <div className="space-y-2">
                  {collectablePacks.map((pack) => (
                    <div key={pack.id} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                      <div>
                        <span className="font-medium">{pack.name}</span>
                        <Badge variant="outline" className="ml-2">{pack.composition}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleQuickAction(pack.id, "runner_enroute")}
                          disabled={updateStageMutation.isPending}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          En Route
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {enRoutePacks.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">En Route to Lab</h4>
                <div className="space-y-2">
                  {enRoutePacks.map((pack) => (
                    <div key={pack.id} className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                      <div>
                        <span className="font-medium">{pack.name}</span>
                        <Badge variant="outline" className="ml-2">{pack.composition}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleQuickAction(pack.id, "collect")}
                          disabled={updateStageMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Collected
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuickAction(pack.id, "undo_stage")}
                          disabled={updateStageMutation.isPending}
                          className="border-red-300 text-red-600 hover:bg-red-50 h-8 px-2 text-xs"
                        >
                          <Undo className="h-3 w-3 mr-1" />
                          Undo
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {collectedPacks.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Ready for Delivery</h4>
                <div className="space-y-2">
                  {collectedPacks.map((pack) => (
                    <div key={pack.id} className="flex items-center justify-between p-2 bg-purple-50 rounded">
                      <div>
                        <span className="font-medium">{pack.name}</span>
                        <Badge variant="outline" className="ml-2">{pack.composition}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleQuickAction(pack.id, "start_delivery")}
                          disabled={updateStageMutation.isPending}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Start Delivery
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuickAction(pack.id, "undo_stage")}
                          disabled={updateStageMutation.isPending}
                          className="border-red-300 text-red-600 hover:bg-red-50 h-8 px-2 text-xs"
                        >
                          <Undo className="h-3 w-3 mr-1" />
                          Undo
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {deliveringPacks.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">En Route to Clinical Area</h4>
                <div className="space-y-2">
                  {deliveringPacks.map((pack) => (
                    <div key={pack.id} className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <div>
                        <span className="font-medium">{pack.name}</span>
                        <Badge variant="outline" className="ml-2">{pack.composition}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleQuickAction(pack.id, "deliver")}
                          disabled={updateStageMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Delivered
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuickAction(pack.id, "undo_stage")}
                          disabled={updateStageMutation.isPending}
                          className="border-red-300 text-red-600 hover:bg-red-50 h-8 px-2 text-xs"
                        >
                          <Undo className="h-3 w-3 mr-1" />
                          Undo
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const getClinicianShortcuts = () => {
    const urgentPacks = packs.filter(pack => {
      const now = new Date();
      const orderTime = new Date(pack.orderReceivedTime);
      const elapsedMinutes = (now.getTime() - orderTime.getTime()) / (1000 * 60);
      return elapsedMinutes > 15; // Urgent if more than 15 minutes
    });

    const deliveredPacks = packs.filter(pack => pack.currentStage === 6);
    const inTransitPacks = packs.filter(pack => pack.currentStage >= 3 && pack.currentStage <= 5);

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-purple-600" />
              Clinician Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded">
                <div className="text-2xl font-bold text-blue-600">{packs.length}</div>
                <div className="text-sm text-gray-600">Total Packs</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded">
                <div className="text-2xl font-bold text-green-600">{deliveredPacks.length}</div>
                <div className="text-sm text-gray-600">Delivered</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded">
                <div className="text-2xl font-bold text-orange-600">{inTransitPacks.length}</div>
                <div className="text-sm text-gray-600">In Transit</div>
              </div>
            </div>

            {urgentPacks.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 text-red-600">Urgent Attention Required</h4>
                <div className="space-y-2">
                  {urgentPacks.map((pack) => (
                    <div key={pack.id} className="flex items-center justify-between p-2 bg-red-50 rounded border-l-4 border-red-500">
                      <div>
                        <span className="font-medium">{pack.name}</span>
                        <Badge variant="outline" className="ml-2">{pack.composition}</Badge>
                      </div>
                      <Badge variant="destructive">Delayed</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {deliveredPacks.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Recently Delivered</h4>
                <div className="space-y-2">
                  {deliveredPacks.map((pack) => (
                    <div key={pack.id} className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <div>
                        <span className="font-medium">{pack.name}</span>
                        <Badge variant="outline" className="ml-2">{pack.composition}</Badge>
                      </div>
                      <Badge variant="default" className="bg-green-600">Delivered</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  if (role === "lab") return getLabShortcuts();
  if (role === "runner") return getRunnerShortcuts();
  if (role === "clinician") return getClinicianShortcuts();

  return null;
}