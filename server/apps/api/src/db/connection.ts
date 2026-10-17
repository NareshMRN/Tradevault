import mongoose from "mongoose";
import { env } from "../config/env";

// Disable Mongoose command buffering so queries do not hang for 10000ms when MongoDB is disconnected
mongoose.set("bufferCommands", false);
mongoose.set("bufferTimeoutMS", 2000);

let isConnected = false;

export async function connectDB(): Promise<typeof mongoose> {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 4000,
    });
    isConnected = true;
    console.log(`[MongoDB] Successfully connected to database: ${conn.connection.name}`);
    return conn;
  } catch (error: any) {
    isConnected = false;
    console.warn(`\n===================================================================================`);
    console.warn(`⚠️  [MongoDB Connection Offline / Standalone Mode]`);
    console.warn(`Could not connect to MongoDB Atlas (${error.message}).`);
    if (error.message?.includes("IP that isn't whitelisted") || error.message?.includes("buffering timed out") || error.message?.includes("cluster")) {
      console.warn(`Reason: Your current IP address is not whitelisted in MongoDB Atlas.`);
      console.warn(`To enable persistent cloud MongoDB storage:`);
      console.warn(`  1. Log in to https://cloud.mongodb.com`);
      console.warn(`  2. Navigate to "Security" -> "Network Access"`);
      console.warn(`  3. Click "Add IP Address" and select "Allow Access From Anywhere" (0.0.0.0/0)`);
    }
    console.warn(`Confluence is running in Resilient In-Memory Mode: Login, Analysis, and Dashboard are FULLY functional!`);
    console.warn(`===================================================================================\n`);
    return mongoose;
  }
}

export async function disconnectDB(): Promise<void> {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
  }
}
