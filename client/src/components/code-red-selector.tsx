import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Clock, MapPin, CheckCircle, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { CodeRedEvent, Pack } from "@shared/schema";

interface ActiveCodeRed extends CodeRedEvent {
  packs: Pack[];
}

interface CodeRedSelectorProps {
  selectedCodeRedId?: number;
  onSelectCodeRed: (codeRedId: number) => void;
  currentTime: Date;
}

export default function CodeRedSelector({ selectedCodeRedId, onSelectCodeRed, currentTime }: CodeRedSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: activeCodeReds = [], isLoading } = useQuery<ActiveCodeRed[]>({
    queryKey: ["/api/code-red/all-active"],
    refetchInterval: 5000,
  });

  // Auto-select the first active Code Red if there's only one
  useEffect(() => {
    if (activeCodeReds.length === 1 && selectedCodeRedId !== activeCodeReds[0].id) {
      onSelectCodeRed(activeCodeReds[0].id);
    }
  }, [activeCodeReds, selectedCodeRedId, onSelectCodeRed]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-GB", { 
      hour12: false,
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const calculateElapsed = (startTime: Date) => {
    const elapsed = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getPacksSummary = (packs: Pack[]) => {
    const total = packs.length;
    const delivered = packs.filter(pack => pack.currentStage === 6).length;
    const inProgress = packs.filter(pack => pack.currentStage > 1 && pack.currentStage < 6).length;
    const pending = packs.filter(pack => pack.currentStage === 1).length;
    
    return { total, delivered, inProgress, pending };
  };

  const selectedCodeRed = activeCodeReds.find(cr => cr.id === selectedCodeRedId);

  if (activeCodeReds.length === 0) {
    return null;
  }

  if (activeCodeReds.length === 1) {
    return (
      <Card className="border-2 border-red-500 bg-red-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-5 w-5" />
            Active Code Red
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-red-600" />
                <span className="font-medium">{activeCodeReds[0].labType}</span>
              </div>
              <Badge variant="destructive">
                {calculateElapsed(new Date(activeCodeReds[0].activationTime))}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Activated: {formatTime(new Date(activeCodeReds[0].activationTime))}</span>
              <span>{activeCodeReds[0].packs.length} packs</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Card className="border-2 border-red-500 bg-red-50 cursor-pointer hover:bg-red-100 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              {selectedCodeRed ? (
                <>Selected Code Red - {selectedCodeRed.labType}</>
              ) : (
                <>Select Code Red ({activeCodeReds.length} active)</>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedCodeRed ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-red-600" />
                    <span className="font-medium">{selectedCodeRed.labType}</span>
                  </div>
                  <Badge variant="destructive">
                    {calculateElapsed(new Date(selectedCodeRed.activationTime))}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Activated: {formatTime(new Date(selectedCodeRed.activationTime))}</span>
                  <span>{selectedCodeRed.packs.length} packs</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-2">
                <p className="text-sm text-gray-600">Click to select a Code Red event</p>
              </div>
            )}
          </CardContent>
        </Card>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            Active Code Red Events ({activeCodeReds.length})
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8">
              <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2 animate-spin" />
              <p className="text-gray-600">Loading active Code Red events...</p>
            </div>
          ) : (
            activeCodeReds.map((codeRed) => {
              const summary = getPacksSummary(codeRed.packs);
              const isSelected = selectedCodeRedId === codeRed.id;
              
              return (
                <Card 
                  key={codeRed.id}
                  className={`cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-2 border-red-500 bg-red-50' 
                      : 'hover:border-red-300 hover:bg-red-25'
                  }`}
                  onClick={() => {
                    onSelectCodeRed(codeRed.id);
                    setIsOpen(false);
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-red-600" />
                        {codeRed.labType}
                        {isSelected && <CheckCircle className="h-4 w-4 text-green-600" />}
                      </CardTitle>
                      <Badge variant="destructive">
                        {calculateElapsed(new Date(codeRed.activationTime))}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          Activated: {formatTime(new Date(codeRed.activationTime))}
                        </span>
                        <span className="font-medium">
                          Code Red #{codeRed.id}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="p-2 bg-gray-50 rounded">
                          <div className="text-lg font-bold">{summary.total}</div>
                          <div className="text-xs text-gray-600">Total</div>
                        </div>
                        <div className="p-2 bg-yellow-50 rounded">
                          <div className="text-lg font-bold text-yellow-600">{summary.pending}</div>
                          <div className="text-xs text-gray-600">Pending</div>
                        </div>
                        <div className="p-2 bg-blue-50 rounded">
                          <div className="text-lg font-bold text-blue-600">{summary.inProgress}</div>
                          <div className="text-xs text-gray-600">In Progress</div>
                        </div>
                        <div className="p-2 bg-green-50 rounded">
                          <div className="text-lg font-bold text-green-600">{summary.delivered}</div>
                          <div className="text-xs text-gray-600">Delivered</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
        
        <div className="text-sm text-gray-600 text-center pt-4 border-t">
          Select a Code Red event to view and manage its packs
        </div>
      </DialogContent>
    </Dialog>
  );
}