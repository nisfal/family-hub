const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const { createStore } = require("./lib/store");

const port = Number(process.env.PORT || 3000);
const publicDir = path.join(__dirname, "public");
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function sendJson(response, status, data) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(data));
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function enrichMembers(members) {
  const byId = new Map(members.map((member) => [member.id, member]));
  return members.map((member) => ({
    ...member,
    parents: member.parentIds.map((id) => byId.get(id)).filter(Boolean).map((item) => ({ id: item.id, fullName: item.fullName })),
    spouse: byId.get(member.spouseId) ? { id: member.spouseId, fullName: byId.get(member.spouseId).fullName } : null,
    children: member.childIds.map((id) => byId.get(id)).filter(Boolean).map((item) => ({ id: item.id, fullName: item.fullName }))
  }));
}

function buildTree(members) {
  const byId = new Map(members.map((member) => [member.id, member]));
  const levels = new Map();
  members.forEach((member) => {
    const generation = member.generation || 1;
    if (!levels.has(generation)) levels.set(generation, []);
    levels.get(generation).push(member);
  });

  return [...levels.entries()]
    .sort(([a], [b]) => a - b)
    .map(([generation, items]) => ({
      generation,
      members: items.map((member) => ({
        id: member.id,
        fullName: member.fullName,
        nickname: member.nickname,
        gender: member.gender,
        role: member.role,
        spouseName: byId.get(member.spouseId)?.fullName || "",
        childIds: member.childIds,
        parentIds: member.parentIds
      }))
    }));
}

async function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const safePath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(publicDir, safePath));
  if (!filePath.startsWith(publicDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  try {
    const content = await fs.readFile(filePath);
    response.writeHead(200, { "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream" });
    response.end(content);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}

async function main() {
  const { store, mode } = await createStore();
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const memberMatch = url.pathname.match(/^\/api\/members\/([^/]+)$/);

      if (url.pathname === "/api/health") {
        sendJson(response, 200, { ok: true, database: mode });
        return;
      }

      if (url.pathname === "/api/family" && request.method === "GET") {
        sendJson(response, 200, await store.getFamily());
        return;
      }

      if (url.pathname === "/api/members" && request.method === "GET") {
        sendJson(response, 200, enrichMembers(await store.listMembers()));
        return;
      }

      if (url.pathname === "/api/members" && request.method === "POST") {
        sendJson(response, 201, await store.createMember(await readBody(request)));
        return;
      }

      if (memberMatch && request.method === "GET") {
        const member = await store.getMember(memberMatch[1]);
        sendJson(response, member ? 200 : 404, member || { error: "Member tidak ditemukan" });
        return;
      }

      if (memberMatch && request.method === "PUT") {
        const member = await store.updateMember(memberMatch[1], await readBody(request));
        sendJson(response, member ? 200 : 404, member || { error: "Member tidak ditemukan" });
        return;
      }

      if (memberMatch && request.method === "DELETE") {
        const deleted = await store.deleteMember(memberMatch[1]);
        sendJson(response, deleted ? 200 : 404, { deleted });
        return;
      }

      if (url.pathname === "/api/events" && request.method === "GET") {
        sendJson(response, 200, await store.listEvents());
        return;
      }

      if (url.pathname === "/api/events" && request.method === "POST") {
        sendJson(response, 201, await store.createEvent(await readBody(request)));
        return;
      }

      if (url.pathname === "/api/tree" && request.method === "GET") {
        sendJson(response, 200, buildTree(await store.listMembers()));
        return;
      }

      await serveStatic(request, response);
    } catch (error) {
      sendJson(response, 500, { error: error.message });
    }
  });

  server.listen(port, () => {
    console.log(`Family Hub berjalan di http://localhost:${port}`);
    console.log(`Database mode: ${mode}`);
  });
}

main();
