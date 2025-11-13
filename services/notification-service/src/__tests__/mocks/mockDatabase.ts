export class MockDatabase {
  private data: Map<string, any[]> = new Map();

  async query(sql: string, params: any[] = []): Promise<any> {
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

  clearAll() {
    this.data.clear();
  }
}

export const mockDatabase = new MockDatabase();
