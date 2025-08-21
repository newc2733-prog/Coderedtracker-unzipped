import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { StopCircle, Plus, ArrowLeftRight, AlertTriangle, Trash2, Undo, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { CodeRedEvent, Pack } from "@shared/schema";

interface ActionButtonsProps {
  codeRed?: CodeRedEvent & { packs: Pack[] };
  onRefetch: () => void;
}

export default function ActionButtons({ codeRed, onRefetch }: ActionButtonsProps) {
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isNewPackOpen, setIsNewPackOpen] = useState(false);
  const [isActivateOpen, setIsActivateOpen] = useState(false);
  const [isSwitchLabOpen, setIsSwitchLabOpen] = useState(false);
  const [isResetAllOpen, setIsResetAllOpen] = useState(false);
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
      onRefetch();
      setIsActivateOpen(false);
      setSelectedLabType("");
      setLocation("");
      setPatientMRN("");
      toast({
        title: "Code Red Activated",
        description: "Massive transfusion protocol is now active",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to activate Code Red",
        variant: "destructive",
      });
    },
  });

  const deactivateCodeRedMutation = useMutation({
    mutationFn: async () => {
      if (!codeRed) throw new Error("No active Code Red");
      return await apiRequest(`/api/code-red/${codeRed.id}/deactivate`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/code-red/active"] });
      onRefetch();
      setIsDeactivateOpen(false);
      toast({
        title: "Code Red Deactivated",
        description: "Massive transfusion protocol has been deactivated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to deactivate Code Red",
        variant: "destructive",
      });
    },
  });

  const deleteCodeRedMutation = useMutation({
    mutationFn: async () => {
      if (!codeRed) throw new Error("No active Code Red");
      return await apiRequest(`/api/code-red/${codeRed.id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/code-red/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/code-red/all-active"] });
      onRefetch();
      setIsDeleteOpen(false);
      toast({
        title: "Code Red Deleted",
        description: "Code Red event has been completely removed from the system",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete Code Red event",
        variant: "destructive",
      });
    },
  });

  const addPackMutation = useMutation({
    mutationFn: async (packType: "Pack A" | "Pack B" | "FFP" | "Cryo" | "Platelets") => {
      if (!codeRed) throw new Error("No active Code Red");
      
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
          codeRedEventId: codeRed.id,
          ...packData,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/code-red/active"] });
      onRefetch();
      setIsNewPackOpen(false);
      toast({
        title: "Pack Added",
        description: "New pack has been added to the Code Red event",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add new pack",
        variant: "destructive",
      });
    },
  });

  const switchLabMutation = useMutation({
    mutationFn: async (labType: string) => {
      if (!codeRed) throw new Error("No active Code Red");
      return await apiRequest(`/api/code-red/${codeRed.id}/lab`, {
        method: "PATCH",
        body: JSON.stringify({
          labType,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/code-red/active"] });
      onRefetch();
      setIsSwitchLabOpen(false);
      toast({
        title: "Lab Switched",
        description: "Lab activation has been updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to switch lab",
        variant: "destructive",
      });
    },
  });

  const resetAllPacksMutation = useMutation({
    mutationFn: async () => {
      if (!codeRed?.packs) return;
      
      // Reset all packs to stage 1
      const resetPromises = codeRed.packs.map(pack => 
        apiRequest("/api/packs/stage", {
          method: "PATCH",
          body: JSON.stringify({
            packId: pack.id,
            stage: 1,
          }),
        })
      );
      
      return Promise.all(resetPromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/code-red/active"] });
      onRefetch();
      setIsResetAllOpen(false);
      toast({
        title: "Emergency Reset Complete",
        description: "All blood packs have been reset to 'Order received' stage",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reset all packs",
        variant: "destructive",
      });
    },
  });

  const handleAddPack = (packType: "Pack A" | "Pack B" | "FFP" | "Cryo" | "Platelets") => {
    addPackMutation.mutate(packType);
  };

  if (!codeRed) {
    return (
      <div className="mt-8 flex justify-center">
        <Dialog open={isActivateOpen} onOpenChange={setIsActivateOpen}>
          <DialogTrigger asChild>
            <Button 
              size="lg"
              className="bg-red-600 hover:bg-red-700 text-white px-12 py-6 text-xl font-bold shadow-lg"
            >
              <AlertTriangle className="mr-3 h-6 w-6" />
              Activate Code Red
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Activate Code Red</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="labType">Lab Location</Label>
                <Select value={selectedLabType} onValueChange={setSelectedLabType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select lab location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Main Lab">Main Lab</SelectItem>
                    <SelectItem value="Satellite Lab">Satellite Lab</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Exact Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Ward 4A, Theatre 2, A&E Bay 3"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="patientMRN">Patient MRN</Label>
                <Input
                  id="patientMRN"
                  value={patientMRN}
                  onChange={(e) => setPatientMRN(e.target.value)}
                  placeholder="Patient Medical Record Number"
                />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    if (!selectedLabType || !location.trim() || !patientMRN.trim()) {
                      toast({
                        title: "Missing Information",
                        description: "Please fill in all fields",
                        variant: "destructive",
                      });
                      return;
                    }
                    activateCodeRedMutation.mutate({ 
                      labType: selectedLabType, 
                      location: location.trim(),
                      patientMRN: patientMRN.trim()
                    });
                  }}
                  disabled={!selectedLabType || !location.trim() || !patientMRN.trim() || activateCodeRedMutation.isPending}
                  className="flex-1"
                  variant="destructive"
                >
                  {activateCodeRedMutation.isPending ? "Activating..." : "Activate Code Red"}
                </Button>
                <Button 
                  onClick={() => {
                    setIsActivateOpen(false);
                    setSelectedLabType("");
                    setLocation("");
                    setPatientMRN("");
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
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Dialog open={isDeactivateOpen} onOpenChange={setIsDeactivateOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="destructive"
            className="flex items-center space-x-2"
          >
            <StopCircle className="h-4 w-4" />
            <span>Stand Down Code Red</span>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stand Down Code Red</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 mb-4">
            Are you sure you want to stand down the Code Red? This will end the massive transfusion protocol and store all data in the audit section for record keeping.
          </p>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsDeactivateOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deactivateCodeRedMutation.mutate()}
              disabled={deactivateCodeRedMutation.isPending}
            >
              Stand Down
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="destructive"
            className="flex items-center space-x-2 bg-red-700 hover:bg-red-800"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete Code Red (Error)</span>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Code Red (Activated in Error)</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 mb-4">
            <strong>Warning:</strong> This will completely remove the Code Red event from the system. 
            Use this only if the Code Red was activated in error. All associated blood packs will also be deleted and no data will be saved to audit records.
          </p>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteCodeRedMutation.mutate()}
              disabled={deleteCodeRedMutation.isPending}
              className="bg-red-700 hover:bg-red-800"
            >
              Delete Code Red
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isNewPackOpen} onOpenChange={setIsNewPackOpen}>
        <DialogTrigger asChild>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Add New Pack</span>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Pack</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Choose the pack type to add:</p>
            <div className="grid grid-cols-1 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Pack A</h4>
                    <p className="text-sm text-gray-600">6 FFP</p>
                  </div>
                  <Button 
                    onClick={() => handleAddPack("Pack A")} 
                    disabled={addPackMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Add Pack A
                  </Button>
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Pack B</h4>
                    <p className="text-sm text-gray-600">6 FFP, 2 Cryo, 1 Platelets</p>
                  </div>
                  <Button 
                    onClick={() => handleAddPack("Pack B")} 
                    disabled={addPackMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Add Pack B
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-3">Or add individual products:</p>
              <div className="grid grid-cols-3 gap-3">
                <Button 
                  onClick={() => addPackMutation.mutate("FFP")} 
                  disabled={addPackMutation.isPending}
                  variant="outline"
                  className="text-xs"
                >
                  Add FFP
                </Button>
                <Button 
                  onClick={() => addPackMutation.mutate("Cryo")} 
                  disabled={addPackMutation.isPending}
                  variant="outline"
                  className="text-xs"
                >
                  Add Cryo
                </Button>
                <Button 
                  onClick={() => addPackMutation.mutate("Platelets")} 
                  disabled={addPackMutation.isPending}
                  variant="outline"
                  className="text-xs"
                >
                  Add Platelets
                </Button>
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setIsNewPackOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isSwitchLabOpen} onOpenChange={setIsSwitchLabOpen}>
        <DialogTrigger asChild>
          <Button variant="secondary" className="flex items-center space-x-2">
            <ArrowLeftRight className="h-4 w-4" />
            <span>Switch Lab</span>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch Lab</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Current lab: <strong>{codeRed.labType}</strong>
            </p>
            <div>
              <Label>Switch to:</Label>
              <Select onValueChange={(value) => switchLabMutation.mutate(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose new lab" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Main Lab">Main Lab</SelectItem>
                  <SelectItem value="Satellite Lab">Satellite Lab</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Emergency Reset Button */}
      <Dialog open={isResetAllOpen} onOpenChange={setIsResetAllOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline"
            className="flex items-center space-x-2 border-orange-500 text-orange-600 hover:bg-orange-50"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Emergency Reset</span>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Emergency Reset All Packs</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 mb-4">
            <strong>Warning:</strong> This will reset ALL blood packs back to 'Order received' stage. 
            Use this only if there has been a major error in the workflow process.
          </p>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsResetAllOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => resetAllPacksMutation.mutate()}
              disabled={resetAllPacksMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset All Packs
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
