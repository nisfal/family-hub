const fs = require("node:fs");
const path = require("node:path");

const seedPath = path.join(__dirname, "..", "data", "silsilah_keluarga_updated.ndjson");

function oid(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.$oid || null;
}

function getGeneration(member, membersById, memo = new Map(), visiting = new Set()) {
  if (memo.has(member.id)) return memo.get(member.id);
  if (!member.parentIds.length) {
    memo.set(member.id, 1);
    return 1;
  }
  if (visiting.has(member.id)) return 1;
  visiting.add(member.id);
  const parentGenerations = member.parentIds
    .map((id) => membersById.get(id))
    .filter(Boolean)
    .map((parent) => getGeneration(parent, membersById, memo, visiting));
  visiting.delete(member.id);
  const generation = parentGenerations.length ? Math.max(...parentGenerations) + 1 : 1;
  memo.set(member.id, generation);
  return generation;
}

function readSeedMembers() {
  const lines = fs.readFileSync(seedPath, "utf8").split(/\r?\n/).filter(Boolean);
  const rawMembers = lines.map((line) => JSON.parse(line));
  const members = rawMembers.map((item) => ({
    id: oid(item._id),
    familyId: "main-family",
    fullName: item.name,
    nickname: item.name.split(" ")[0],
    gender: item.gender || "unknown",
    role: item.role || "member",
    birthPlace: "",
    birthDate: "",
    deathDate: "",
    photo: "",
    occupation: "",
    address: "",
    isDeceased: false,
    parentIds: (item.parents || []).map(oid).filter(Boolean),
    spouseId: oid(item.spouse),
    childIds: (item.children || []).map(oid).filter(Boolean),
    createdAt: new Date().toISOString()
  }));
  const membersById = new Map(members.map((member) => [member.id, member]));
  members.forEach((member) => {
    member.generation = getGeneration(member, membersById);
  });
  return members;
}

function buildRelationships(members) {
  const relationships = [];
  const seen = new Set();
  const add = (member1Id, member2Id, relationshipType) => {
    if (!member1Id || !member2Id) return;
    const key = `${member1Id}:${member2Id}:${relationshipType}`;
    if (seen.has(key)) return;
    seen.add(key);
    relationships.push({
      id: key,
      familyId: "main-family",
      member1Id,
      member2Id,
      relationshipType
    });
  };

  members.forEach((member) => {
    member.parentIds.forEach((parentId) => add(parentId, member.id, "parent"));
    member.childIds.forEach((childId) => add(member.id, childId, "child"));
    if (member.spouseId) add(member.id, member.spouseId, "spouse");
  });
  return relationships;
}

function defaultEvents() {
  return [
    {
      id: "event-2025-gathering",
      familyId: "main-family",
      title: "Family Gathering",
      description: "Agenda kumpul keluarga besar.",
      eventDate: "2025-12-28",
      location: "Bandung"
    },
    {
      id: "event-2026-reuni",
      familyId: "main-family",
      title: "Reuni Keluarga Besar",
      description: "Rencana reuni dan pembaruan data silsilah.",
      eventDate: "2026-06-15",
      location: "Jakarta"
    }
  ];
}

function createSeedData() {
  const members = readSeedMembers();
  return {
    families: [
      {
        id: "main-family",
        familyName: "Keluarga Besar M. Noer Etek & Abah Acang",
        description: "Pusat informasi silsilah keluarga lintas generasi.",
        logo: "",
        createdAt: new Date().toISOString()
      }
    ],
    members,
    relationships: buildRelationships(members),
    events: defaultEvents(),
    albums: []
  };
}

module.exports = { createSeedData };
