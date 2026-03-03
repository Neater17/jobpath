import mongoose from "mongoose";
import dns from "node:dns/promises";

export default async function connectDB() {

  try {
    dns.setServers(["1.1.1.1"]);

    // Optional DNS override for restrictive environments. Do not force a public DNS by default.
    const customDns = process.env.MONGO_DNS_SERVER?.trim();
    if (customDns) {
      dns.setServers([customDns]);
      console.log(`MongoDB DNS override enabled: ${customDns}`);
    }


    const uri = process.env.MONGO_CONNECTION_STRING ?? process.env.MONGO_URI;
    if (!uri) throw new Error("Missing MongoDB connection string");

    const options: mongoose.ConnectOptions = {
      dbName: "jobpath",
      serverSelectionTimeoutMS: 10000, // fail fast if cannot connect
    };

    await mongoose.connect(uri, options);

    console.log(`MongoDB connected ✅ to ${options.dbName}`);
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
}