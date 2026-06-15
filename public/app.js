const state = {
  family: null,
  members: [],
  events: [],
  selectedId: null,
  query: ""
};

const api = {
  async get(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Gagal memuat ${path}`);
    return response.json();
  },
  async post(path, body) {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error(`Gagal menyimpan ${path}`);
    return response.json();
  }
};

function byId(id) {
  return state.members.find((member) => member.id === id);
}

function text(value, fallback = "-") {
  return value || fallback;
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function memberMatches(member) {
  const haystack = [member.fullName, member.nickname, member.role, member.gender].join(" ").toLowerCase();
  return haystack.includes(state.query.toLowerCase());
}

function renderStats(health) {
  const generations = new Set(state.members.map((member) => member.generation));
  document.querySelector("#memberCount").textContent = state.members.length;
  document.querySelector("#generationCount").textContent = generations.size;
  document.querySelector("#eventCount").textContent = state.events.length;
  document.querySelector("#dbMode").textContent = health.database;
}

function renderTree() {
  const canvas = document.querySelector("#treeCanvas");
  const groups = new Map();
  state.members.filter(memberMatches).forEach((member) => {
    if (!groups.has(member.generation)) groups.set(member.generation, []);
    groups.get(member.generation).push(member);
  });

  canvas.innerHTML = [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([generation, members]) => `
      <div class="generation">
        <div class="generation-label">Generasi ${generation}</div>
        <div class="generation-members">
          ${members.map((member) => `
            <button class="person-card ${member.gender}" data-member-id="${member.id}">
              <div class="person-head">
                <div class="mini-avatar">${initials(member.fullName)}</div>
                <div>
                  <strong>${member.fullName}</strong>
                  <span>${member.nickname || "Anggota keluarga"}</span>
                </div>
              </div>
              <span>Pasangan: ${text(member.spouse?.fullName)}</span>
              <span>Anak: ${member.children.length}</span>
              <div class="chip-row">
                <span class="chip">${member.role}</span>
                <span class="chip">Gen ${member.generation}</span>
              </div>
            </button>
          `).join("")}
        </div>
      </div>
    `).join("");
}

function renderMembers() {
  const list = document.querySelector("#memberList");
  list.innerHTML = state.members.filter(memberMatches).map((member) => `
    <button class="member-row" data-member-id="${member.id}">
      <strong>${member.fullName}</strong>
      <span>Gen ${member.generation} - ${member.role}</span>
      <span>${member.parents.map((parent) => parent.fullName).join(" & ") || "Orang tua belum tercatat"}</span>
    </button>
  `).join("");
}

function renderProfile() {
  const selected = byId(state.selectedId) || state.members[0];
  if (!selected) return;
  state.selectedId = selected.id;
  document.querySelector("#profile").innerHTML = `
    <div class="avatar">${initials(selected.fullName)}</div>
    <h2 class="profile-name">${selected.fullName}</h2>
    <p class="meta">${selected.role} - Generasi ${selected.generation}</p>
    <div class="profile-grid">
      <div><b>Nama panggilan</b>${text(selected.nickname)}</div>
      <div><b>Jenis kelamin</b>${text(selected.gender)}</div>
      <div><b>Ayah/Ibu</b>${selected.parents.map((parent) => parent.fullName).join(" & ") || "-"}</div>
      <div><b>Pasangan</b>${text(selected.spouse?.fullName)}</div>
      <div><b>Anak</b>${selected.children.map((child) => child.fullName).join(", ") || "-"}</div>
      <div><b>Tempat/Tanggal lahir</b>${text(selected.birthPlace)} - ${text(selected.birthDate)}</div>
      <div><b>Pekerjaan</b>${text(selected.occupation)}</div>
      <div><b>Domisili</b>${text(selected.address)}</div>
      <div><b>Status</b>${selected.isDeceased ? "Almarhum/almarhumah" : "Aktif"}</div>
    </div>
  `;
}

function renderEvents() {
  const timeline = document.querySelector("#timelineList");
  const agenda = document.querySelector("#agendaList");
  const eventHtml = state.events.map((event) => `
    <div class="timeline-item">
      <strong>${new Date(event.eventDate).getFullYear()} : ${event.title}</strong>
      <p>${event.description || event.location || "Catatan keluarga"}</p>
    </div>
  `).join("");
  timeline.innerHTML = eventHtml;
  agenda.innerHTML = state.events.map((event) => `
    <div class="agenda-card">
      <strong>${event.title}</strong>
      <p>${event.eventDate} - ${text(event.location)}</p>
    </div>
  `).join("");
}

function renderAll(health) {
  document.querySelector("#familyName").textContent = state.family.familyName;
  document.querySelector("#familyDescription").textContent = state.family.description;
  renderStats(health);
  renderTree();
  renderMembers();
  renderProfile();
  renderEvents();
}

async function load() {
  const [health, family, members, events] = await Promise.all([
    api.get("/api/health"),
    api.get("/api/family"),
    api.get("/api/members"),
    api.get("/api/events")
  ]);
  state.family = family;
  state.members = members;
  state.events = events;
  renderAll(health);
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-member-id]");
  if (!button) return;
  state.selectedId = button.dataset.memberId;
  renderProfile();
});

document.querySelector("#search").addEventListener("input", (event) => {
  state.query = event.target.value;
  renderTree();
  renderMembers();
});

document.querySelector("#eventForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  await api.post("/api/events", Object.fromEntries(form.entries()));
  state.events = await api.get("/api/events");
  event.currentTarget.reset();
  renderStats(await api.get("/api/health"));
  renderEvents();
});

document.querySelector("#memberForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const input = Object.fromEntries(form.entries());
  input.generation = Number(input.generation || 1);
  const created = await api.post("/api/members", input);
  state.members = await api.get("/api/members");
  state.selectedId = created.id;
  event.currentTarget.reset();
  event.currentTarget.elements.generation.value = 1;
  renderStats(await api.get("/api/health"));
  renderTree();
  renderMembers();
  renderProfile();
});

load().catch((error) => {
  document.body.innerHTML = `<main class="panel"><h1>Aplikasi belum bisa dimuat</h1><p>${error.message}</p></main>`;
});
