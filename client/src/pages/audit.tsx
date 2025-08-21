import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Clock, MapPin, User, Package, Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface CodeRedEvent {
  id: number;
  activationTime: string;
  labType: string;
  location: string;
  patientMRN: string;
  originalLocation: string;
  locationHistory: string[];
  isActive: boolean;
  deactivationTime?: string;
  packs: Pack[];
}

interface Pack {
  id: number;
  codeRedEventId: number;
  name: string;
  composition: string;
  currentStage: number;
  orderReceivedTime?: string;
  readyForCollectionTime?: string;
  runnerEnRouteToLabTime?: string;
  orderCollectedTime?: string;
  runnerEnRouteToClinicalTime?: string;
  productArrivedTime?: string;
}

export default function AuditPage() {
  const { data: allEvents, isLoading } = useQuery<CodeRedEvent[]>({
    queryKey: ["/api/code-red/audit/all"],
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading audit data...</p>
          </div>
        </div>
      </div>
    );
  }

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    
    if (diffHours > 0) {
      return `${diffHours}h ${remainingMins}m`;
    }
    return `${diffMins}m`;
  };

  const getPackStageText = (stage: number) => {
    const stages = [
      "Order Received",
      "Ready for Collection", 
      "Runner En Route to Lab",
      "Order Collected",
      "Runner En Route to Clinical",
      "Product Arrived"
    ];
    return stages[stage - 1] || `Stage ${stage}`;
  };

  const getPackStageDuration = (pack: any, fromStage: number, toStage: number) => {
    const stageFields = [
      "orderReceivedTime",
      "readyForCollectionTime", 
      "runnerEnRouteToLabTime",
      "orderCollectedTime",
      "runnerEnRouteToClinicalTime",
      "productArrivedTime"
    ];
    
    const startTime = pack[stageFields[fromStage - 1]];
    const endTime = pack[stageFields[toStage - 1]];
    
    if (!startTime || !endTime) return null;
    
    return formatDuration(startTime, endTime);
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Activity className="h-6 w-6 text-red-600" />
        <h1 className="text-2xl font-bold text-gray-900">Code Red Audit Trail</h1>
      </div>

      {!allEvents || allEvents.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No Code Red events found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {allEvents.map((event: any) => (
            <Card key={event.id} className="overflow-hidden">
              <CardHeader className={`${event.isActive ? 'bg-red-50 border-b border-red-200' : 'bg-gray-50 border-b border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Badge variant={event.isActive ? "destructive" : "secondary"}>
                        {event.isActive ? "ACTIVE" : "COMPLETED"}
                      </Badge>
                      Code Red Event #{event.id}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{event.labType} - {event.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>Patient MRN: {event.patientMRN}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>Duration: {formatDuration(event.activationTime, event.deactivationTime)}</span>
                        </div>
                      </div>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                {/* Event Timeline */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Event Timeline</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-medium">Activated:</span>
                      <span>{format(new Date(event.activationTime), "PPp")}</span>
                    </div>
                    {event.deactivationTime && (
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="font-medium">Deactivated:</span>
                        <span>{format(new Date(event.deactivationTime), "PPp")}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Location History */}
                {event.locationHistory && event.locationHistory.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Location Changes</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>Original Location: {event.originalLocation}</span>
                      </div>
                      {event.locationHistory.map((change: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          <span>{change}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator className="my-6" />

                {/* Pack Details */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Blood Products ({event.packs.length} packs)
                  </h3>
                  
                  {event.packs.length === 0 ? (
                    <p className="text-gray-500 text-sm">No packs created for this event</p>
                  ) : (
                    <div className="grid gap-4">
                      {event.packs.map((pack: any) => (
                        <Card key={pack.id} className="bg-gray-50">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium">{pack.name}</h4>
                              <Badge variant="outline">
                                Stage {pack.currentStage}: {getPackStageText(pack.currentStage)}
                              </Badge>
                            </div>
                            
                            <div className="text-sm text-gray-600 mb-3">
                              <span className="font-medium">Composition:</span> {pack.composition}
                            </div>

                            {/* Pack Timeline */}
                            <div className="space-y-2 text-sm">
                              {pack.orderReceivedTime && (
                                <div className="flex justify-between">
                                  <span>Order Received:</span>
                                  <span>{format(new Date(pack.orderReceivedTime), "HH:mm:ss")}</span>
                                </div>
                              )}
                              {pack.readyForCollectionTime && (
                                <div className="flex justify-between">
                                  <span>Ready for Collection:</span>
                                  <div className="text-right">
                                    <span>{format(new Date(pack.readyForCollectionTime), "HH:mm:ss")}</span>
                                    {getPackStageDuration(pack, 1, 2) && (
                                      <span className="text-green-600 ml-2">({getPackStageDuration(pack, 1, 2)})</span>
                                    )}
                                  </div>
                                </div>
                              )}
                              {pack.runnerEnRouteToLabTime && (
                                <div className="flex justify-between">
                                  <span>Runner En Route to Lab:</span>
                                  <div className="text-right">
                                    <span>{format(new Date(pack.runnerEnRouteToLabTime), "HH:mm:ss")}</span>
                                    {getPackStageDuration(pack, 2, 3) && (
                                      <span className="text-blue-600 ml-2">({getPackStageDuration(pack, 2, 3)})</span>
                                    )}
                                  </div>
                                </div>
                              )}
                              {pack.orderCollectedTime && (
                                <div className="flex justify-between">
                                  <span>Order Collected:</span>
                                  <div className="text-right">
                                    <span>{format(new Date(pack.orderCollectedTime), "HH:mm:ss")}</span>
                                    {getPackStageDuration(pack, 3, 4) && (
                                      <span className="text-green-600 ml-2">({getPackStageDuration(pack, 3, 4)})</span>
                                    )}
                                  </div>
                                </div>
                              )}
                              {pack.runnerEnRouteToClinicalTime && (
                                <div className="flex justify-between">
                                  <span>Runner En Route to Clinical:</span>
                                  <div className="text-right">
                                    <span>{format(new Date(pack.runnerEnRouteToClinicalTime), "HH:mm:ss")}</span>
                                    {getPackStageDuration(pack, 4, 5) && (
                                      <span className="text-blue-600 ml-2">({getPackStageDuration(pack, 4, 5)})</span>
                                    )}
                                  </div>
                                </div>
                              )}
                              {pack.productArrivedTime && (
                                <div className="flex justify-between">
                                  <span>Product Arrived:</span>
                                  <div className="text-right">
                                    <span>{format(new Date(pack.productArrivedTime), "HH:mm:ss")}</span>
                                    {getPackStageDuration(pack, 5, 6) && (
                                      <span className="text-green-600 ml-2">({getPackStageDuration(pack, 5, 6)})</span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Total Pack Duration */}
                            {pack.orderReceivedTime && pack.productArrivedTime && (
                              <div className="mt-3 pt-2 border-t border-gray-200">
                                <div className="flex justify-between font-medium">
                                  <span>Total Time:</span>
                                  <span className="text-blue-600">
                                    {formatDuration(pack.orderReceivedTime, pack.productArrivedTime)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}