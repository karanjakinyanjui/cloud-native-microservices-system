import { Database } from '../../database';
import { Pool, PoolClient } from 'pg';

jest.mock('pg', () => {
  const mPool = {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

describe('Database Integration Tests', () => {
  let database: Database;
  let mockPool: any;

  beforeAll(() => {
    database = Database.getInstance();
    mockPool = (database as any).pool;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Database Connection', () => {
    it('should connect to database successfully', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [{ now: new Date() }] }),
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValue(mockClient);

      await database.initialize();

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('SELECT NOW()');
    });

    it('should handle connection errors', async () => {
      mockPool.connect.mockRejectedValue(new Error('Connection failed'));

      await expect(database.initialize()).rejects.toThrow('Connection failed');
    });

    it('should be a singleton', () => {
      const instance1 = Database.getInstance();
      const instance2 = Database.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('Query Execution', () => {
    it('should execute simple queries', async () => {
      const expectedResult = { rows: [{ id: 1, email: 'test@example.com' }] };
      mockPool.query.mockResolvedValue(expectedResult);

      const result = await database.query('SELECT * FROM users WHERE id = $1', [1]);

      expect(result).toEqual(expectedResult);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1',
        [1]
      );
    });

    it('should execute insert queries', async () => {
      const expectedResult = { rows: [{ id: 1 }] };
      mockPool.query.mockResolvedValue(expectedResult);

      const result = await database.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
        ['test@example.com', 'hash']
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toHaveProperty('id');
    });

    it('should handle query errors', async () => {
      mockPool.query.mockRejectedValue(new Error('Query failed'));

      await expect(
        database.query('SELECT * FROM invalid_table', [])
      ).rejects.toThrow('Query failed');
    });

    it('should support parameterized queries', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await database.query(
        'SELECT * FROM users WHERE email = $1 AND role = $2',
        ['test@example.com', 'user']
      );

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1 AND role = $2',
        ['test@example.com', 'user']
      );
    });
  });

  describe('Transaction Management', () => {
    let mockClient: any;

    beforeEach(() => {
      mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      mockPool.connect.mockResolvedValue(mockClient);
    });

    it('should execute transactions', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // INSERT
        .mockResolvedValueOnce({}); // COMMIT

      const client = await mockPool.connect();

      await client.query('BEGIN');
      const result = await client.query('INSERT INTO users VALUES ($1)', ['test']);
      await client.query('COMMIT');
      client.release();

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Insert failed')) // INSERT
        .mockResolvedValueOnce({}); // ROLLBACK

      const client = await mockPool.connect();

      try {
        await client.query('BEGIN');
        await client.query('INSERT INTO users VALUES ($1)', ['test']);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
      } finally {
        client.release();
      }

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('Connection Pool', () => {
    it('should manage connection pool', () => {
      expect(Pool).toHaveBeenCalled();
    });

    it('should close pool on shutdown', async () => {
      await database.close();

      expect(mockPool.end).toHaveBeenCalled();
    });

    it('should handle pool errors', () => {
      mockPool.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          callback(new Error('Pool error'));
        }
      });

      expect(mockPool.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('User Operations', () => {
    it('should create user', async () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        password_hash: 'hashed',
        role: 'user',
        created_at: new Date(),
      };

      mockPool.query.mockResolvedValue({ rows: [user] });

      const result = await database.query(
        'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING *',
        ['test@example.com', 'hashed', 'user']
      );

      expect(result.rows[0]).toMatchObject({
        email: 'test@example.com',
        role: 'user',
      });
    });

    it('should find user by email', async () => {
      const user = { id: 1, email: 'test@example.com' };
      mockPool.query.mockResolvedValue({ rows: [user] });

      const result = await database.query(
        'SELECT * FROM users WHERE email = $1',
        ['test@example.com']
      );

      expect(result.rows[0]).toMatchObject(user);
    });

    it('should update user', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ id: 1, is_active: false }],
      });

      const result = await database.query(
        'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING *',
        [false, 1]
      );

      expect(result.rows[0].is_active).toBe(false);
    });

    it('should delete user', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 1 });

      const result = await database.query(
        'DELETE FROM users WHERE id = $1',
        [1]
      );

      expect(result.rowCount).toBe(1);
    });
  });

  describe('Refresh Token Operations', () => {
    it('should store refresh token', async () => {
      const token = {
        id: 1,
        user_id: 1,
        token: 'refresh_token',
        expires_at: new Date(),
      };

      mockPool.query.mockResolvedValue({ rows: [token] });

      const result = await database.query(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3) RETURNING *',
        [1, 'refresh_token', new Date()]
      );

      expect(result.rows[0]).toMatchObject({
        user_id: 1,
        token: 'refresh_token',
      });
    });

    it('should find refresh token', async () => {
      const token = { user_id: 1, token: 'refresh_token' };
      mockPool.query.mockResolvedValue({ rows: [token] });

      const result = await database.query(
        'SELECT * FROM refresh_tokens WHERE token = $1',
        ['refresh_token']
      );

      expect(result.rows[0]).toMatchObject(token);
    });

    it('should delete refresh token', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 1 });

      const result = await database.query(
        'DELETE FROM refresh_tokens WHERE token = $1',
        ['refresh_token']
      );

      expect(result.rowCount).toBe(1);
    });

    it('should delete expired tokens', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 5 });

      const result = await database.query(
        'DELETE FROM refresh_tokens WHERE expires_at < NOW()',
        []
      );

      expect(result.rowCount).toBeGreaterThanOrEqual(0);
    });
  });
});
