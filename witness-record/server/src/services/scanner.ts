import net from "node:net";

export type ScanResult = { status: "clean" | "infected" | "error" | "not_configured"; detail: string };

/**
 * Optional malware screening via a ClamAV daemon (INSTREAM protocol).
 * When CLAMAV_HOST is not configured, assets are recorded as "not_configured"
 * and the readiness checklist says so; no screening is claimed.
 */
export class MalwareScanner {
  constructor(private readonly host: string, private readonly port: number) {}

  get configured(): boolean {
    return Boolean(this.host);
  }

  async scan(buffer: Buffer): Promise<ScanResult> {
    if (!this.configured) return { status: "not_configured", detail: "CLAMAV_HOST not set" };
    return new Promise((resolve) => {
      const socket = net.createConnection({ host: this.host, port: this.port });
      let response = "";
      socket.setTimeout(60_000);
      socket.on("connect", () => {
        socket.write("zINSTREAM\0");
        const chunkSize = 64 * 1024;
        for (let off = 0; off < buffer.length; off += chunkSize) {
          const chunk = buffer.subarray(off, Math.min(off + chunkSize, buffer.length));
          const len = Buffer.alloc(4);
          len.writeUInt32BE(chunk.length, 0);
          socket.write(len);
          socket.write(chunk);
        }
        socket.write(Buffer.from([0, 0, 0, 0]));
      });
      socket.on("data", (d) => (response += d.toString()));
      socket.on("error", (err) => resolve({ status: "error", detail: err.message }));
      socket.on("timeout", () => {
        socket.destroy();
        resolve({ status: "error", detail: "clamd timeout" });
      });
      socket.on("close", () => {
        const text = response.replace(/\0/g, "").trim();
        if (/OK$/.test(text)) resolve({ status: "clean", detail: text });
        else if (/FOUND$/.test(text)) resolve({ status: "infected", detail: text });
        else resolve({ status: "error", detail: text || "no response" });
      });
    });
  }

  async ping(): Promise<{ ok: boolean; detail: string }> {
    if (!this.configured) return { ok: false, detail: "not configured" };
    return new Promise((resolve) => {
      const socket = net.createConnection({ host: this.host, port: this.port });
      let response = "";
      socket.setTimeout(5000);
      socket.on("connect", () => socket.write("zPING\0"));
      socket.on("data", (d) => (response += d.toString()));
      socket.on("error", (err) => resolve({ ok: false, detail: err.message }));
      socket.on("timeout", () => {
        socket.destroy();
        resolve({ ok: false, detail: "timeout" });
      });
      socket.on("close", () => resolve({ ok: response.includes("PONG"), detail: response.replace(/\0/g, "").trim() }));
    });
  }
}
