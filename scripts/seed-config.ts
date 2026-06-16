import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import mongoose from "mongoose";
import { Config } from "../dashboard/lib/models/Config";
import { defaultConfigValues } from "../dashboard/lib/defaultConfig";

loadEnv({ path: resolve(__dirname, "../dashboard/.env.local") });
loadEnv({ path: resolve(__dirname, "../dashboard/.env") });
loadEnv({ path: resolve(__dirname, "../pipeline/.env") });
loadEnv({ path: resolve(__dirname, "../.env") });

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error(
      "MONGODB_URI is required. Set it in dashboard/.env or pipeline/.env",
    );
    process.exit(1);
  }

  const dbName = process.env.MONGODB_DB ?? "estra";
  await mongoose.connect(uri, { dbName });

  const existing = await Config.findOne();
  if (existing) {
    console.log(`Config already exists in database "${dbName}" — skipping seed.`);
    await mongoose.disconnect();
    return;
  }

  await Config.create({
    ...defaultConfigValues,
    updatedAt: new Date(),
  });

  console.log(`Default config seeded successfully in database "${dbName}".`);
  await mongoose.disconnect();
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
