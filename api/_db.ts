import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB || "homeconnect";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getDb(): Promise<Db> {
    if (db) return db;
    client = new MongoClient(uri, { maxPoolSize: 5 });
    await client.connect();
    db = client.db(dbName);
    return db;
}
