import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const codeRedEvents = pgTable("code_red_events", {
  id: serial("id").primaryKey(),
  activationTime: timestamp("activation_time").notNull(),
  labType: text("lab_type").notNull(), // "Main Lab" or "Satellite Lab"
  location: text("location").notNull(), // Current location
  patientMRN: text("patient_mrn").notNull(), // Patient Medical Record Number
  originalLocation: text("original_location").notNull(), // Original activation location
  locationHistory: text("location_history").array().notNull().default([]), // Array of location updates with timestamps
  assignedRunnerId: text("assigned_runner_id"), // Runner assigned to this Code Red
  assignedClinicianId: text("assigned_clinician_id"), // Clinician assigned to this Code Red
  isActive: boolean("is_active").notNull().default(true),
  deactivationTime: timestamp("deactivation_time"),
});

export const packs = pgTable("packs", {
  id: serial("id").primaryKey(),
  codeRedEventId: integer("code_red_event_id").notNull(),
  name: text("name").notNull(), // "Pack A", "Pack B", etc.
  composition: text("composition").notNull(), // "6 FFP, 2 Cryo, 1 Platelets"
  ffp: integer("ffp").notNull().default(0),
  cryo: integer("cryo").notNull().default(0),
  platelets: integer("platelets").notNull().default(0),
  currentStage: integer("current_stage").notNull().default(1), // 1-6
  estimatedReadyTime: timestamp("estimated_ready_time"), // Lab estimate for when pack will be ready
  orderReceivedTime: timestamp("order_received_time"),
  readyForCollectionTime: timestamp("ready_for_collection_time"),
  runnerEnRouteToLabTime: timestamp("runner_en_route_to_lab_time"),
  orderCollectedTime: timestamp("order_collected_time"),
  runnerEnRouteToClinicalTime: timestamp("runner_en_route_to_clinical_time"),
  productArrivedTime: timestamp("product_arrived_time"),
  runnerEstimatedArrivalAtLab: timestamp("runner_estimated_arrival_at_lab"), // Estimated arrival time at lab
  runnerEstimatedArrivalAtClinical: timestamp("runner_estimated_arrival_at_clinical"), // Estimated arrival time at clinical area
});

// Location tracking for real-time estimates
export const userLocations = pgTable("user_locations", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(), // Unique identifier for user (runner/lab/clinician)
  userType: text("user_type").notNull(), // "runner", "lab", "clinician"
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  accuracy: integer("accuracy"), // GPS accuracy in meters
  lastUpdated: timestamp("last_updated").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertCodeRedEventSchema = z.object({
  activationTime: z.string().transform((val) => new Date(val)),
  labType: z.string(),
  location: z.string().min(1, "Location is required"),
  patientMRN: z.string().min(1, "Patient MRN is required"),
  assignedRunnerId: z.string().optional(),
  assignedClinicianId: z.string().optional(),
});

export const updateCodeRedLocationSchema = z.object({
  codeRedId: z.number(),
  newLocation: z.string().min(1, "Location is required"),
});

export const insertPackSchema = createInsertSchema(packs).omit({
  id: true,
  currentStage: true, // This will be set automatically to 1
  estimatedReadyTime: true,
  orderReceivedTime: true,
  readyForCollectionTime: true,
  runnerEnRouteToLabTime: true,
  orderCollectedTime: true,
  runnerEnRouteToClinicalTime: true,
  productArrivedTime: true,
});

export const updatePackStageSchema = z.object({
  packId: z.number(),
  stage: z.number().min(1).max(6),
});

export const updatePackEstimateSchema = z.object({
  packId: z.number(),
  estimatedMinutes: z.number().min(1).max(120).nullable(), // 1-120 minutes or null to clear
});

export const codeRedSelectionSchema = z.object({
  codeRedEventId: z.number().int().positive(),
});

export const updateLocationSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  userType: z.enum(["runner", "lab", "clinician"]),
  latitude: z.string(),
  longitude: z.string(),
  accuracy: z.number().optional(),
});

export const insertUserLocationSchema = createInsertSchema(userLocations).omit({
  id: true,
  lastUpdated: true,
  isActive: true,
});

export type InsertCodeRedEvent = z.infer<typeof insertCodeRedEventSchema>;
export type CodeRedEvent = typeof codeRedEvents.$inferSelect;
export type InsertPack = z.infer<typeof insertPackSchema>;
export type Pack = typeof packs.$inferSelect;
export type UpdatePackStage = z.infer<typeof updatePackStageSchema>;
export type UpdatePackEstimate = z.infer<typeof updatePackEstimateSchema>;
export type UpdateCodeRedLocation = z.infer<typeof updateCodeRedLocationSchema>;
export type CodeRedSelection = z.infer<typeof codeRedSelectionSchema>;
export type UpdateLocation = z.infer<typeof updateLocationSchema>;
export type UserLocation = typeof userLocations.$inferSelect;
export type InsertUserLocation = z.infer<typeof insertUserLocationSchema>;
