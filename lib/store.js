const fs = require("node:fs/promises");
const path = require("node:path");
const { createSeedData } = require("./seed");

const localDbPath = path.join(__dirname, "..", "data", "local-db.json");

function publicId(document) {
  if (!document) return document;
  const id = document.id || (document._id && document._id.toString());
  const copy = { ...document, id };
  delete copy._id;
  return copy;
}

class LocalStore {
  constructor() {
    this.data = null;
  }

  async connect() {
    try {
      this.data = JSON.parse(await fs.readFile(localDbPath, "utf8"));
    } catch {
      this.data = createSeedData();
      await this.persist();
    }
    return { mode: "local-json" };
  }

  async persist() {
    await fs.mkdir(path.dirname(localDbPath), { recursive: true });
    await fs.writeFile(localDbPath, JSON.stringify(this.data, null, 2));
  }

  async ensureSeeded() {
    if (!this.data.members.length) {
      this.data = createSeedData();
      await this.persist();
    }
  }

  async getFamily() {
    return this.data.families[0];
  }

  async listMembers() {
    return [...this.data.members].sort((a, b) => a.generation - b.generation || a.fullName.localeCompare(b.fullName));
  }

  async getMember(id) {
    return this.data.members.find((member) => member.id === id) || null;
  }

  async createMember(input) {
    const now = new Date().toISOString();
    const member = {
      id: input.id || `member-${Date.now()}`,
      familyId: "main-family",
      fullName: input.fullName || "Anggota Baru",
      nickname: input.nickname || "",
      gender: input.gender || "unknown",
      role: input.role || "member",
      birthPlace: input.birthPlace || "",
      birthDate: input.birthDate || "",
      deathDate: input.deathDate || "",
      photo: input.photo || "",
      occupation: input.occupation || "",
      address: input.address || "",
      generation: Number(input.generation || 1),
      isDeceased: Boolean(input.isDeceased),
      parentIds: input.parentIds || [],
      spouseId: input.spouseId || "",
      childIds: input.childIds || [],
      createdAt: now
    };
    this.data.members.push(member);
    await this.persist();
    return member;
  }

  async updateMember(id, input) {
    const index = this.data.members.findIndex((member) => member.id === id);
    if (index === -1) return null;
    this.data.members[index] = { ...this.data.members[index], ...input, id };
    await this.persist();
    return this.data.members[index];
  }

  async deleteMember(id) {
    const before = this.data.members.length;
    this.data.members = this.data.members.filter((member) => member.id !== id);
    this.data.members.forEach((member) => {
      member.parentIds = member.parentIds.filter((parentId) => parentId !== id);
      member.childIds = member.childIds.filter((childId) => childId !== id);
      if (member.spouseId === id) member.spouseId = "";
    });
    await this.persist();
    return before !== this.data.members.length;
  }

  async listEvents() {
    return [...this.data.events].sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  }

  async createEvent(input) {
    const event = {
      id: `event-${Date.now()}`,
      familyId: "main-family",
      title: input.title || "Agenda Baru",
      description: input.description || "",
      eventDate: input.eventDate || new Date().toISOString().slice(0, 10),
      location: input.location || ""
    };
    this.data.events.push(event);
    await this.persist();
    return event;
  }
}

class MongoStore {
  constructor(client, dbName) {
    this.client = client;
    this.db = client.db(dbName);
  }

  static async create(uri, dbName) {
    const { MongoClient } = require("mongodb");
    const client = new MongoClient(uri);
    await client.connect();
    return new MongoStore(client, dbName);
  }

  async ensureSeeded() {
    const count = await this.db.collection("members").countDocuments();
    if (count > 0) return;
    const seed = createSeedData();
    await this.db.collection("families").insertMany(seed.families);
    await this.db.collection("members").insertMany(seed.members);
    await this.db.collection("relationships").insertMany(seed.relationships);
    await this.db.collection("events").insertMany(seed.events);
  }

  async getFamily() {
    return publicId(await this.db.collection("families").findOne({ id: "main-family" }));
  }

  async listMembers() {
    const members = await this.db.collection("members").find({}).sort({ generation: 1, fullName: 1 }).toArray();
    return members.map(publicId);
  }

  async getMember(id) {
    return publicId(await this.db.collection("members").findOne({ id }));
  }

  async createMember(input) {
    const member = {
      id: input.id || `member-${Date.now()}`,
      familyId: "main-family",
      fullName: input.fullName || "Anggota Baru",
      nickname: input.nickname || "",
      gender: input.gender || "unknown",
      role: input.role || "member",
      birthPlace: input.birthPlace || "",
      birthDate: input.birthDate || "",
      deathDate: input.deathDate || "",
      photo: input.photo || "",
      occupation: input.occupation || "",
      address: input.address || "",
      generation: Number(input.generation || 1),
      isDeceased: Boolean(input.isDeceased),
      parentIds: input.parentIds || [],
      spouseId: input.spouseId || "",
      childIds: input.childIds || [],
      createdAt: new Date().toISOString()
    };
    await this.db.collection("members").insertOne(member);
    return member;
  }

  async updateMember(id, input) {
    await this.db.collection("members").updateOne({ id }, { $set: { ...input, id } });
    return this.getMember(id);
  }

  async deleteMember(id) {
    const result = await this.db.collection("members").deleteOne({ id });
    await this.db.collection("members").updateMany({}, { $pull: { parentIds: id, childIds: id } });
    await this.db.collection("members").updateMany({ spouseId: id }, { $set: { spouseId: "" } });
    return result.deletedCount > 0;
  }

  async listEvents() {
    return (await this.db.collection("events").find({}).sort({ eventDate: 1 }).toArray()).map(publicId);
  }

  async createEvent(input) {
    const event = {
      id: `event-${Date.now()}`,
      familyId: "main-family",
      title: input.title || "Agenda Baru",
      description: input.description || "",
      eventDate: input.eventDate || new Date().toISOString().slice(0, 10),
      location: input.location || ""
    };
    await this.db.collection("events").insertOne(event);
    return event;
  }
}

async function createStore() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || "family_hub";
  if (uri) {
    try {
      const store = await MongoStore.create(uri, dbName);
      await store.ensureSeeded();
      return { store, mode: "mongodb" };
    } catch (error) {
      console.warn(`MongoDB tidak tersedia, memakai local JSON: ${error.message}`);
    }
  }
  const store = new LocalStore();
  const info = await store.connect();
  await store.ensureSeeded();
  return { store, mode: info.mode };
}

module.exports = { createStore };
