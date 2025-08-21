import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Clock, Timer, CheckCircle, Trash2, Undo, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Pack } from "@shared/schema";

interface InlinePackManagementProps {
  pack: Pack;
  packNumber: number;
  onRefetch: () => void;
}

export default function InlinePackManagement({ pack, packNumber, onRefetch }: InlinePackManagementProps) {
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editTimeValue, setEditTimeValue] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getCountdownText = () => {
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
    mutationFn: async (stage: number) => {
      return await apiRequest(`/api/packs/stage`, {
        method: "PATCH",
        body: JSON.stringify({ packId: pack.id, stage }),
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
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update pack status",
        variant: "destructive",
      });
    },
  });

  const setEstimateMutation = useMutation({
    mutationFn: async (estimatedMinutes: number | null) => {
      return await apiRequest(`/api/packs/estimate`, {
        method: "PATCH",
        body: JSON.stringify({ packId: pack.id, estimatedMinutes }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/code-red/active"] });
      onRefetch();
      toast({
        title: "Success",
        description: "Time estimate updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update time estimate",
        variant: "destructive",
      });
    },
  });

  const deletePackMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/packs/${pack.id}`, {
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
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete pack",
        variant: "destructive",
      });
    },
  });

  const getStageText = () => {
    const stages = [
      "Order received",
      "Ready for collection", 
      "Runner en route to lab",
      "Order collected",
      "Runner en route to clinical area",
      "Product arrived"
    ];
    return stages[pack.currentStage - 1] || "Unknown stage";
  };

  const getStageColor = () => {
    if (pack.currentStage === 1) return "bg-orange-100 text-orange-800";
    if (pack.currentStage === 2) return "bg-blue-100 text-blue-800";
    if (pack.currentStage >= 3) return "bg-green-100 text-green-800";
    return "bg-gray-100 text-gray-800";
  };

  const countdown = getCountdownText();

  const getCurrentEstimateMinutes = () => {
    if (!pack.estimatedReadyTime) return null;
    const estimatedTime = new Date(pack.estimatedReadyTime);
    const timeDiff = estimatedTime.getTime() - new Date(pack.orderReceivedTime).getTime();
    return Math.round(timeDiff / (1000 * 60));
  };

  const handleEditTimeSubmit = () => {
    const minutes = parseInt(editTimeValue);
    if (minutes && minutes > 0) {
      setEstimateMutation.mutate(minutes);
      setIsEditingTime(false);
      setEditTimeValue("");
    }
  };

  const handleEditTimeCancel = () => {
    setIsEditingTime(false);
    setEditTimeValue("");
  };

  const getDisplayName = () => {
    return `${pack.name} (${packNumber})`;
  };

  return (
    <div className="bg-gray-50 border-l-4 border-l-blue-500 p-4 rounded-r-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-blue-600 text-white">
            {getDisplayName()}
          </Badge>
          <Badge className={getStageColor()}>
            Stage {pack.currentStage}
          </Badge>
          <span className="text-sm text-gray-600">{getStageText()}</span>
        </div>
        <div className="flex items-center gap-2">
          {countdown && (
            <Badge variant="outline" className={countdown === "Ready now" ? "text-red-600" : "text-blue-600"}>
              <Timer className="h-3 w-3 mr-1" />
              {countdown}
            </Badge>
          )}
          {/* Show current estimate if set */}
          {pack.estimatedReadyTime && (
            <Badge variant="secondary" className="text-gray-600">
              {getCurrentEstimateMinutes()}min estimate
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => deletePackMutation.mutate()}
            disabled={deletePackMutation.isPending}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Time Estimate Section */}
        {pack.currentStage === 1 && (
          <>
            {!pack.estimatedReadyTime && !isEditingTime && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEstimateMutation.mutate(15)}
                  disabled={setEstimateMutation.isPending}
                >
                  <Clock className="h-4 w-4 mr-1" />
                  15min
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEstimateMutation.mutate(20)}
                  disabled={setEstimateMutation.isPending}
                >
                  <Clock className="h-4 w-4 mr-1" />
                  20min
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditingTime(true);
                    setEditTimeValue("");
                  }}
                  disabled={setEstimateMutation.isPending}
                >
                  <Edit3 className="h-4 w-4 mr-1" />
                  Custom
                </Button>
              </>
            )}
            
            {pack.estimatedReadyTime && !isEditingTime && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditingTime(true);
                  setEditTimeValue(getCurrentEstimateMinutes()?.toString() || "");
                }}
                disabled={setEstimateMutation.isPending}
              >
                <Edit3 className="h-4 w-4 mr-1" />
                Edit Time
              </Button>
            )}

            {isEditingTime && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Minutes"
                  value={editTimeValue}
                  onChange={(e) => setEditTimeValue(e.target.value)}
                  className="w-20 h-8"
                  min="1"
                  max="120"
                />
                <Button
                  size="sm"
                  onClick={handleEditTimeSubmit}
                  disabled={setEstimateMutation.isPending || !editTimeValue}
                >
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditTimeCancel}
                  disabled={setEstimateMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            )}
          </>
        )}

        {/* Mark Ready Button */}
        {pack.currentStage === 1 && (
          <Button
            variant="default"
            size="sm"
            onClick={() => updateStageMutation.mutate(2)}
            disabled={updateStageMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Mark Ready
          </Button>
        )}

        {/* Undo Button */}
        {pack.currentStage > 1 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateStageMutation.mutate(pack.currentStage - 1)}
            disabled={updateStageMutation.isPending}
            className="text-gray-600 hover:text-gray-700"
          >
            <Undo className="h-4 w-4 mr-1" />
            Undo
          </Button>
        )}
      </div>
    </div>
  );
}