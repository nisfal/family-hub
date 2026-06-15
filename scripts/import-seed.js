const { createSeedData } = require("../lib/seed");

async function main() {
  if (!process.env.MONGODB_URI) {
    console.log(JSON.stringify(createSeedData(), null, 2));
    return;
  }
  const { MongoClient } = require("mongodb");
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "family_hub");
  const seed = createSeedData();
  await Promise.all(["families", "members", "relationships", "events"].map((name) => db.collection(name).deleteMany({})));
  await db.collection("families").insertMany(seed.families);
  await db.collection("members").insertMany(seed.members);
  await db.collection("relationships").insertMany(seed.relationships);
  await db.collection("events").insertMany(seed.events);
  await client.close();
  console.log(`Seed selesai: ${seed.members.length} anggota, ${seed.relationships.length} relasi.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
