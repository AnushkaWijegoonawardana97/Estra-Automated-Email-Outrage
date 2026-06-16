import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB ?? "estra";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  dbName: string | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? {
  conn: null,
  promise: null,
  dbName: null,
};

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

async function resetConnection() {
  if (cached.conn) {
    await mongoose.disconnect();
  }
  cached.conn = null;
  cached.promise = null;
  cached.dbName = null;
}

export async function connectMongo(): Promise<typeof mongoose> {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined");
  }

  if (cached.conn && cached.dbName !== MONGODB_DB) {
    await resetConnection();
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      dbName: MONGODB_DB,
    });
    cached.dbName = MONGODB_DB;
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
