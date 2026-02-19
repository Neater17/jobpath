import mongoose from "mongoose";
import dns from "node:dns/promises";

export default async function connectDB() {

  try {
    // console.log(await dns.getServers());
    // [ '127.0.0.53' ]
    dns.setServers(["1.1.1.1"]);

    const uri = process.env.MONGO_CONNECTION_STRING ?? process.env.MONGO_URI;
    if (!uri) throw new Error("Missing MongoDB connection string");

    const options: mongoose.ConnectOptions = {
      serverSelectionTimeoutMS: 10000, // fail fast if cannot connect
    };

    await mongoose.connect(uri, options);

    console.log("MongoDB connected ✅");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
}

// import mongoose from "mongoose";


