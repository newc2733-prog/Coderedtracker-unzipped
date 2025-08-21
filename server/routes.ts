import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.ts"; // <-- FIX APPLIED
import { 
  insertPackSchema, 
  updatePackStageSchema,
  updatePackEstimateSchema,
  updateCodeRedLocationSchema,
  updateLocationSchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get active Code Red event
  app.get("/api/code-red/active", async (req, res) => {
    try {
      const activeEvent = await storage.getActiveCodeRedEvent();
      res.json(activeEvent);
    } catch (error) {
      res.status(500).json({ message: "Failed to get active Code Red event" });
    }
  });

  // Get all active Code Red events
  app.get("/api/code-red/all-active", async (req, res) => {
    try {
      const activeEvents = await storage.getActiveCodeRedEvents();
      res.json(activeEvents);
    } catch (error) {
      res.status(500).json({ message: "Failed to get active Code Red events" });
    }
  });

  // Get all Code Red events for audit trail (both active and completed)
  app.get("/api/code-red/audit/all", async (req, res) => {
    try {
      const events = await storage.getAllCodeRedEventsForAudit();
      res.json(events);
    } catch (error) {
      console.error("Error fetching audit data:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get Code Red events by user ID and type
  app.get("/api/code-red/user/:userId/:userType", async (req, res) => {
    try {
      const { userId, userType } = req.params;
      
      if (userType !== 'runner' && userType !== 'clinician') {
        return res.status(400).json({ error: "Invalid user type. Must be 'runner' or 'clinician'" });
      }

      const userEvents = await storage.getCodeRedEventsByUserId(userId, userType as 'runner' | 'clinician');
      res.json(userEvents);
    } catch (error) {
      console.error("Error fetching user Code Red events:", error);
      res.status(500).json({ error: "Failed to fetch user Code Red events" });
    }
  });

  // Assign user to Code Red event
  app.post("/api/code-red/:id/assign", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { userId, userType } = req.body;

      if (!userId || !userType) {
        return res.status(400).json({ error: "Missing userId or userType" });
      }

      if (userType !== 'runner' && userType !== 'clinician') {
        return res.status(400).json({ error: "Invalid user type. Must be 'runner' or 'clinician'" });
      }

      await storage.assignUserToCodeRed(id, userId, userType);
      const updatedEvent = await storage.getCodeRedEventById(id);
      
      res.json(updatedEvent);
    } catch (error) {
      console.error("Error assigning user to Code Red:", error);
      res.status(500).json({ error: "Failed to assign user to Code Red" });
    }
  });

  // Get specific Code Red event by ID
  app.get("/api/code-red/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid Code Red ID" });
      }
      
      const codeRed = await storage.getCodeRedEventById(id);
      if (!codeRed) {
        return res.status(404).json({ error: "Code Red not found or inactive" });
      }
      
      res.json(codeRed);
    } catch (error) {
      res.status(500).json({ message: "Failed to get Code Red event" });
    }
  });

  // Create new Code Red event
  app.post("/api/code-red", async (req, res) => {
    try {
      // Manual validation and transformation
      const { activationTime, labType, location, patientMRN } = req.body;
      
      if (!activationTime || !labType || !location || !patientMRN) {
        return res.status(400).json({ 
          message: "Missing required fields: activationTime, labType, location, and patientMRN" 
        });
      }

      const transformedData = {
        activationTime: new Date(activationTime),
        labType,
        location,
        patientMRN,
      };
      
      const event = await storage.createCodeRedEvent(transformedData);
      res.json(event);
    } catch (error) {
      console.error("Code Red creation error:", error);
      res.status(500).json({ message: "Failed to create Code Red event" });
    }
  });

  // Deactivate Code Red event
  app.post("/api/code-red/:id/deactivate", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deactivateCodeRedEvent(id);
      res.json({ message: "Code Red event deactivated" });
    } catch (error) {
      res.status(500).json({ message: "Failed to deactivate Code Red event" });
    }
  });

  // Delete Code Red event (for events created in error)
  app.delete("/api/code-red/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCodeRedEvent(id);
      res.json({ message: "Code Red event deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete Code Red event" });
    }
  });

  // Update Code Red lab
  app.patch("/api/code-red/:id/lab", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { labType } = req.body;
      await storage.updateCodeRedEventLab(id, labType);
      res.json({ message: "Lab updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update lab" });
    }
  });

  // Update Code Red location
  app.patch("/api/code-red/location", async (req, res) => {
    try {
      const validationResult = updateCodeRedLocationSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: validationResult.error.errors 
        });
      }

      const updatedEvent = await storage.updateCodeRedLocation(validationResult.data);
      res.json(updatedEvent);
    } catch (error) {
      console.error("Code Red location update error:", error);
      res.status(500).json({ message: "Failed to update Code Red location" });
    }
  });

  // Create new pack
  app.post("/api/packs", async (req, res) => {
    try {
      const validatedData = insertPackSchema.parse(req.body);
      const pack = await storage.createPack(validatedData);
      res.json(pack);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create pack" });
      }
    }
  });

  // Update pack stage
  app.patch("/api/packs/stage", async (req, res) => {
    try {
      const validatedData = updatePackStageSchema.parse(req.body);
      const pack = await storage.updatePackStage(validatedData);
      res.json(pack);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update pack stage" });
      }
    }
  });

  // Update pack estimate
  app.patch("/api/packs/estimate", async (req, res) => {
    try {
      const validatedData = updatePackEstimateSchema.parse(req.body);
      const pack = await storage.updatePackEstimate(validatedData);
      res.json(pack);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update pack estimate" });
      }
    }
  });

  // Delete pack (for packs created in error)
  app.delete("/api/packs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePack(id);
      res.json({ message: "Pack deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete pack" });
    }
  });

  // Location tracking endpoints
  app.post("/api/location/update", async (req, res) => {
    try {
      const validatedData = updateLocationSchema.parse(req.body);
      const location = await storage.updateUserLocation(validatedData);
      res.json(location);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid location data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update location" });
      }
    }
  });

  app.get("/api/location/:userId", async (req, res) => {
    try {
      const userId = req.params.userId;
      const location = await storage.getUserLocation(userId);
      res.json(location);
    } catch (error) {
      res.status(500).json({ message: "Failed to get location" });
    }
  });

  app.get("/api/location/estimate/:fromUserId", async (req, res) => {
    try {
      const fromUserId = req.params.fromUserId;
      const { lat, lng } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({ message: "Latitude and longitude are required" });
      }

      const estimate = await storage.calculateArrivalEstimate(fromUserId, { 
        lat: lat as string, 
        lng: lng as string 
      });
      res.json({ estimatedMinutes: estimate });
    } catch (error) {
      res.status(500).json({ message: "Failed to calculate arrival estimate" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
