import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

// Lazy pool creation to avoid crashing the server when env is missing.
// Code paths that need DB will get a clear runtime error if unset.
let _pool = null;
function getPool() {
  if (_pool) return _pool;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('Missing DATABASE_URL environment variable');
  }
  _pool = new Pool({ connectionString: databaseUrl });
  return _pool;
}
export const pool = {
  query: async (text, params) => getPool().query(text, params),
};

class QueryBuilder {
  constructor(table) {
    this.table = table;
    this.whereClauses = [];
    this.selectColumns = undefined;
    this.insertData = undefined;
    this.updateData = undefined;
    this.singleResult = false;
    this.orderClause = undefined;
    this.limit = undefined;
    this.offset = undefined;
    this.isDelete = false;
  }

  table;
  whereClauses;
  selectColumns;
  insertData;
  updateData;
  singleResult;
  orderClause;
  limit;
  offset;
  isDelete;

  select(columns) {
    const hasNested = columns && /\(|\)/.test(columns);
    this.selectColumns = hasNested ? '*' : (columns || '*');
    return this;
  }

  insert(data) {
    this.insertData = data;
    return this;
  }

  update(data) {
    this.updateData = data;
    return this;
  }

  delete() {
    this.isDelete = true;
    return this;
  }

  eq(column, value) {
    this.whereClauses.push({ op: 'eq', column, value });
    return this;
  }

  gte(column, value) {
    this.whereClauses.push({ op: 'gte', column, value });
    return this;
  }

  lte(column, value) {
    this.whereClauses.push({ op: 'lte', column, value });
    return this;
  }

  in(column, values) {
    this.whereClauses.push({ op: 'in', column, value: values });
    return this;
  }

  not(column, comparator, value) {
    this.whereClauses.push({ op: 'not', column, comparator, value });
    return this;
  }

  single() {
    this.singleResult = true;
    return this;
  }

  order(column, opts = {}) {
    this.orderClause = `ORDER BY ${column} ${opts.ascending === false ? 'DESC' : 'ASC'}`;
    return this;
  }

  range(start, end) {
    const count = end - start + 1;
    this.limit = count;
    this.offset = start;
    return this;
  }

  async execute() {
    if (this.insertData !== undefined) {
      return this.executeInsert();
    }
    if (this.updateData !== undefined) {
      return this.executeUpdate();
    }
    if (this.isDelete) {
      return this.executeDelete();
    }
    return this.executeSelect();
  }

  async executeSelect() {
    const values = [];
    let paramIdx = 1;
    const whereSql = this.whereClauses.map((w) => {
      if (w.op === 'eq') {
        values.push(w.value);
        return `${w.column} = $${paramIdx++}`;
      }
      if (w.op === 'gte') {
        values.push(w.value);
        return `${w.column} >= $${paramIdx++}`;
      }
      if (w.op === 'lte') {
        values.push(w.value);
        return `${w.column} <= $${paramIdx++}`;
      }
      if (w.op === 'in') {
        values.push(w.value);
        return `${w.column} = ANY($${paramIdx++})`;
      }
      if (w.op === 'not') {
        if (w.comparator === 'is' && (w.value === null || w.value === 'null')) {
          return `${w.column} IS NOT NULL`;
        }
        values.push(w.value);
        return `${w.column} != $${paramIdx++}`;
      }
      values.push(w.value);
      return `${w.column} = $${paramIdx++}`;
    }).join(' AND ');
    let sql = `SELECT ${this.selectColumns || '*'} FROM ${this.table}` + (whereSql ? ` WHERE ${whereSql}` : '');
    if (this.orderClause) sql += ` ${this.orderClause}`;
    if (this.singleResult) sql += ' LIMIT 1';
    else if (this.limit !== undefined) sql += ` LIMIT ${this.limit}`;
    if (this.offset !== undefined) sql += ` OFFSET ${this.offset}`;
    const { rows } = await pool.query(sql, values);
    return {
      data: this.singleResult ? rows[0] ?? null : rows,
      error: null,
      count: undefined,
    };
  }

  async executeInsert() {
    const rows = Array.isArray(this.insertData) ? this.insertData : [this.insertData];
    if (rows.length === 0) return { data: null, error: null };

    const keys = Object.keys(rows[0]);
    const columnsSql = keys.join(', ');
    const valuesSql = rows
      .map((row, rowIdx) => `(${keys.map((_, colIdx) => `$${rowIdx * keys.length + colIdx + 1}`).join(', ')})`)
      .join(', ');
    const values = rows.flatMap(r => keys.map(k => (isOperation(r[k]) ? (r[k]).__raw : r[k])));

    // Build RETURNING clause when .select() or .single() was used after insert
    const returning = 'RETURNING *';
    const sql = `INSERT INTO ${this.table} (${columnsSql}) VALUES ${valuesSql} ${returning}`;
    const { rows: resultRows } = await pool.query(sql, values);
    return {
      data: this.singleResult ? resultRows[0] ?? null : resultRows,
      error: null,
    };
  }

  async executeUpdate() {
    const setFragments = [];
    const values = [];
    let paramIdx = 1;

    for (const [col, val] of Object.entries(this.updateData || {})) {
      if (isOperation(val)) {
        // Operation raw SQL assumed to reference the column
        setFragments.push(`${col} = ${val.__raw}`);
      } else {
        setFragments.push(`${col} = $${paramIdx++}`);
        values.push(val);
      }
    }

    const whereSql = this.whereClauses.map((w) => {
      if (w.op === 'eq') {
        values.push(w.value);
        return `${w.column} = $${paramIdx++}`;
      }
      if (w.op === 'gte') {
        values.push(w.value);
        return `${w.column} >= $${paramIdx++}`;
      }
      if (w.op === 'lte') {
        values.push(w.value);
        return `${w.column} <= $${paramIdx++}`;
      }
      if (w.op === 'in') {
        values.push(w.value);
        return `${w.column} = ANY($${paramIdx++})`;
      }
      if (w.op === 'not') {
        if (w.comparator === 'is' && (w.value === null || w.value === 'null')) {
          return `${w.column} IS NOT NULL`;
        }
        values.push(w.value);
        return `${w.column} != $${paramIdx++}`;
      }
      values.push(w.value);
      return `${w.column} = $${paramIdx++}`;
    }).join(' AND ');

    const sql = `UPDATE ${this.table} SET ${setFragments.join(', ')}${whereSql ? ` WHERE ${whereSql}` : ''}`;
    await pool.query(sql, values);
    return { data: null, error: null };
  }

  async executeDelete() {
    const values = [];
    let paramIdx = 1;
    const whereSql = this.whereClauses.map((w) => {
      values.push(w.value);
      return `${w.column} = $${paramIdx++}`;
    }).join(' AND ');
    const sql = `DELETE FROM ${this.table}` + (whereSql ? ` WHERE ${whereSql}` : '');
    await pool.query(sql, values);
    return { data: null, error: null };
  }
}

function isOperation(val) {
  return val && typeof val === 'object' && '__raw' in val;
}

export const db = {
  from(table) {
    return new QueryBuilder(table);
  },
  rpc(name, params) {
    if (name === 'increment') {
      const by = params.by ?? 1;
      return { __raw: `${params.column} + ${by}` };
    }
    throw new Error(`Unsupported rpc function: ${name}`);
  },
};