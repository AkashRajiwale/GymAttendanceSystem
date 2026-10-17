import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export type Cell = string | number;
export type Row = Cell[];

/**
 * A tab-based spreadsheet store. Row indexes are 0-based and exclude the
 * header row. Backed by Google Sheets in production, or a local JSON file
 * when GOOGLE_SHEET_ID is not set (for trying the app on your machine).
 */
export interface Store {
  ensureTab(tab: string, headers: string[]): Promise<void>;
  rows(tab: string): Promise<string[][]>;
  append(tab: string, row: Row): Promise<void>;
  update(tab: string, index: number, row: Row): Promise<void>;
  remove(tab: string, index: number): Promise<void>;
}

// ---------------------------------------------------------------- Google Sheets

const API = "https://sheets.googleapis.com/v4/spreadsheets";

class SheetsStore implements Store {
  private token: { value: string; exp: number } | null = null;
  private sheetIds: Map<string, number> | null = null;

  constructor(private spreadsheetId: string) {}

  private async accessToken() {
    if (this.token && this.token.exp > Date.now() + 60_000) return this.token.value;

    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!email || !key) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY must be set");
    }

    const now = Math.floor(Date.now() / 1000);
    const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
      iss: email,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })}`;
    const signature = crypto.createSign("RSA-SHA256").update(unsigned).sign(key).toString("base64url");

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: `${unsigned}.${signature}`,
      }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Google auth failed: ${await res.text()}`);
    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.token = { value: data.access_token, exp: Date.now() + data.expires_in * 1000 };
    return this.token.value;
  }

  private async call<T>(url: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API}/${this.spreadsheetId}${url}`, {
      ...init,
      headers: {
        authorization: `Bearer ${await this.accessToken()}`,
        "content-type": "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Google Sheets error ${res.status}: ${await res.text()}`);
    return (await res.json()) as T;
  }

  private range(tab: string, a1: string) {
    return encodeURIComponent(`'${tab.replace(/'/g, "''")}'!${a1}`);
  }

  private async loadSheetIds() {
    const meta = await this.call<{ sheets: { properties: { title: string; sheetId: number } }[] }>(
      "?fields=sheets.properties(title,sheetId)",
    );
    this.sheetIds = new Map(meta.sheets.map((s) => [s.properties.title, s.properties.sheetId]));
    return this.sheetIds;
  }

  private async sheetId(tab: string) {
    let id = (this.sheetIds ?? (await this.loadSheetIds())).get(tab);
    if (id === undefined) id = (await this.loadSheetIds()).get(tab);
    if (id === undefined) throw new Error(`Sheet tab "${tab}" not found`);
    return id;
  }

  async ensureTab(tab: string, headers: string[]) {
    const ids = this.sheetIds ?? (await this.loadSheetIds());
    if (ids.has(tab) || (await this.loadSheetIds()).has(tab)) return;
    try {
      await this.call(":batchUpdate", {
        method: "POST",
        body: JSON.stringify({
          requests: [{ addSheet: { properties: { title: tab, gridProperties: { frozenRowCount: 1 } } } }],
        }),
      });
    } catch (e) {
      // Another request may have created the tab at the same moment.
      if (!(await this.loadSheetIds()).has(tab)) throw e;
      return;
    }
    await this.call(`/values/${this.range(tab, "A1")}?valueInputOption=RAW`, {
      method: "PUT",
      body: JSON.stringify({ values: [headers] }),
    });
    await this.loadSheetIds();
  }

  async rows(tab: string) {
    const data = await this.call<{ values?: Cell[][] }>(
      `/values/${this.range(tab, "A2:Z")}?valueRenderOption=UNFORMATTED_VALUE`,
    );
    return (data.values ?? []).map((r) => r.map((c) => String(c ?? "")));
  }

  async append(tab: string, row: Row) {
    await this.call(
      `/values/${this.range(tab, "A1")}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      { method: "POST", body: JSON.stringify({ values: [row] }) },
    );
  }

  async update(tab: string, index: number, row: Row) {
    await this.call(`/values/${this.range(tab, `A${index + 2}`)}?valueInputOption=RAW`, {
      method: "PUT",
      body: JSON.stringify({ values: [row] }),
    });
  }

  async remove(tab: string, index: number) {
    const sheetId = await this.sheetId(tab);
    await this.call(":batchUpdate", {
      method: "POST",
      body: JSON.stringify({
        requests: [
          {
            deleteDimension: {
              range: { sheetId, dimension: "ROWS", startIndex: index + 1, endIndex: index + 2 },
            },
          },
        ],
      }),
    });
  }
}

// ---------------------------------------------------------------- Local file (dev only)

type LocalDb = Record<string, { headers: string[]; rows: string[][] }>;

class LocalStore implements Store {
  private file = path.join(process.cwd(), ".data", "db.json");

  private load(): LocalDb {
    try {
      return JSON.parse(fs.readFileSync(this.file, "utf8")) as LocalDb;
    } catch {
      return {};
    }
  }

  private save(db: LocalDb) {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(db, null, 2));
  }

  async ensureTab(tab: string, headers: string[]) {
    const db = this.load();
    if (!db[tab]) {
      db[tab] = { headers, rows: [] };
      this.save(db);
    }
  }

  async rows(tab: string) {
    return this.load()[tab]?.rows ?? [];
  }

  async append(tab: string, row: Row) {
    const db = this.load();
    db[tab].rows.push(row.map(String));
    this.save(db);
  }

  async update(tab: string, index: number, row: Row) {
    const db = this.load();
    db[tab].rows[index] = row.map(String);
    this.save(db);
  }

  async remove(tab: string, index: number) {
    const db = this.load();
    db[tab].rows.splice(index, 1);
    this.save(db);
  }
}

// ----------------------------------------------------------------

let instance: Store | null = null;

export function store(): Store {
  if (instance) return instance;
  // Accept the bare ID or a pasted sheet URL / "ID/edit#gid=0" fragment.
  const raw = process.env.GOOGLE_SHEET_ID?.trim();
  const id = raw && (raw.match(/\/d\/([\w-]+)/)?.[1] ?? raw.split(/[/?#]/)[0]);
  if (id) {
    instance = new SheetsStore(id);
  } else if (process.env.VERCEL) {
    throw new Error("GOOGLE_SHEET_ID is not set. Data cannot be saved on Vercel without it.");
  } else {
    console.warn("[store] GOOGLE_SHEET_ID not set — using local file .data/db.json");
    instance = new LocalStore();
  }
  return instance;
}
