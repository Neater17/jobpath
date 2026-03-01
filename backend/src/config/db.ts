import mongoose from "mongoose";
import dns from "node:dns";

function maskMongoUri(uri: string) {
  return uri.replace(/\/\/([^:@/]+):([^@/]+)@/, "//$1:***@");
}

export default async function connectDB() {
  try {
    const uri = process.env.MONGO_CONNECTION_STRING ?? process.env.MONGO_URI;
    if (!uri) throw new Error("Missing MongoDB connection string");

    // Optional DNS override for restrictive environments. Do not force a public DNS by default.
    const customDns = process.env.MONGO_DNS_SERVER?.trim();
    if (customDns) {
      dns.setServers([customDns]);
      console.log(`MongoDB DNS override enabled: ${customDns}`);
    }

    const options: mongoose.ConnectOptions = {
      dbName: "jobpath",
      serverSelectionTimeoutMS: 10000, // fail fast if cannot connect
    };

    await mongoose.connect(uri, options);

    console.log(`MongoDB connected ✅ to ${options.dbName}`);
  } catch (error) {
    const uri = process.env.MONGO_CONNECTION_STRING ?? process.env.MONGO_URI ?? "<missing>";
    const code =
      typeof error === "object" && error && "code" in error
        ? String((error as { code?: unknown }).code ?? "")
        : "";

    console.error("MongoDB connection failed:", error);
    console.error("MongoDB URI used:", maskMongoUri(uri));
    if (code === "ECONNREFUSED" || code === "ENOTFOUND") {
      console.error(
        "Hint: Atlas SRV lookup failed. Check internet access/DNS and verify your cluster host is correct."
      );
    }
    process.exit(1);
  }
}
