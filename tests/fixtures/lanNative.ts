// Desktop LAN server fixture, copied from the corresponding RPS desktop build.
/* SPDX-License-Identifier: GPL-3.0-or-later */
import { createHash, randomBytes } from "node:crypto";
import { mkdir, open as openFile, readFile, rename, unlink } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { networkInterfaces } from "node:os";
import { join } from "node:path";

import { open, seal } from "../../src/shared/lanCrypto";
import { MAX_PROFILES, sanitizeProfile, type PresenceProfile } from "../../src/shared/model";

export interface LanDocument { revision: number; profiles: PresenceProfile[]; }
export interface LanStatus { enabled: boolean; address: string; code: string; revision: number; }
interface Stored extends LanDocument { version: 1; key: string; prefix: string; }

export function privateIPv4(address: string): boolean {
    if (!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(address)) return false;
    const parts = address.split(".").map(Number);
    if (parts.some(x => x > 255)) return false;
    return parts[0] === 10 || parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31 || parts[0] === 192 && parts[1] === 168;
}

export function lanAddresses(): { address: string; label: string; }[] {
    return Object.entries(networkInterfaces()).flatMap(([name, entries]) => (entries ?? [])
        .filter(entry => entry.family === "IPv4" && !entry.internal && privateIPv4(entry.address))
        .map(entry => ({ address: entry.address, label: `${name}: ${entry.address}` })));
}

function profiles(value: unknown): PresenceProfile[] {
    if (!Array.isArray(value) || value.length > MAX_PROFILES) throw new Error("Invalid profiles");
    const result = value.map(sanitizeProfile);
    if (new Set(result.map(p => p.id)).size !== result.length) throw new Error("Duplicate profile ID");
    return result;
}

/** One private-interface listener, isolated by desktop account. No Discord credentials. */
export class LanServer {
    private server?: Server;
    private state?: Stored;
    private owner = "";
    private address = "";
    private lease = 0;
    private timer?: ReturnType<typeof setInterval>;
    private pending: Promise<unknown> = Promise.resolve();
    private challenges = new Map<string, number>();
    private readonly port: number;
    private readonly leaseMs: number;

    constructor(private readonly dataDir: string, private readonly options: { allowLoopbackForTests?: boolean; port?: number; leaseMs?: number; } = {}) {
        this.port = options.allowLoopbackForTests ? options.port ?? 38474 : 38474;
        this.leaseMs = options.leaseMs ?? 15000;
    }

    private serial<T>(run: () => Promise<T>): Promise<T> {
        const next = this.pending.then(run);
        this.pending = next.catch(() => {});
        return next;
    }

    private file(): string { return join(this.dataDir, `${createHash("sha256").update(this.owner).digest("hex")}.json`); }
    private document(): LanDocument { return { revision: this.state!.revision, profiles: profiles(this.state!.profiles) }; }
    private status(): LanStatus {
        const enabled = Boolean(this.server?.listening);
        return { enabled, address: this.address, code: enabled ? `rpslan1:${this.address}:${this.port}:${this.state!.key}:${this.state!.prefix}` : "", revision: this.state?.revision ?? 0 };
    }
    private requireOwner(ownerId: string) {
        if (!this.server?.listening || !ownerId || ownerId !== this.owner || !this.state) throw new Error("LAN sync is disabled for this account");
        this.lease = Date.now();
    }
    private async save(next: Stored) {
        await mkdir(this.dataDir, { recursive: true, mode: 0o700 });
        const path = this.file();
        const temporary = `${path}.${randomBytes(8).toString("hex")}.tmp`;
        try {
            const handle = await openFile(temporary, "wx", 0o600);
            try { await handle.writeFile(JSON.stringify(next)); await handle.sync(); } finally { await handle.close(); }
            await rename(temporary, path);
            this.state = next;
        } finally { await unlink(temporary).catch(() => {}); }
    }
    private async close() {
        this.challenges.clear();
        if (this.timer) clearInterval(this.timer);
        this.timer = undefined;
        const server = this.server;
        this.server = undefined;
        if (server) await new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); });
    }
    stop(): Promise<void> { return this.serial(() => this.close()); }

    configure(enabled: boolean, address: string, ownerId: string, initialProfiles: unknown): Promise<LanStatus> {
        return this.serial(async () => {
            if (typeof enabled !== "boolean") throw new Error("Invalid LAN configuration");
            if (!enabled) { await this.close(); return this.status(); }
            if (typeof ownerId !== "string" || !ownerId || ownerId.length > 128) throw new Error("Account required");
            if (!(this.options.allowLoopbackForTests && address === "127.0.0.1") && !lanAddresses().some(a => a.address === address)) throw new Error("Select a local private IPv4 interface");
            this.lease = Date.now();
            if (this.owner === ownerId && this.address === address && this.server?.listening) return this.status();
            await this.close();
            this.owner = ownerId;
            this.address = address;
            this.state = undefined;
            try {
                const stored = JSON.parse(await readFile(this.file(), "utf8")) as Stored;
                if (stored.version !== 1 || !Number.isSafeInteger(stored.revision) || stored.revision < 0 || !/^[a-f0-9]{64}$/.test(stored.key) || !/^[a-f0-9]{32}$/.test(stored.prefix)) throw new Error("Invalid LAN store");
                this.state = { ...stored, profiles: profiles(stored.profiles) };
            } catch (error) {
                if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
                await this.save({ version: 1, key: randomBytes(32).toString("hex"), prefix: randomBytes(16).toString("hex"), revision: 0, profiles: profiles(initialProfiles) });
            }
            const server = createServer((req, res) => this.receive(req, res));
            server.requestTimeout = 5000;
            server.headersTimeout = 5000;
            server.setTimeout(5000, socket => socket.destroy());
            this.server = server;
            try {
                await new Promise<void>((resolve, reject) => {
                    server.once("error", reject);
                    server.listen(this.port, address, () => { server.removeListener("error", reject); resolve(); });
                });
            } catch (error) { await this.close(); throw error; }
            server.on("error", () => { void this.stop(); });
            server.unref();
            this.timer = setInterval(() => { if (Date.now() - this.lease > this.leaseMs) void this.stop(); }, Math.min(1000, this.leaseMs));
            this.timer.unref();
            return this.status();
        });
    }

    read(ownerId: string): Promise<LanDocument> {
        return this.serial(async () => { this.requireOwner(ownerId); return this.document(); });
    }
    private async compareWrite(expectedRevision: unknown, value: unknown) {
        if (!Number.isSafeInteger(expectedRevision) || (expectedRevision as number) < 0) throw new Error("Invalid revision");
        const clean = profiles(value);
        if (expectedRevision !== this.state!.revision) return { ok: false, document: this.document() };
        if (this.state!.revision === Number.MAX_SAFE_INTEGER) throw new Error("Revision exhausted");
        await this.save({ ...this.state!, revision: this.state!.revision + 1, profiles: clean });
        return { ok: true, document: this.document() };
    }
    write(ownerId: string, expectedRevision: number, value: unknown) {
        return this.serial(async () => { this.requireOwner(ownerId); return this.compareWrite(expectedRevision, value); });
    }
    rotate(ownerId: string): Promise<LanStatus> {
        return this.serial(async () => {
            this.requireOwner(ownerId);
            await this.save({ ...this.state!, key: randomBytes(32).toString("hex"), prefix: randomBytes(16).toString("hex") });
            this.challenges.clear();
            return this.status();
        });
    }

    private receive(req: IncomingMessage, res: ServerResponse) {
        res.setHeader("Cache-Control", "no-store");
        const peer = req.socket.remoteAddress?.replace(/^::ffff:/, "") ?? "";
        if ((!privateIPv4(peer) && !(this.options.allowLoopbackForTests && peer === "127.0.0.1")) || req.headers.origin !== undefined || req.headers.host !== `${this.address}:${this.port}`) { res.writeHead(403).end(); return; }
        if (req.method === "GET" && req.url === "/challenge") {
            if (!this.server?.listening || !this.state || Date.now() - this.lease > this.leaseMs) { res.writeHead(503).end(); return; }
            const now = Date.now();
            for (const [nonce, expiry] of this.challenges) if (expiry <= now) this.challenges.delete(nonce);
            if (this.challenges.size >= 64) { res.writeHead(429).end(); return; }
            const nonce = randomBytes(24).toString("hex");
            this.challenges.set(nonce, now + 30000);
            res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ nonce, prefix: this.state.prefix }));
            return;
        }
        if (req.method !== "POST" || req.url !== "/sync") { res.writeHead(404).end(); return; }
        const owner = this.owner;
        const server = this.server;
        const chunks: Buffer[] = [];
        let size = 0;
        req.on("data", (chunk: Buffer) => {
            size += chunk.length;
            if (size > 2 * 1024 * 1024) { res.writeHead(413).end(); req.destroy(); } else chunks.push(chunk);
        });
        req.on("error", () => {});
        req.on("end", () => {
            void this.serial(async () => {
                if (server !== this.server || owner !== this.owner || !server?.listening || Date.now() - this.lease > this.leaseMs) { res.writeHead(503).end(); return; }
                try {
                    const envelope = JSON.parse(Buffer.concat(chunks).toString("utf8"));
                    if (typeof envelope.nonce !== "string" || !/^[a-f0-9]{48}$/.test(envelope.nonce)) throw new Error("Invalid nonce");
                    const expiry = this.challenges.get(envelope.nonce);
                    this.challenges.delete(envelope.nonce);
                    if (!expiry || expiry <= Date.now()) throw new Error("Unknown or expired challenge");
                    const request = open(envelope, this.state!.key);
                    if (request?.ownerId !== this.owner) throw new Error("Account mismatch");
                    if (!request || (request.op !== "read" && request.op !== "write")) throw new Error("Invalid request");
                    const result = request.op === "read" ? { ok: true, document: this.document() } : await this.compareWrite(request.expectedRevision, request.profiles);
                    let nonce: string;
                    do { nonce = randomBytes(24).toString("hex"); } while (nonce.startsWith(this.state!.prefix));
                    const response = seal({ requestNonce: envelope.nonce, ...result }, this.state!.key, nonce);
                    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(response));
                } catch { if (!res.headersSent) res.writeHead(400).end(); }
            }).catch(() => { if (!res.headersSent) res.writeHead(500).end(); });
        });
    }
}
