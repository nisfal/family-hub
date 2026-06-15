const { spawn } = require("node:child_process");

const server = spawn(process.execPath, ["server.js"], {
  cwd: process.cwd(),
  stdio: ["ignore", "pipe", "pipe"]
});

let output = "";
server.stdout.on("data", (chunk) => {
  output += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  output += chunk.toString();
});

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(path) {
  const response = await fetch(`http://127.0.0.1:3000${path}`);
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response.headers.get("content-type")?.includes("application/json") ? response.json() : response.text();
}

async function main() {
  for (let i = 0; i < 20; i += 1) {
    if (output.includes("Family Hub berjalan")) break;
    await wait(150);
  }
  const health = await request("/api/health");
  const members = await request("/api/members");
  const html = await request("/");
  if (!health.ok) throw new Error("Health check gagal");
  if (members.length !== 19) throw new Error(`Jumlah anggota salah: ${members.length}`);
  if (!html.includes("Family Hub")) throw new Error("HTML utama tidak termuat");
  console.log(`OK ${members.length} anggota, database ${health.database}`);
}

main()
  .catch((error) => {
    console.error(output);
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    server.kill();
  });
