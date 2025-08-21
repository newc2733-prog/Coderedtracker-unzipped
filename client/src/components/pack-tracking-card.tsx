import { useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Check, Clock, Package, TrainTrack, Timer, Edit, Undo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Pack } from "@shared/schema";

interface PackTrackingCardProps {
  pack: Pack;
  onRefetch: () => void;
}

const STAGE_NAMES = [
  "Order received",
  "Ready for collection", 
  "Runner en route to lab",
  "Order collected",
  "Runner en route to clinical area",
  "Product arrived"
];

const STAGE_ICONS = {
  1: Check,
  2: Check,
  3: TrainTrack,
  4: Check,
  5: TrainTrack,
  6: Check,
};

export default function PackTrackingCard({ pack, onRefetch }: PackTrackingCardProps) {
  const { toast } = useToast();
  const [isEstimateOpen, setIsEstimateOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const updateStageMutation = useMutation({
    mutationFn: async (stage: number) => {
      return await apiRequest("/api/packs/stage", {
        method: "PATCH",
        body: JSON.stringify({
          packId: pack.id,
          stage,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/code-red/active"] });
      onRefetch();
      toast({
        title: "Stage updated",
        description: `${pack.name} stage updated successfully`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update pack stage",
        variant: "destructive",
      });
    },
  });

  const updateEstimateMutation = useMutation({
    mutationFn: async (estimatedMinutes: number) => {
      return await apiRequest("/api/packs/estimate", {
        method: "PATCH",
        body: JSON.stringify({
          packId: pack.id,
          estimatedMinutes,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/code-red/active"] });
      onRefetch();
      setIsEstimateOpen(false);
      toast({
        title: "Estimate updated",
        description: `${pack.name} estimated time updated`,
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

  const formatTime = (date: Date | string | null) => {
    if (!date) return "Pending";
    return new Date(date).toLocaleTimeString("en-GB", { 
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  const getStageTime = (stage: number) => {
    switch (stage) {
      case 1: return pack.orderReceivedTime;
      case 2: return pack.readyForCollectionTime;
      case 3: return pack.runnerEnRouteToLabTime;
      case 4: return pack.orderCollectedTime;
      case 5: return pack.runnerEnRouteToClinicalTime;
      case 6: return pack.productArrivedTime;
      default: return null;
    }
  };

  const getStageStatus = (stage: number) => {
    if (stage < pack.currentStage) return 'completed';
    if (stage === pack.currentStage) return 'active';
    return 'pending';
  };

  const getCountdownText = () => {
    if (!pack.estimatedReadyTime || pack.currentStage >= 2) return null;
    
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

  const handleEstimateSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const minutes = parseInt(formData.get("minutes") as string);
    if (minutes && minutes > 0) {
      updateEstimateMutation.mutate(minutes);
    }
  };

  const getHeaderColor = () => {
    if (pack.currentStage === 6) return 'bg-green-50';
    if (pack.currentStage >= 3) return 'bg-amber-50';
    return 'bg-gray-50';
  };

  const getStatusBadge = () => {
    if (pack.currentStage === 6) {
      return (
        <span className="medical-green text-white px-2 py-1 rounded-full text-xs font-semibold">
          <Check className="h-3 w-3 mr-1 inline" />
          ARRIVED
        </span>
      );
    }
    if (pack.currentStage >= 3) {
      return (
        <span className="medical-amber text-white px-2 py-1 rounded-full text-xs font-semibold">
          <TrainTrack className="h-3 w-3 mr-1 inline" />
          IN TRANSIT
        </span>
      );
    }
    return (
      <span className="bg-gray-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
        <Clock className="h-3 w-3 mr-1 inline" />
        PROCESSING
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className={`p-4 border-b border-gray-200 ${getHeaderColor()}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Package className="text-gray-700 text-xl h-6 w-6" />
            <h3 className="font-bold text-lg">{pack.name}</h3>
            {getStatusBadge()}
          </div>
          <div className="text-right text-sm text-gray-600">
            <div>Composition:</div>
            <div className="font-semibold">{pack.composition}</div>
          </div>
        </div>
      </div>
      
      {/* Timeline */}
      <div className="p-4 space-y-4">
        {STAGE_NAMES.map((stageName, index) => {
          const stage = index + 1;
          const status = getStageStatus(stage);
          const time = getStageTime(stage);
          const IconComponent = STAGE_ICONS[stage as keyof typeof STAGE_ICONS] || Clock;

          return (
            <div key={stage} className="flex items-start space-x-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                status === 'completed' ? 'medical-green' : 
                status === 'active' ? 'medical-amber' : 'bg-gray-300'
              }`}>
                <IconComponent className="text-white text-xs h-3 w-3" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${
                      status === 'completed' ? 'text-medical-green' : 
                      status === 'active' ? 'text-medical-amber' : 'text-gray-500'
                    }`}>
                      {stageName}
                    </span>
                    {stage === 2 && getCountdownText() && (
                      <div className="flex items-center gap-1">
                        <Timer className="h-3 w-3 text-blue-600" />
                        <span className="text-xs text-blue-600 font-medium">
                          {getCountdownText()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* Undo button for completed stages */}
                    {status === 'completed' && stage > 1 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-xs border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => updateStageMutation.mutate(stage - 1)}
                        disabled={updateStageMutation.isPending}
                        title={`Undo: Move back to ${STAGE_NAMES[stage - 2]}`}
                      >
                        <Undo className="h-3 w-3 mr-1" />
                        Undo
                      </Button>
                    )}
                    {stage === 1 && pack.currentStage === 1 && (
                      <Dialog open={isEstimateOpen} onOpenChange={setIsEstimateOpen}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Set Time
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Set Estimated Ready Time</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleEstimateSubmit} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="minutes">Minutes until ready</Label>
                              <Input
                                id="minutes"
                                name="minutes"
                                type="number"
                                min="1"
                                max="120"
                                placeholder="Enter minutes (1-120)"
                                required
                              />
                            </div>
                            <div className="flex justify-end space-x-2">
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setIsEstimateOpen(false)}
                              >
                                Cancel
                              </Button>
                              <Button 
                                type="submit" 
                                disabled={updateEstimateMutation.isPending}
                              >
                                {updateEstimateMutation.isPending ? "Setting..." : "Set Time"}
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    )}
                    <span className="text-sm text-gray-500">
                      {formatTime(time)}
                    </span>
                    {status === 'active' && stage < 6 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStageMutation.mutate(stage + 1)}
                        disabled={updateStageMutation.isPending}
                        className="h-6 px-2 text-xs"
                      >
                        Next
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
