import { 
  codeRedEvents, 
  packs, 
  userLocations,
  type CodeRedEvent, 
  type InsertCodeRedEvent,
  type Pack,
  type InsertPack,
  type UpdatePackStage,
  type UpdatePackEstimate,
  type UpdateCodeRedLocation,
  type UserLocation,
  type InsertUserLocation,
  type UpdateLocation
} from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { db } from './db';

export interface IStorage {
  // Code Red Events
  createCodeRedEvent(event: InsertCodeRedEvent): Promise<CodeRedEvent>;
  getActiveCodeRedEvents(): Promise<(CodeRedEvent & { packs: Pack[] })[]>;
  getActiveCodeRedEvent(): Promise<(CodeRedEvent & { packs: Pack[] }) | null>;
  getAllCodeRedEventsForAudit(): Promise<(CodeRedEvent & { packs: Pack[] })[]>;
  getCodeRedEventById(id: number): Promise<(CodeRedEvent & { packs: Pack[] }) | null>;
  getCodeRedEventsByUserId(userId: string, userType: 'runner' | 'clinician'): Promise<(CodeRedEvent & { packs: Pack[] })[]>;
  assignUserToCodeRed(codeRedId: number, userId: string, userType: 'runner' | 'clinician'): Promise<void>;
  deactivateCodeRedEvent(id: number): Promise<void>;
  deleteCodeRedEvent(id: number): Promise<void>;
  updateCodeRedEventLab(id: number, labType: string): Promise<void>;
  updateCodeRedLocation(data: UpdateCodeRedLocation): Promise<CodeRedEvent>;

  // Packs
  createPack(pack: InsertPack): Promise<Pack>;
  getPacksByCodeRedEventId(eventId: number): Promise<Pack[]>;
  updatePackStage(data: UpdatePackStage): Promise<Pack>;
  updatePackEstimate(data: UpdatePackEstimate): Promise<Pack>;
  getPackById(id: number): Promise<Pack | undefined>;
  deletePack(id: number): Promise<void>;
  updatePackArrivalEstimates(packId: number, labEstimate?: Date, clinicalEstimate?: Date): Promise<Pack>;

  // Location Tracking
  updateUserLocation(data: UpdateLocation): Promise<UserLocation>;
  getUserLocation(userId: string): Promise<UserLocation | null>;
  getAllActiveUserLocations(): Promise<UserLocation[]>;
  calculateArrivalEstimate(fromUserId: string, toLocation: { lat: string, lng: string }): Promise<number | null>; // Returns minutes
}

export class MemStorage implements IStorage {
  private codeRedEvents: Map<number, CodeRedEvent>;
  private packs: Map<number, Pack>;
  private userLocations: Map<string, UserLocation>;
  private currentCodeRedId: number;
  private currentPackId: number;
  private currentLocationId: number;

  constructor() {
    this.codeRedEvents = new Map();
    this.packs = new Map();
    this.userLocations = new Map();
    this.currentCodeRedId = 1;
    this.currentPackId = 1;
    this.currentLocationId = 1;
  }

  async createCodeRedEvent(insertEvent: InsertCodeRedEvent): Promise<CodeRedEvent> {
    const id = this.currentCodeRedId++;
    const event: CodeRedEvent = {
      id,
      activationTime: insertEvent.activationTime,
      labType: insertEvent.labType,
      location: insertEvent.location,
      patientMRN: insertEvent.patientMRN,
      originalLocation: insertEvent.location,
      locationHistory: [],
      assignedRunnerId: insertEvent.assignedRunnerId || null,
      assignedClinicianId: insertEvent.assignedClinicianId || null,
      isActive: true,
      deactivationTime: null,
    };
    this.codeRedEvents.set(id, event);
    return event;
  }

  async getActiveCodeRedEvents(): Promise<(CodeRedEvent & { packs: Pack[] })[]> {
    const activeEvents = Array.from(this.codeRedEvents.values()).filter(
      (event) => event.isActive
    );
    
    return activeEvents.map(event => {
      const eventPacks = Array.from(this.packs.values()).filter(
        (pack) => pack.codeRedEventId === event.id
      );
      return { ...event, packs: eventPacks };
    });
  }

  async getActiveCodeRedEvent(): Promise<(CodeRedEvent & { packs: Pack[] }) | null> {
    const activeEvent = Array.from(this.codeRedEvents.values()).find(
      (event) => event.isActive
    );
    
    if (!activeEvent) return null;

    const eventPacks = Array.from(this.packs.values()).filter(
      (pack) => pack.codeRedEventId === activeEvent.id
    );

    return {
      ...activeEvent,
      packs: eventPacks,
    };
  }

  async getAllCodeRedEventsForAudit(): Promise<(CodeRedEvent & { packs: Pack[] })[]> {
    const allEvents = Array.from(this.codeRedEvents.values())
      .sort((a, b) => new Date(b.activationTime).getTime() - new Date(a.activationTime).getTime());
    
    return allEvents.map(event => {
      const eventPacks = Array.from(this.packs.values()).filter(
        (pack) => pack.codeRedEventId === event.id
      );
      return { ...event, packs: eventPacks };
    });
  }

  async getCodeRedEventById(id: number): Promise<(CodeRedEvent & { packs: Pack[] }) | null> {
    const event = this.codeRedEvents.get(id);
    if (!event || !event.isActive) return null;
    
    const eventPacks = Array.from(this.packs.values()).filter(
      (pack) => pack.codeRedEventId === id
    );

    return { ...event, packs: eventPacks };
  }

  async getCodeRedEventsByUserId(userId: string, userType: 'runner' | 'clinician'): Promise<(CodeRedEvent & { packs: Pack[] })[]> {
    const activeEvents = await this.getActiveCodeRedEvents();
    return activeEvents.filter(event => {
      if (userType === 'runner') {
        return event.assignedRunnerId === userId;
      } else if (userType === 'clinician') {
        return event.assignedClinicianId === userId;
      }
      return false;
    });
  }

  async assignUserToCodeRed(codeRedId: number, userId: string, userType: 'runner' | 'clinician'): Promise<void> {
    const event = this.codeRedEvents.get(codeRedId);
    if (!event) return;

    const updatedEvent: CodeRedEvent = {
      ...event,
      assignedRunnerId: userType === 'runner' ? userId : event.assignedRunnerId,
      assignedClinicianId: userType === 'clinician' ? userId : event.assignedClinicianId,
    };

    this.codeRedEvents.set(codeRedId, updatedEvent);
  }

  async deactivateCodeRedEvent(id: number): Promise<void> {
    const event = this.codeRedEvents.get(id);
    if (event) {
      const updatedEvent: CodeRedEvent = {
        ...event,
        isActive: false,
        deactivationTime: new Date(),
      };
      this.codeRedEvents.set(id, updatedEvent);
    }
  }

  async deleteCodeRedEvent(id: number): Promise<void> {
    // Delete the Code Red event completely
    this.codeRedEvents.delete(id);
    
    // Also delete all associated packs
    const packsToDelete = Array.from(this.packs.entries())
      .filter(([_, pack]) => pack.codeRedEventId === id)
      .map(([packId, _]) => packId);
    
    packsToDelete.forEach(packId => {
      this.packs.delete(packId);
    });
  }

  async updateCodeRedEventLab(id: number, labType: string): Promise<void> {
    const event = this.codeRedEvents.get(id);
    if (event) {
      const updatedEvent: CodeRedEvent = {
        ...event,
        labType,
      };
      this.codeRedEvents.set(id, updatedEvent);
    }
  }

  async updateCodeRedLocation(data: UpdateCodeRedLocation): Promise<CodeRedEvent> {
    const event = this.codeRedEvents.get(data.codeRedId);
    if (!event) {
      throw new Error(`Code Red event ${data.codeRedId} not found`);
    }

    const timestamp = new Date().toISOString();
    const locationUpdate = `${timestamp}: Moved from "${event.location}" to "${data.newLocation}"`;
    
    const updatedEvent: CodeRedEvent = {
      ...event,
      location: data.newLocation,
      locationHistory: [...event.locationHistory, locationUpdate],
    };
    
    this.codeRedEvents.set(data.codeRedId, updatedEvent);
    return updatedEvent;
  }

  async createPack(insertPack: InsertPack): Promise<Pack> {
    const id = this.currentPackId++;
    const pack: Pack = {
      id,
      codeRedEventId: insertPack.codeRedEventId,
      name: insertPack.name,
      composition: insertPack.composition,
      ffp: insertPack.ffp || 0,
      cryo: insertPack.cryo || 0,
      platelets: insertPack.platelets || 0,
      currentStage: 1,
      estimatedReadyTime: null,
      orderReceivedTime: new Date(),
      readyForCollectionTime: null,
      runnerEnRouteToLabTime: null,
      orderCollectedTime: null,
      runnerEnRouteToClinicalTime: null,
      productArrivedTime: null,
      runnerEstimatedArrivalAtLab: null,
      runnerEstimatedArrivalAtClinical: null,
    };
    this.packs.set(id, pack);
    return pack;
  }

  async getPacksByCodeRedEventId(eventId: number): Promise<Pack[]> {
    return Array.from(this.packs.values()).filter(
      (pack) => pack.codeRedEventId === eventId
    );
  }

  async updatePackStage(data: UpdatePackStage): Promise<Pack> {
    const pack = this.packs.get(data.packId);
    if (!pack) {
      throw new Error(`Pack with id ${data.packId} not found`);
    }

    const now = new Date();
    const updatedPack: Pack = { ...pack, currentStage: data.stage };

    // Update the appropriate timestamp based on stage
    switch (data.stage) {
      case 1:
        updatedPack.orderReceivedTime = now;
        break;
      case 2:
        updatedPack.readyForCollectionTime = now;
        break;
      case 3:
        updatedPack.runnerEnRouteToLabTime = now;
        break;
      case 4:
        updatedPack.orderCollectedTime = now;
        break;
      case 5:
        updatedPack.runnerEnRouteToClinicalTime = now;
        break;
      case 6:
        updatedPack.productArrivedTime = now;
        break;
    }

    this.packs.set(data.packId, updatedPack);
    return updatedPack;
  }

  async updatePackEstimate(data: UpdatePackEstimate): Promise<Pack> {
    const pack = this.packs.get(data.packId);
    if (!pack) {
      throw new Error(`Pack with id ${data.packId} not found`);
    }

    let estimatedReadyTime: Date | null = null;
    if (data.estimatedMinutes !== null) {
      estimatedReadyTime = new Date();
      estimatedReadyTime.setMinutes(estimatedReadyTime.getMinutes() + data.estimatedMinutes);
    }

    const updatedPack: Pack = { 
      ...pack, 
      estimatedReadyTime 
    };

    this.packs.set(data.packId, updatedPack);
    return updatedPack;
  }

  async getPackById(id: number): Promise<Pack | undefined> {
    return this.packs.get(id);
  }

  async deletePack(id: number): Promise<void> {
    this.packs.delete(id);
  }

  async updatePackArrivalEstimates(packId: number, labEstimate?: Date, clinicalEstimate?: Date): Promise<Pack> {
    const pack = this.packs.get(packId);
    if (!pack) throw new Error(`Pack with id ${packId} not found`);

    const updatedPack: Pack = { 
      ...pack, 
      runnerEstimatedArrivalAtLab: labEstimate || pack.runnerEstimatedArrivalAtLab,
      runnerEstimatedArrivalAtClinical: clinicalEstimate || pack.runnerEstimatedArrivalAtClinical
    };
    this.packs.set(packId, updatedPack);
    return updatedPack;
  }

  async updateUserLocation(data: UpdateLocation): Promise<UserLocation> {
    const existingLocation = this.userLocations.get(data.userId);
    const id = existingLocation?.id || this.currentLocationId++;
    
    const location: UserLocation = {
      id,
      userId: data.userId,
      userType: data.userType,
      latitude: data.latitude,
      longitude: data.longitude,
      accuracy: data.accuracy || null,
      lastUpdated: new Date(),
      isActive: true,
    };
    
    this.userLocations.set(data.userId, location);
    return location;
  }

  async getUserLocation(userId: string): Promise<UserLocation | null> {
    return this.userLocations.get(userId) || null;
  }

  async getAllActiveUserLocations(): Promise<UserLocation[]> {
    return Array.from(this.userLocations.values()).filter(loc => loc.isActive);
  }

  async calculateArrivalEstimate(fromUserId: string, toLocation: { lat: string, lng: string }): Promise<number | null> {
    const userLocation = this.userLocations.get(fromUserId);
    if (!userLocation) return null;

    // Calculate distance using Haversine formula
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(parseFloat(toLocation.lat) - parseFloat(userLocation.latitude));
    const dLon = this.toRadians(parseFloat(toLocation.lng) - parseFloat(userLocation.longitude));
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(parseFloat(userLocation.latitude))) * 
              Math.cos(this.toRadians(parseFloat(toLocation.lat))) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers

    // Estimate travel time: assume average walking speed of 5 km/h in hospital
    const estimatedMinutes = Math.round((distance / 5) * 60);
    
    return estimatedMinutes;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

// Database Storage Implementation
export class DatabaseStorage implements IStorage {
  private db = db;

  async createCodeRedEvent(insertEvent: InsertCodeRedEvent): Promise<CodeRedEvent> {
    const db = this.db;
    const [event] = await db
      .insert(codeRedEvents)
      .values({
        ...insertEvent,
        originalLocation: insertEvent.location,
        locationHistory: [],
      })
      .returning();
    return event;
  }

  async getActiveCodeRedEvents(): Promise<(CodeRedEvent & { packs: Pack[] })[]> {
    const db = this.db;
    const events = await db
      .select()
      .from(codeRedEvents)
      .where(eq(codeRedEvents.isActive, true));
    
    const result = [];
    for (const event of events) {
      const eventPacks = await db
        .select()
        .from(packs)
        .where(eq(packs.codeRedEventId, event.id));
      result.push({ ...event, packs: eventPacks });
    }
    return result;
  }

  async getActiveCodeRedEvent(): Promise<(CodeRedEvent & { packs: Pack[] }) | null> {
    const db = this.db;
    const [event] = await db
      .select()
      .from(codeRedEvents)
      .where(eq(codeRedEvents.isActive, true))
      .limit(1);
    
    if (!event) return null;

    const eventPacks = await db
      .select()
      .from(packs)
      .where(eq(packs.codeRedEventId, event.id));

    return { ...event, packs: eventPacks };
  }

  async getAllCodeRedEventsForAudit(): Promise<(CodeRedEvent & { packs: Pack[] })[]> {
    const db = this.db;
    const events = await db
      .select()
      .from(codeRedEvents)
      .orderBy(codeRedEvents.activationTime); // Most recent first
    
    const result = [];
    for (const event of events) {
      const eventPacks = await db
        .select()
        .from(packs)
        .where(eq(packs.codeRedEventId, event.id));
      result.push({ ...event, packs: eventPacks });
    }
    return result.reverse(); // Most recent first
  }

  async getCodeRedEventById(id: number): Promise<(CodeRedEvent & { packs: Pack[] }) | null> {
    const db = this.db;
    const [event] = await db
      .select()
      .from(codeRedEvents)
      .where(and(eq(codeRedEvents.id, id), eq(codeRedEvents.isActive, true)));
    
    if (!event) return null;
    
    const eventPacks = await db
      .select()
      .from(packs)
      .where(eq(packs.codeRedEventId, id));

    return { ...event, packs: eventPacks };
  }

  async getCodeRedEventsByUserId(userId: string, userType: 'runner' | 'clinician'): Promise<(CodeRedEvent & { packs: Pack[] })[]> {
    const db = this.db;
    const condition = userType === 'runner' 
      ? eq(codeRedEvents.assignedRunnerId, userId)
      : eq(codeRedEvents.assignedClinicianId, userId);
    
    const events = await db
      .select()
      .from(codeRedEvents)
      .where(and(condition, eq(codeRedEvents.isActive, true)));
    
    const result = [];
    for (const event of events) {
      const eventPacks = await db
        .select()
        .from(packs)
        .where(eq(packs.codeRedEventId, event.id));
      result.push({ ...event, packs: eventPacks });
    }
    return result;
  }

  async assignUserToCodeRed(codeRedId: number, userId: string, userType: 'runner' | 'clinician'): Promise<void> {
    const db = this.db;
    const updateData = userType === 'runner' 
      ? { assignedRunnerId: userId }
      : { assignedClinicianId: userId };
    
    await db
      .update(codeRedEvents)
      .set(updateData)
      .where(eq(codeRedEvents.id, codeRedId));
  }

  async deactivateCodeRedEvent(id: number): Promise<void> {
    const db = this.db;
    await db
      .update(codeRedEvents)
      .set({ 
        isActive: false, 
        deactivationTime: new Date() 
      })
      .where(eq(codeRedEvents.id, id));
  }

  async deleteCodeRedEvent(id: number): Promise<void> {
    const db = this.db;
    // Delete associated packs first
    await db.delete(packs).where(eq(packs.codeRedEventId, id));
    // Delete the Code Red event
    await db.delete(codeRedEvents).where(eq(codeRedEvents.id, id));
  }

  async updateCodeRedEventLab(id: number, labType: string): Promise<void> {
    const db = this.db;
    await db
      .update(codeRedEvents)
      .set({ labType })
      .where(eq(codeRedEvents.id, id));
  }

  async updateCodeRedLocation(data: UpdateCodeRedLocation): Promise<CodeRedEvent> {
    const db = this.db;
    const [event] = await db
      .select()
      .from(codeRedEvents)
      .where(eq(codeRedEvents.id, data.codeRedId));
    
    if (!event) {
      throw new Error(`Code Red event ${data.codeRedId} not found`);
    }

    const timestamp = new Date().toISOString();
    const locationUpdate = `${timestamp}: Moved from "${event.location}" to "${data.newLocation}"`;
    
    const [updatedEvent] = await db
      .update(codeRedEvents)
      .set({
        location: data.newLocation,
        locationHistory: [...event.locationHistory, locationUpdate],
      })
      .where(eq(codeRedEvents.id, data.codeRedId))
      .returning();
    
    return updatedEvent;
  }

  async createPack(insertPack: InsertPack): Promise<Pack> {
    const db = this.db;
    const [pack] = await db
      .insert(packs)
      .values({
        ...insertPack,
        currentStage: 1,
        orderReceivedTime: new Date(),
      })
      .returning();
    return pack;
  }

  async getPacksByCodeRedEventId(eventId: number): Promise<Pack[]> {
    const db = this.db;
    return await db
      .select()
      .from(packs)
      .where(eq(packs.codeRedEventId, eventId));
  }

  async updatePackStage(data: UpdatePackStage): Promise<Pack> {
    const db = this.db;
    const now = new Date();
    const updateData: any = { currentStage: data.stage };

    // Update the appropriate timestamp based on stage
    switch (data.stage) {
      case 1:
        updateData.orderReceivedTime = now;
        break;
      case 2:
        updateData.readyForCollectionTime = now;
        break;
      case 3:
        updateData.runnerEnRouteToLabTime = now;
        break;
      case 4:
        updateData.orderCollectedTime = now;
        break;
      case 5:
        updateData.runnerEnRouteToClinicalTime = now;
        break;
      case 6:
        updateData.productArrivedTime = now;
        break;
    }

    const [updatedPack] = await db
      .update(packs)
      .set(updateData)
      .where(eq(packs.id, data.packId))
      .returning();
    
    return updatedPack;
  }

  async updatePackEstimate(data: UpdatePackEstimate): Promise<Pack> {
    const db = this.db;
    let estimatedReadyTime: Date | null = null;
    if (data.estimatedMinutes !== null) {
      estimatedReadyTime = new Date();
      estimatedReadyTime.setMinutes(estimatedReadyTime.getMinutes() + data.estimatedMinutes);
    }

    const [updatedPack] = await db
      .update(packs)
      .set({ estimatedReadyTime })
      .where(eq(packs.id, data.packId))
      .returning();
    
    return updatedPack;
  }

  async getPackById(id: number): Promise<Pack | undefined> {
    const db = this.db;
    const [pack] = await db
      .select()
      .from(packs)
      .where(eq(packs.id, id));
    return pack || undefined;
  }

  async deletePack(id: number): Promise<void> {
    const db = this.db;
    await db.delete(packs).where(eq(packs.id, id));
  }

  async updatePackArrivalEstimates(packId: number, labEstimate?: Date, clinicalEstimate?: Date): Promise<Pack> {
    const db = this.db;
    const updateData: any = {};
    if (labEstimate) updateData.runnerEstimatedArrivalAtLab = labEstimate;
    if (clinicalEstimate) updateData.runnerEstimatedArrivalAtClinical = clinicalEstimate;

    const [updatedPack] = await db
      .update(packs)
      .set(updateData)
      .where(eq(packs.id, packId))
      .returning();
    
    return updatedPack;
  }

  async updateUserLocation(data: UpdateLocation): Promise<UserLocation> {
    const db = this.db;
    const [existingLocation] = await db
      .select()
      .from(userLocations)
      .where(eq(userLocations.userId, data.userId));

    if (existingLocation) {
      const [updatedLocation] = await db
        .update(userLocations)
        .set({
          userType: data.userType,
          latitude: data.latitude,
          longitude: data.longitude,
          accuracy: data.accuracy || null,
          lastUpdated: new Date(),
          isActive: true,
        })
        .where(eq(userLocations.userId, data.userId))
        .returning();
      return updatedLocation;
    } else {
      const [newLocation] = await db
        .insert(userLocations)
        .values({
          userId: data.userId,
          userType: data.userType,
          latitude: data.latitude,
          longitude: data.longitude,
          accuracy: data.accuracy || null,
          lastUpdated: new Date(),
          isActive: true,
        })
        .returning();
      return newLocation;
    }
  }

  async getUserLocation(userId: string): Promise<UserLocation | null> {
    const db = this.db;
    const [location] = await db
      .select()
      .from(userLocations)
      .where(eq(userLocations.userId, userId));
    return location || null;
  }

  async getAllActiveUserLocations(): Promise<UserLocation[]> {
    const db = this.db;
    return await db
      .select()
      .from(userLocations)
      .where(eq(userLocations.isActive, true));
  }

  async calculateArrivalEstimate(fromUserId: string, toLocation: { lat: string, lng: string }): Promise<number | null> {
    const userLocation = await this.getUserLocation(fromUserId);
    if (!userLocation) return null;

    // Calculate distance using Haversine formula
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(parseFloat(toLocation.lat) - parseFloat(userLocation.latitude));
    const dLon = this.toRadians(parseFloat(toLocation.lng) - parseFloat(userLocation.longitude));
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(parseFloat(userLocation.latitude))) * 
              Math.cos(this.toRadians(parseFloat(toLocation.lat))) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers

    // Estimate travel time: assume average walking speed of 5 km/h in hospital
    const estimatedMinutes = Math.round((distance / 5) * 60);
    
    return estimatedMinutes;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

// Auto-detect storage based on environment
export const storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();
