/**
 * localStorage adapter that mimics the Supabase PostgREST chaining API.
 * Used in demo mode so all data stays in the browser.
 */

function getTable(name: string): Record<string, unknown>[] {
  try {
    const raw = localStorage.getItem(`demo_${name}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setTable(name: string, rows: Record<string, unknown>[]) {
  localStorage.setItem(`demo_${name}`, JSON.stringify(rows));
}

function uuid(): string {
  return crypto.randomUUID();
}

type Row = Record<string, unknown>;
type Result<T> = { data: T; error: null } | { data: null; error: { message: string } };

class QueryBuilder {
  private tableName: string;
  private filters: Array<{ col: string; op: string; val: unknown }> = [];
  private orderCol: string | null = null;
  private orderAsc = true;
  private limitN: number | null = null;
  private returnSingle = false;
  private returnMaybeSingle = false;
  private selectCols: string | null = null;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns?: string): this {
    this.selectCols = columns || "*";
    return this;
  }

  eq(col: string, val: unknown): this {
    this.filters.push({ col, op: "eq", val });
    return this;
  }

  neq(col: string, val: unknown): this {
    this.filters.push({ col, op: "neq", val });
    return this;
  }

  is(col: string, val: unknown): this {
    this.filters.push({ col, op: "is", val });
    return this;
  }

  in(col: string, vals: unknown[]): this {
    this.filters.push({ col, op: "in", val: vals });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }): this {
    this.orderCol = col;
    this.orderAsc = opts?.ascending ?? true;
    return this;
  }

  limit(n: number): this {
    this.limitN = n;
    return this;
  }

  single(): this {
    this.returnSingle = true;
    return this;
  }

  maybeSingle(): this {
    this.returnMaybeSingle = true;
    return this;
  }

  then<TResult>(
    resolve: (value: Result<Row | Row[] | null>) => TResult,
    reject?: (reason: unknown) => TResult,
  ): Promise<TResult> {
    try {
      let rows = getTable(this.tableName);

      for (const f of this.filters) {
        rows = rows.filter((r) => {
          if (f.op === "eq") return r[f.col] === f.val;
          if (f.op === "neq") return r[f.col] !== f.val;
          if (f.op === "is") return r[f.col] === f.val;
          if (f.op === "in") return (f.val as unknown[]).includes(r[f.col]);
          return true;
        });
      }

      if (this.orderCol) {
        const col = this.orderCol;
        const asc = this.orderAsc;
        rows.sort((a, b) => {
          const av = a[col] as string | number;
          const bv = b[col] as string | number;
          if (av < bv) return asc ? -1 : 1;
          if (av > bv) return asc ? 1 : -1;
          return 0;
        });
      }

      if (this.limitN !== null) rows = rows.slice(0, this.limitN);

      if (this.selectCols && this.selectCols !== "*") {
        const cols = this.selectCols.split(",").map((c) => c.trim());
        rows = rows.map((r) => {
          const out: Row = {};
          for (const c of cols) out[c] = r[c];
          return out;
        });
      }

      if (this.returnSingle) {
        if (rows.length === 0) return Promise.resolve(resolve({ data: null, error: { message: "No rows found" } }));
        return Promise.resolve(resolve({ data: rows[0], error: null }));
      }
      if (this.returnMaybeSingle) {
        return Promise.resolve(resolve({ data: rows[0] || null, error: null }));
      }
      return Promise.resolve(resolve({ data: rows, error: null }));
    } catch (e) {
      if (reject) return Promise.resolve(reject(e));
      return Promise.resolve(resolve({ data: null, error: { message: String(e) } }));
    }
  }
}

class InsertBuilder {
  private tableName: string;
  private records: Row[];
  private selectCols: string | null = null;
  private returnSingle = false;

  constructor(tableName: string, records: Row | Row[]) {
    this.tableName = tableName;
    this.records = Array.isArray(records) ? records : [records];
  }

  select(columns?: string): this {
    this.selectCols = columns || "*";
    return this;
  }

  single(): this {
    this.returnSingle = true;
    return this;
  }

  then<TResult>(
    resolve: (value: Result<Row | Row[] | null>) => TResult,
    reject?: (reason: unknown) => TResult,
  ): Promise<TResult> {
    try {
      const rows = getTable(this.tableName);
      const now = new Date().toISOString();
      const inserted = this.records.map((r) => ({
        id: r.id || uuid(),
        ...r,
        created_at: r.created_at || now,
        updated_at: r.updated_at || now,
      }));
      rows.push(...inserted);
      setTable(this.tableName, rows);
      if (this.returnSingle) return Promise.resolve(resolve({ data: inserted[0], error: null }));
      return Promise.resolve(resolve({ data: inserted, error: null }));
    } catch (e) {
      if (reject) return Promise.resolve(reject(e));
      return Promise.resolve(resolve({ data: null, error: { message: String(e) } }));
    }
  }
}

class UpdateBuilder {
  private tableName: string;
  private updates: Row;
  private filters: Array<{ col: string; val: unknown }> = [];
  private selectCols: string | null = null;
  private returnSingle = false;

  constructor(tableName: string, updates: Row) {
    this.tableName = tableName;
    this.updates = updates;
  }

  eq(col: string, val: unknown): this {
    this.filters.push({ col, val });
    return this;
  }

  select(columns?: string): this {
    this.selectCols = columns || "*";
    return this;
  }

  single(): this {
    this.returnSingle = true;
    return this;
  }

  then<TResult>(
    resolve: (value: Result<Row | Row[] | null>) => TResult,
    reject?: (reason: unknown) => TResult,
  ): Promise<TResult> {
    try {
      const rows = getTable(this.tableName);
      const now = new Date().toISOString();
      const updated: Row[] = [];
      for (const row of rows) {
        const match = this.filters.every((f) => row[f.col] === f.val);
        if (match) {
          Object.assign(row, this.updates, { updated_at: now });
          updated.push(row);
        }
      }
      setTable(this.tableName, rows);
      if (this.returnSingle) return Promise.resolve(resolve({ data: updated[0] || null, error: null }));
      return Promise.resolve(resolve({ data: updated, error: null }));
    } catch (e) {
      if (reject) return Promise.resolve(reject(e));
      return Promise.resolve(resolve({ data: null, error: { message: String(e) } }));
    }
  }
}

class DeleteBuilder {
  private tableName: string;
  private filters: Array<{ col: string; val: unknown }> = [];

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  eq(col: string, val: unknown): this {
    this.filters.push({ col, val });
    return this;
  }

  then<TResult>(
    resolve: (value: Result<null>) => TResult,
    reject?: (reason: unknown) => TResult,
  ): Promise<TResult> {
    try {
      let rows = getTable(this.tableName);
      rows = rows.filter(
        (row) => !this.filters.every((f) => row[f.col] === f.val),
      );
      setTable(this.tableName, rows);
      return Promise.resolve(resolve({ data: null, error: null }));
    } catch (e) {
      if (reject) return Promise.resolve(reject(e));
      return Promise.resolve(resolve({ data: null, error: { message: String(e) } }));
    }
  }
}

class TableRef {
  private tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns?: string): QueryBuilder {
    return new QueryBuilder(this.tableName).select(columns);
  }

  insert(records: Row | Row[]): InsertBuilder {
    return new InsertBuilder(this.tableName, records);
  }

  update(data: Row): UpdateBuilder {
    return new UpdateBuilder(this.tableName, data);
  }

  delete(): DeleteBuilder {
    return new DeleteBuilder(this.tableName);
  }
}

/** Drop-in replacement for the Supabase client — all data stored in localStorage. */
export const localDb = {
  from(table: string): TableRef {
    return new TableRef(table);
  },
};
