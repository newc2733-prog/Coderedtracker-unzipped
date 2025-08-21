import { db } from "./db.ts"; // <-- FIX APPLIED
import { 
  codeRed, 
  packs, 
  locations,
  insertCodeRedSchema, 
  insertPackSchema,
  updatePackStageSchema,
  updatePackEstimateSchema,
  updateCodeRedLocationSchema,
  updateLocationSchema
} from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

const fromUserLocation = alias(locations, "fromUserLocation");

export const storage = {
  // Get all Code Red events for the audit trail
  async getAllCodeRedEventsForAudit() {
    return await db.select().from(codeRed).orderBy(codeRed.activationTime);
  },

  // Get active Code Red event
  async getActiveCodeRedEvent() {
    const activeEvents = await db.select().from(codeRed).where(eq(codeRed.active, true)).limit(1);
    return activeEvents.length > 0 ? activeEvents[0] : null;
  },

  // Get all active Code Red events
  async getActiveCodeRedEvents() {
    return await db.select().from(codeRed).where(eq(codeRed.active, true));
  },

  // Get specific Code Red event by ID
  async getCodeRedEventById(id: number) {
    const event = await db.select().from(codeRed).where(eq(codeRed.id, id));
    return event.length > 0 ? event[0] : null;
  },

  // Get Code Red events assigned to a specific user
  async getCodeRedEventsByUserId(userId: string, userType: 'runner' | 'clinician') {
    const column = userType === 'runner' ? codeRed.runnerId : codeRed.clinicianId;
    return await db.select().from(codeRed).where(and(eq(column, userId), eq(codeRed.active, true)));
  },
  
  // Create new Code Red event
  async createCodeRedEvent(event: Omit<z.infer<typeof insertCodeRedSchema>, 'active' | 'completedTime'>) {
    const newEvent = await db.insert(codeRed).values(event).returning();
    return newEvent[0];
  },

  // Deactivate a Code Red event
  async deactivateCodeRedEvent(id: number) {
    await db.update(codeRed)
      .set({ active: false, completedTime: new Date() })
      .where(eq(codeRed.id, id));
  },

  // Delete a Code Red event
  async deleteCodeRedEvent(id: number) {
    await db.delete(packs).where(eq(packs.codeRedId, id));
    await db.delete(codeRed).where(eq(codeRed.id, id));
  },

  // Update Code Red lab type
  async updateCodeRedEventLab(id: number, labType: 'satellite' | 'main') {
    await db.update(codeRed).set({ labType }).where(eq(codeRed.id, id));
  },

  // Update Code Red location
  async updateCodeRedLocation(data: z.infer<typeof updateCodeRedLocationSchema>) {
    const updated = await db
      .update(codeRed)
      .set({ location: data.location })
      .where(eq(codeRed.id, data.id))
      .returning();
    return updated[0];
  },

  // Assign user to Code Red event
  async assignUserToCodeRed(id: number, userId: string, userType: 'runner' | 'clinician') {
    const fieldToUpdate = userType === 'runner' ? { runnerId: userId } : { clinicianId: userId };
    await db.update(codeRed).set(fieldToUpdate).where(eq(codeRed.id, id));
  },

  // Create new pack
  async createPack(pack: z.infer<typeof insertPackSchema>) {
    const newPack = await db.insert(packs).values(pack).returning();
    return newPack[0];
  },

  // Update pack stage
  async updatePackStage(data: z.infer<typeof updatePackStageSchema>) {
    const updated = await db
      .update(packs)
      .set({ stage: data.stage })
      .where(eq(packs.id, data.id))
      .returning();
    return updated[0];
  },

  // Update pack estimate
  async updatePackEstimate(data: z.infer<typeof updatePackEstimateSchema>) {
    const updated = await db
      .update(packs)
      .set({ estimatedTime: new Date(data.estimatedTime) })
      .where(eq(packs.id, data.id))
      .returning();
    return updated[0];
  },

  // Delete pack
  async deletePack(id: number) {
    await db.delete(packs).where(eq(packs.id, id));
  },

  // Update or insert user location
  async updateUserLocation(data: z.infer<typeof updateLocationSchema>) {
    const newLocation = await db.insert(locations)
      .values(data)
      .onConflictDoUpdate({ target: locations.userId, set: data })
      .returning();
    return newLocation[0];
  },

  // Get user location
  async getUserLocation(userId: string) {
    const userLocation = await db.select().from(locations).where(eq(locations.userId, userId));
    return userLocation.length > 0 ? userLocation[0] : null;
  },

  // Calculate arrival estimate (placeholder)
  async calculateArrivalEstimate(fromUserId: string, toCoordinates: { lat: string, lng: string }) {
    // This is a placeholder. In a real app, you would call a service like Google Maps Directions API.
    // For now, we'll return a random number between 5 and 15.
    return Math.floor(Math.random() * 11) + 5;
  }
};
