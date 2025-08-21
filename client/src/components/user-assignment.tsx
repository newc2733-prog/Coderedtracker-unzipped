import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Package } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { CodeRedEvent, Pack } from "@shared/schema";

interface UserAssignmentProps {
  codeRedEvents: (CodeRedEvent & { packs: Pack[] })[];
  onRefetch: () => void;
}

export default function UserAssignment({ codeRedEvents, onRefetch }: UserAssignmentProps) {
  const [selectedCodeRedId, setSelectedCodeRedId] = useState<string>("");
  const [userId, setUserId] = useState("");
  const [userType, setUserType] = useState<"runner" | "clinician">("runner");
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const assignUserMutation = useMutation({
    mutationFn: async (data: { codeRedId: number; userId: string; userType: "runner" | "clinician" }) => {
      return apiRequest(`/api/code-red/${data.codeRedId}/assign`, {
        method: "POST",
        body: JSON.stringify({
          userId: data.userId,
          userType: data.userType,
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "User Assigned",
        description: `${userType} successfully assigned to Code Red event`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/code-red"] });
      onRefetch();
      setIsOpen(false);
      setSelectedCodeRedId("");
      setUserId("");
    },
    onError: (error: any) => {
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign user to Code Red event",
        variant: "destructive",
      });
    },
  });

  const handleAssign = () => {
    if (!selectedCodeRedId || !userId) {
      toast({
        title: "Missing Information",
        description: "Please select a Code Red event and enter a user ID",
        variant: "destructive",
      });
      return;
    }

    assignUserMutation.mutate({
      codeRedId: parseInt(selectedCodeRedId),
      userId,
      userType,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          User Assignment Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Current Assignments */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Current Assignments</h4>
            {codeRedEvents.length === 0 ? (
              <p className="text-sm text-gray-600">No active Code Red events</p>
            ) : (
              <div className="space-y-2">
                {codeRedEvents.map((event) => (
                  <div key={event.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">Code Red #{event.id}</span>
                        <span className="text-sm text-gray-600">
                          {event.labType} - {event.location}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {event.packs.length} packs
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Runner: </span>
                        <span className={event.assignedRunnerId ? "text-green-700 font-medium" : "text-gray-400"}>
                          {event.assignedRunnerId || "Not assigned"}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Clinician: </span>
                        <span className={event.assignedClinicianId ? "text-green-700 font-medium" : "text-gray-400"}>
                          {event.assignedClinicianId || "Not assigned"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assignment Dialog */}
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="w-full" disabled={codeRedEvents.length === 0}>
                <UserPlus className="h-4 w-4 mr-2" />
                Assign User to Code Red
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign User to Code Red Event</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="codeRedSelect">Select Code Red Event</Label>
                  <Select value={selectedCodeRedId} onValueChange={setSelectedCodeRedId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose Code Red event" />
                    </SelectTrigger>
                    <SelectContent>
                      {codeRedEvents.map((event) => (
                        <SelectItem key={event.id} value={event.id.toString()}>
                          Code Red #{event.id} - {event.labType} - {event.location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="userType">User Type</Label>
                  <Select value={userType} onValueChange={(value: "runner" | "clinician") => setUserType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="runner">Runner</SelectItem>
                      <SelectItem value="clinician">Clinician</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="userId">User ID</Label>
                  <Input
                    id="userId"
                    placeholder="Enter user ID (e.g., runner1, clinician1)"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAssign}
                    disabled={assignUserMutation.isPending}
                  >
                    {assignUserMutation.isPending ? "Assigning..." : "Assign User"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}