import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { MapPin, Edit3, Clock, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CodeRedEvent } from "@shared/schema";

interface LocationUpdateProps {
  codeRed: CodeRedEvent;
}

export default function LocationUpdate({ codeRed }: LocationUpdateProps) {
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [newLocation, setNewLocation] = useState("");
  const { toast } = useToast();

  const updateLocationMutation = useMutation({
    mutationFn: async (data: { codeRedId: number; newLocation: string }) => {
      return await apiRequest("/api/code-red/location", {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/code-red/all-active"] });
      setIsUpdateDialogOpen(false);
      setNewLocation("");
      toast({
        title: "Location Updated",
        description: "Patient location has been successfully updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update location",
        variant: "destructive",
      });
    },
  });

  const handleUpdateLocation = () => {
    if (!newLocation.trim()) {
      toast({
        title: "Location Required",
        description: "Please enter a new location",
        variant: "destructive",
      });
      return;
    }

    if (newLocation.trim() === codeRed.location) {
      toast({
        title: "Same Location",
        description: "The new location is the same as the current location",
        variant: "destructive",
      });
      return;
    }

    updateLocationMutation.mutate({ 
      codeRedId: codeRed.id, 
      newLocation: newLocation.trim() 
    });
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp.split(":")[0]);
    return date.toLocaleString();
  };

  return (
    <div className="space-y-4">
      {/* Large, prominent current location display */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <MapPin className="h-8 w-8 text-blue-600" />
            <div>
              <div className="text-sm font-medium text-gray-600 mb-1">CURRENT LOCATION</div>
              <div className="text-3xl font-bold text-gray-900">{codeRed.location}</div>
              <div className="text-sm text-gray-500 mt-1">Patient MRN: {codeRed.patientMRN}</div>
            </div>
          </div>
          <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="lg" className="text-lg px-6 py-3">
                <Edit3 className="h-5 w-5 mr-2" />
                Update Location
              </Button>
            </DialogTrigger>
            <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                <span>Update Patient Location</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentLocation">Current Location</Label>
                <Input
                  id="currentLocation"
                  value={codeRed.location}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newLocation">New Location</Label>
                <Input
                  id="newLocation"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="e.g., Ward 5B, Theatre 3, ICU Bay 2"
                />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleUpdateLocation}
                  disabled={!newLocation.trim() || updateLocationMutation.isPending}
                  className="flex-1"
                >
                  {updateLocationMutation.isPending ? "Updating..." : "Update Location"}
                </Button>
                <Button 
                  onClick={() => {
                    setIsUpdateDialogOpen(false);
                    setNewLocation("");
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Location History */}
      {codeRed.locationHistory && codeRed.locationHistory.length > 0 && (
        <div className="space-y-2">
          <Separator />
          <div className="flex items-center space-x-2">
            <History className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Location History:</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="h-3 w-3" />
              <span>Originally activated at: {codeRed.originalLocation}</span>
            </div>
            {codeRed.locationHistory.map((entry, index) => {
              const [timestamp, ...messageParts] = entry.split(": ");
              const message = messageParts.join(": ");
              return (
                <div key={index} className="flex items-center space-x-2 text-sm">
                  <Badge variant="outline" className="text-xs">
                    {formatTimestamp(timestamp)}
                  </Badge>
                  <span>{message}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}