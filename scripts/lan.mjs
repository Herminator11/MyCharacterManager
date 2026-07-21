/**
 * Startet den Dev-Server auf allen Interfaces und zeigt die URL,
 * die man am Handy im selben WLAN eintippt.
 */
import { spawn } from "node:child_process";
import { networkInterfaces } from "node:os";

const PORT = process.env.PORT ?? "3000";

function lanAddresses() {
  return Object.values(networkInterfaces())
    .flatMap((nics) => nics ?? [])
    .filter((nic) => nic.family === "IPv4" && !nic.internal)
    .map((nic) => nic.address);
}

const addresses = lanAddresses();

console.log("");
console.log("  Charakter-Manager");
console.log("  ─────────────────────────────────────────");
console.log(`  Hier:     http://localhost:${PORT}`);
if (addresses.length === 0) {
  console.log("  Im WLAN:  keine Netzwerkadresse gefunden — WLAN verbunden?");
} else {
  for (const address of addresses) {
    console.log(`  Im WLAN:  http://${address}:${PORT}`);
  }
}
console.log("");
console.log("  Beim ersten Start fragt die macOS-Firewall nach — erlauben,");
console.log("  sonst kommt das Handy nicht durch.");
console.log("");

spawn("npx", ["next", "dev", "-H", "0.0.0.0", "-p", PORT], {
  stdio: "inherit",
  shell: false,
}).on("exit", (code) => process.exit(code ?? 0));
