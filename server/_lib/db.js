import { MongoClient } from 'mongodb';
let clientPromise;
export async function database() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is missing');
  clientPromise ??= new MongoClient(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 8000 }).connect().catch(error => { clientPromise = undefined; throw error; });
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB || 'juanher_luci');
}
export async function mongoClient() { await database(); return clientPromise; }
export async function guestsCollection() {
  const collection = (await database()).collection('guests');
  await collection.createIndex({ email: 1 }, { unique: true });
  return collection;
}
