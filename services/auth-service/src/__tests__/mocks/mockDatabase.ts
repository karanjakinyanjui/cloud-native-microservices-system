export class MockDatabase {
  private data: Map<string, any[]> = new Map();

  constructor() {
    this.data.set('users', []);
    this.data.set('refresh_tokens', []);
  }

  async query(sql: string, params: any[] = []): Promise<any> {
    // Mock user queries
    if (sql.includes('SELECT') && sql.includes('users') && sql.includes('email')) {
      const email = params[0];
      const users = this.data.get('users') || [];
      const user = users.find((u: any) => u.email === email);
      return { rows: user ? [user] : [] };
    }

    // Mock user creation
    if (sql.includes('INSERT INTO users')) {
      const [email, passwordHash, role] = params;
      const newUser = {
        id: Math.floor(Math.random() * 10000),
        email,
        password_hash: passwordHash,
        role: role || 'user',
        is_active: true,
        created_at: new Date(),
      };
      const users = this.data.get('users') || [];
      users.push(newUser);
      this.data.set('users', users);
      return { rows: [newUser] };
    }

    // Mock refresh token queries
    if (sql.includes('SELECT') && sql.includes('refresh_tokens')) {
      const token = params[0];
      const tokens = this.data.get('refresh_tokens') || [];
      const tokenData = tokens.find((t: any) => t.token === token);
      return { rows: tokenData ? [tokenData] : [] };
    }

    // Mock refresh token creation
    if (sql.includes('INSERT INTO refresh_tokens')) {
      const [userId, token, expiresAt] = params;
      const newToken = {
        id: Math.floor(Math.random() * 10000),
        user_id: userId,
        token,
        expires_at: expiresAt,
        created_at: new Date(),
      };
      const tokens = this.data.get('refresh_tokens') || [];
      tokens.push(newToken);
      this.data.set('refresh_tokens', tokens);
      return { rows: [newToken] };
    }

    // Mock delete refresh token
    if (sql.includes('DELETE FROM refresh_tokens')) {
      const token = params[0];
      const tokens = this.data.get('refresh_tokens') || [];
      const filtered = tokens.filter((t: any) => t.token !== token);
      this.data.set('refresh_tokens', filtered);
      return { rowCount: tokens.length - filtered.length };
    }

    return { rows: [], rowCount: 0 };
  }

  async connect() {
    return {
      query: this.query.bind(this),
      release: jest.fn(),
    };
  }

  async initialize() {
    return true;
  }

  async close() {
    this.data.clear();
  }

  // Test helpers
  addUser(user: any) {
    const users = this.data.get('users') || [];
    users.push(user);
    this.data.set('users', users);
  }

  getUsers() {
    return this.data.get('users') || [];
  }

  clearUsers() {
    this.data.set('users', []);
  }

  clearRefreshTokens() {
    this.data.set('refresh_tokens', []);
  }

  clearAll() {
    this.data.clear();
    this.data.set('users', []);
    this.data.set('refresh_tokens', []);
  }
}

export const mockDatabase = new MockDatabase();

export const createMockUser = (overrides?: Partial<any>) => ({
  id: 1,
  email: 'test@example.com',
  password_hash: '$2a$12$mockhashedpassword',
  role: 'user',
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

export const createMockRefreshToken = (overrides?: Partial<any>) => ({
  id: 1,
  user_id: 1,
  token: 'mock_refresh_token',
  expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  created_at: new Date(),
  ...overrides,
});
