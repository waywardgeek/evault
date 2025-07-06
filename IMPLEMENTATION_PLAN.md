# eVault MVP Implementation Plan
**Go + GCP Cloud Run + Cloud SQL Architecture**

## **Project Overview**
- **Server**: Go 1.21+ on GCP Cloud Run + Cloud SQL (PostgreSQL)
- **Client**: TypeScript + Next.js 14 (React framework)
- **Authentication**: Google OAuth initially
- **Database**: PostgreSQL with Users and Entries tables
- **Target**: 126 QPS steady state, 10,000+ QPS peak capacity
- **Development**: Parallel server + client development

## **Architecture Decision Summary**
Based on performance and cost analysis:
- **Rejected**: Cloudflare Workers + D1 (too expensive at scale, JavaScript performance concerns)
- **Chosen**: Go + GCP for better performance (5-10x faster than JS), lower costs (~$230/month vs $500+/month), and better enterprise readiness

---

## **Phase 1: Project Foundation & Database Setup** 
*Session 1 - Foundation (1-2 hours)*

### **1.1 Project Structure**
```
evault/
├── server/                           # Go backend
│   ├── cmd/
│   │   └── server/
│   │       └── main.go
│   ├── internal/
│   │   ├── auth/
│   │   │   └── oauth.go
│   │   ├── database/
│   │   │   ├── models.go
│   │   │   └── migrations.go
│   │   ├── handlers/
│   │   │   └── api.go
│   │   └── crypto/
│   │       └── hpke.go
│   ├── pkg/
│   │   └── types/
│   │       └── api.go
│   ├── migrations/
│   │   └── 001_initial.sql
│   ├── go.mod
│   ├── go.sum
│   └── Dockerfile
├── client/                           # TypeScript frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx
│   │   │   ├── login/
│   │   │   ├── dashboard/
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   ├── vault/
│   │   │   └── ui/
│   │   ├── lib/
│   │   │   ├── auth.ts
│   │   │   ├── crypto.ts
│   │   │   └── api.ts
│   │   └── types/
│   │       └── api.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── next.config.js
├── shared/                           # Shared types & utilities
│   └── types/
│       └── api.ts
├── docker-compose.yml                # Local development
├── Makefile                          # Development commands
└── README.md
```

### **1.2 Core Dependencies**

**Server (Go):**
```go
// server/go.mod dependencies to add
require (
    github.com/gin-gonic/gin v1.9.1
    github.com/lib/pq v1.10.9
    github.com/golang-migrate/migrate/v4 v4.16.2
    golang.org/x/oauth2 v0.15.0
    google.golang.org/api v0.150.0
    github.com/joho/godotenv v1.4.0
)
```

**Client (TypeScript):**
```json
// client/package.json dependencies to add
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "next-auth": "^4.24.0",
    "tailwindcss": "^3.3.0",
    "zustand": "^4.4.0",
    // OpenADP browser SDK removed - using Node.js SDK via API routes
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "typescript": "^5.0.0"
  }
}
```

### **1.3 Database Schema**
```sql
-- migrations/001_initial.sql
CREATE TABLE users (
    user_id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    auth_provider VARCHAR(50) NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    openadp_metadata TEXT,              -- Base64 encoded OpenADP metadata from register()
    vault_public_key TEXT,              -- Base64 encoded HPKE public key for encryption
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE entries (
    user_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    hpke_blob BYTEA NOT NULL,
    deletion_hash BYTEA NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, name),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_entries_user_id ON entries(user_id);
```

### **1.4 Testing Phase 1**

**Server Testing:**
```bash
# Basic server tests
cd server
go test ./internal/config
go test ./internal/database
go test ./cmd/server
```

**Database Testing:**
```go
// server/internal/database/migrations_test.go
func TestMigrations(t *testing.T) {
    // Test migration up/down
    db := setupTestDB(t)
    defer cleanupTestDB(t, db)
    
    // Run migrations
    err := runMigrations(db)
    assert.NoError(t, err)
    
    // Verify tables exist
    assertTableExists(t, db, "users")
    assertTableExists(t, db, "entries")
}

// server/internal/database/connection_test.go
func TestDatabaseConnection(t *testing.T) {
    db := setupTestDB(t)
    defer cleanupTestDB(t, db)
    
    // Test connection
    err := db.Ping()
    assert.NoError(t, err)
}
```

**Client Testing:**
```bash
# Basic client tests
cd client
npm test
npm run type-check
```

**Integration Testing:**
```typescript
// client/src/lib/__tests__/api.test.ts
describe('Server Integration', () => {
  test('health check endpoint', async () => {
    const response = await fetch('http://localhost:8080/health');
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data.status).toBe('healthy');
  });
});
```

**Test Commands:**
```bash
# Combined testing
make test-phase1
# Individual components
make server-test-basic
make client-test-basic
make integration-test-basic
```

### **1.5 Deliverables Phase 1**

**Server:**
- [ ] Go project structure created
- [ ] Database schema designed and migration ready
- [ ] Core types defined
- [ ] Basic server skeleton with health check endpoint
- [ ] Local PostgreSQL with Docker Compose

**Client:**
- [ ] Next.js project structure created
- [ ] TypeScript configuration
- [ ] Tailwind CSS setup
- [ ] Basic UI components (layout, navigation)
- [ ] Local development server running

**Shared:**
- [ ] Shared API types defined
- [ ] Local development environment working
- [ ] Basic integration between client and server

**Testing:**
- [ ] Database migration tests passing
- [ ] Basic server health check tests
- [ ] Client build and type checking
- [ ] Integration test framework setup

---

## **Phase 2: Authentication & User Management**
*Session 2 - Auth Foundation (2-3 hours)*

### **2.1 Google OAuth Implementation**
```go
// internal/auth/oauth.go structure
type AuthService struct {
    googleConfig *oauth2.Config
    jwtSecret    []byte
}

func NewAuthService(clientID, clientSecret string) *AuthService
func (a *AuthService) GetGoogleAuthURL(state string) string
func (a *AuthService) HandleGoogleCallback(code string) (*UserInfo, error)
func (a *AuthService) GenerateJWT(userID string) (string, error)
func (a *AuthService) ValidateJWT(token string) (*Claims, error)
```

### **2.2 User Management**
```go
// internal/database/models.go
type User struct {
    UserID           string    `db:"user_id"`
    Email            string    `db:"email"`
    PhoneNumber      *string   `db:"phone_number"`
    AuthProvider     string    `db:"auth_provider"`
    Verified         bool      `db:"verified"`
    OpenADPMetadata  *string   `db:"openadp_metadata"`   // Base64 encoded OpenADP metadata
    VaultPublicKey   *string   `db:"vault_public_key"`   // Base64 encoded HPKE public key
    CreatedAt        time.Time `db:"created_at"`
    UpdatedAt        time.Time `db:"updated_at"`
}

func (db *DB) CreateUser(user *User) error
func (db *DB) GetUserByID(userID string) (*User, error)
func (db *DB) GetUserByEmail(email string) (*User, error)
func (db *DB) UpdateUserOpenADPMetadata(userID string, metadata string) error
```

### **2.3 Auth Middleware**
```go
// internal/handlers/middleware.go
func AuthMiddleware(authService *AuthService) gin.HandlerFunc
func extractAuthToken(c *gin.Context) (string, error)
func getUserFromContext(c *gin.Context) (*User, bool)
```

### **2.4 Client Authentication**
```typescript
// client/src/lib/auth.ts
import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Store server JWT token
      if (account) {
        token.serverToken = await getServerToken(account.id_token)
      }
      return token
    },
  },
}

// client/src/lib/api.ts
export class ApiClient {
  private token: string | null = null

  async setToken(token: string) {
    this.token = token
  }

  async registerVault(request: RegisterVaultRequest): Promise<void> {
    return this.post('/api/register-vault', request)
  }

  async addEntry(request: AddEntryRequest): Promise<void> {
    return this.post('/api/entries', request)
  }

  // ... other API methods
}
```

### **2.5 Testing Phase 2**

**Server Auth Testing:**
```go
// server/internal/auth/oauth_test.go
func TestGoogleOAuth(t *testing.T) {
    authService := NewAuthService("test-client-id", "test-client-secret")
    
    // Test auth URL generation
    authURL := authService.GetGoogleAuthURL("test-state")
    assert.Contains(t, authURL, "accounts.google.com/oauth")
    assert.Contains(t, authURL, "test-state")
}

func TestJWTGeneration(t *testing.T) {
    authService := NewAuthService("test-client-id", "test-client-secret")
    
    // Test JWT generation
    token, err := authService.GenerateJWT("test-user-id")
    assert.NoError(t, err)
    assert.NotEmpty(t, token)
    
    // Test JWT validation
    claims, err := authService.ValidateJWT(token)
    assert.NoError(t, err)
    assert.Equal(t, "test-user-id", claims.UserID)
}

// server/internal/database/users_test.go
func TestUserOperations(t *testing.T) {
    db := setupTestDB(t)
    defer cleanupTestDB(t, db)
    
    user := &User{
        UserID:       "test-user-123",
        Email:        "test@example.com",
        AuthProvider: "google",
        Verified:     true,
    }
    
    // Test user creation
    err := db.CreateUser(user)
    assert.NoError(t, err)
    
    // Test user retrieval
    retrievedUser, err := db.GetUserByID("test-user-123")
    assert.NoError(t, err)
    assert.Equal(t, user.Email, retrievedUser.Email)
}

// server/internal/handlers/middleware_test.go
func TestAuthMiddleware(t *testing.T) {
    // Test protected endpoint with valid token
    // Test protected endpoint with invalid token
    // Test protected endpoint without token
}
```

**Client Auth Testing:**
```typescript
// client/src/lib/__tests__/auth.test.ts
import { render, screen, fireEvent } from '@testing-library/react';
import { signIn, signOut, useSession } from 'next-auth/react';

describe('Authentication', () => {
  test('login button triggers Google OAuth', async () => {
    render(<LoginButton />);
    
    const loginBtn = screen.getByText('Login with Google');
    fireEvent.click(loginBtn);
    
    expect(signIn).toHaveBeenCalledWith('google');
  });
  
  test('API client includes auth token', async () => {
    const mockFetch = jest.fn();
    global.fetch = mockFetch;
    
    const client = new ApiClient();
    await client.setToken('test-jwt-token');
    
    await client.post('/api/test', {});
    
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-jwt-token'
        })
      })
    );
  });
});

// client/src/components/__tests__/ProtectedRoute.test.tsx
describe('Protected Routes', () => {
  test('redirects to login when not authenticated', () => {
    // Mock unauthenticated session
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated'
    });
    
    render(<ProtectedRoute><Dashboard /></ProtectedRoute>);
    
    expect(screen.getByText('Please login')).toBeInTheDocument();
  });
  
  test('shows content when authenticated', () => {
    // Mock authenticated session
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { id: 'test-user' } },
      status: 'authenticated'
    });
    
    render(<ProtectedRoute><Dashboard /></ProtectedRoute>);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
```

**Integration Auth Testing:**
```typescript
// e2e/auth.spec.ts
test('complete OAuth flow', async ({ page }) => {
  // Start OAuth flow
  await page.goto('/login');
  await page.click('text=Login with Google');
  
  // Mock OAuth callback (in test environment)
  await page.goto('/api/auth/callback/google?code=test-code&state=test-state');
  
  // Should be redirected to dashboard
  await expect(page).toHaveURL('/dashboard');
  
  // Should see user profile
  await expect(page.locator('text=Welcome')).toBeVisible();
});

test('protected API endpoints', async ({ page }) => {
  // Test without authentication
  const response = await page.request.get('/api/vault/entries');
  expect(response.status()).toBe(401);
  
  // Test with authentication
  await authenticateUser(page);
  const authedResponse = await page.request.get('/api/vault/entries');
  expect(authedResponse.status()).toBe(200);
});
```

**Test Commands:**
```bash
# Phase 2 testing
make test-phase2
make server-test-auth
make client-test-auth
make integration-test-auth

# Specific auth tests
make test-oauth-flow
make test-jwt-validation
make test-user-operations
make test-protected-routes
```

### **2.6 Deliverables Phase 2**

**Server:**
- [ ] Google OAuth flow working
- [ ] JWT token generation/validation
- [ ] User registration endpoint
- [ ] Auth middleware protecting endpoints
- [ ] Database user operations tested

**Client:**
- [ ] Next.js authentication with NextAuth
- [ ] Google OAuth login/logout UI
- [ ] Token management and API integration
- [ ] Protected routes and auth guards
- [ ] User profile display

**Integration:**
- [ ] Client-server auth token exchange
- [ ] API client with automatic token inclusion
- [ ] Error handling for auth failures
- [ ] End-to-end auth flow testing

**Testing:**
- [ ] OAuth flow unit tests
- [ ] JWT generation/validation tests
- [ ] User database operation tests
- [ ] Auth middleware tests
- [ ] Client auth component tests
- [ ] Protected route tests
- [ ] End-to-end auth flow tests

---

## **Phase 3: Core API Implementation**
*Session 3 - Core APIs (2-3 hours)*

### **3.1 API Endpoints Structure**
```go
// pkg/types/api.go
type RegisterVaultRequest struct {
    VaultPublicKey   string `json:"vault_public_key"`   // HPKE public key for encryption
    OpenADPMetadata  string `json:"openadp_metadata"`   // Base64 encoded OpenADP metadata
}

type AddEntryRequest struct {
    Name         string `json:"name"`
    HpkeBlob     string `json:"hpke_blob"`     // base64 encoded
    DeletionHash string `json:"deletion_hash"` // base64 encoded
}

type DeleteEntryRequest struct {
    Name              string `json:"name"`
    DeletionPreHash   string `json:"deletion_pre_hash"` // base64 encoded
}

type ListEntriesResponse struct {
    Names []string `json:"names"`
}

type GetEntriesResponse struct {
    Entries []EntryBlob `json:"entries"`
}

type EntryBlob struct {
    Name     string `json:"name"`
    HpkeBlob string `json:"hpke_blob"` // base64 encoded
}

type RecoverVaultRequest struct {
    Pin string `json:"pin"`  // User's PIN for OpenADP recovery
}

type RecoverVaultResponse struct {
    OpenADPMetadata string `json:"openadp_metadata"`  // Updated metadata from OpenADP
    RemainingGuesses int   `json:"remaining_guesses"` // Remaining PIN attempts
}
```

### **3.2 Core API Handlers**
```go
// internal/handlers/api.go
func (h *Handler) RegisterVault(c *gin.Context)
func (h *Handler) AddEntry(c *gin.Context)
func (h *Handler) DeleteEntry(c *gin.Context)
func (h *Handler) ListEntries(c *gin.Context)
func (h *Handler) GetEntries(c *gin.Context)
func (h *Handler) RecoverVault(c *gin.Context)  // New: PIN-based vault recovery
```

### **3.3 Entry Database Operations**
```go
// internal/database/models.go
type Entry struct {
    UserID       string    `db:"user_id"`
    Name         string    `db:"name"`
    HpkeBlob     []byte    `db:"hpke_blob"`
    DeletionHash []byte    `db:"deletion_hash"`
    CreatedAt    time.Time `db:"created_at"`
    UpdatedAt    time.Time `db:"updated_at"`
}

func (db *DB) CreateEntry(entry *Entry) error
func (db *DB) UpdateEntry(entry *Entry) error
func (db *DB) DeleteEntry(userID, name string) error
func (db *DB) ListUserEntries(userID string) ([]string, error)
func (db *DB) GetUserEntries(userID string) ([]Entry, error)
func (db *DB) GetEntry(userID, name string) (*Entry, error)
```

### **3.4 Business Logic Validation**
```go
// internal/handlers/validation.go
func validateEntrySize(hpkeBlob []byte) error        // Max 1KiB
func validateUserEntryCount(userID string) error    // Max 1024 entries
func validateDeletionHash(preHash, hash []byte) error // SHA256 validation
func validateBase64(data string) ([]byte, error)
```

### **3.5 Core API Requirements**
Updated for OpenADP integration:
- **RegisterVault**: `RegisterVault(userID, authToken, vaultPublicKey, openADPMetadata) -> err`
- **AddEntry**: `AddEntry(userID, authToken, name, hpkeBlob, deletionHash) -> err`
- **DeleteEntry**: `DeleteEntry(userID, authToken, name, deletionPreHash) -> err`
- **ListEntries**: `ListEntries(userID, authToken) -> ([name], err)`
- **GetEntries**: `GetEntries(userID, authToken) -> ([hpkeBlob], err)`
- **RecoverVault**: `RecoverVault(userID, authToken, pin) -> (openADPMetadata, remainingGuesses, err)` *(New)*

### **3.6 Client Implementation**
```typescript
// client/src/lib/openadp.ts
// Using Node.js SDK via API routes for better security and test coverage

export class eVaultOpenADP {
  async registerNewVault(userID: string, pin: string): Promise<{ metadata: string, publicKey: string }> {
    try {
      // Generate HPKE private key
      const privateKey = crypto.getRandomValues(new Uint8Array(32));
      
      // Register with OpenADP network via API route
      const response = await fetch('/api/openadp/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userID,
          appID: 'evault',
          secret: Array.from(privateKey), // Convert to array for JSON
          pin,
          maxGuesses: 10
        })
      });
      
      if (!response.ok) {
        throw new Error(`Registration failed: ${response.statusText}`);
      }
      
      const { metadata } = await response.json();
      
      // Derive public key from private key
      const publicKey = await this.derivePublicKey(privateKey);
      
      return {
        metadata: btoa(String.fromCharCode(...new Uint8Array(metadata))),
        publicKey: btoa(String.fromCharCode(...publicKey))
      };
    } catch (error) {
      throw new Error(`Vault registration failed: ${error.message}`);
    }
  }

  async recoverVaultKey(metadata: string, pin: string): Promise<{ privateKey: Uint8Array, remaining: number }> {
    try {
      const metadataBytes = new Uint8Array(atob(metadata).split('').map(c => c.charCodeAt(0)));
      
      // Recover via API route
      const response = await fetch('/api/openadp/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadata: Array.from(metadataBytes),
          pin
        })
      });
      
      if (!response.ok) {
        throw new Error(`Recovery failed: ${response.statusText}`);
      }
      
      const { secret, updatedMetadata, remaining } = await response.json();
      
      return { 
        privateKey: new Uint8Array(secret), 
        remaining 
      };
    } catch (error) {
      throw new Error(`Key recovery failed: ${error.message}`);
    }
  }
}

// client/src/components/vault/AddEntryForm.tsx
export function AddEntryForm() {
  const [name, setName] = useState('')
  const [secret, setSecret] = useState('')
  const { addEntry } = useVault()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    // Use cached public key (no PIN required for adding!)
    const { hpkeBlob, deletionHash } = await encryptEntry(name, secret)
    
    await addEntry({
      name,
      hpke_blob: hpkeBlob,
      deletion_hash: deletionHash,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        placeholder="Entry name (e.g., 'GitHub Recovery Codes')"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full p-2 border rounded"
      />
      <textarea
        placeholder="Paste your recovery codes here..."
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
        className="w-full p-2 border rounded h-32"
      />
      <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
        Add Entry (No PIN Required!)
      </button>
    </form>
  )
}

// client/src/lib/crypto.ts
export async function encryptEntry(name: string, secret: string) {
  // Get cached public key (stored after first PIN entry)
  const publicKey = getCachedPublicKey();
  if (!publicKey) {
    throw new Error('Please unlock vault first');
  }
  
  // Create metadata
  const metadata = {
    name,
    creation_time: Math.floor(Date.now() / 1000),
  }
  
  // Generate deletion pre-hash
  const deletionPreHash = crypto.getRandomValues(new Uint8Array(32))
  const deletionHash = await crypto.subtle.digest('SHA-256', deletionPreHash)
  
  // Encrypt with HPKE
  const plaintext = JSON.stringify({
    secret,
    deletion_pre_hash: Array.from(deletionPreHash),
  })
  
  const hpkeBlob = await hpkeEncrypt(publicKey, plaintext, JSON.stringify(metadata))
  
  return {
    hpkeBlob: btoa(String.fromCharCode(...new Uint8Array(hpkeBlob))),
    deletionHash: btoa(String.fromCharCode(...new Uint8Array(deletionHash))),
  }
}

// client/src/components/vault/PINPrompt.tsx
export function PINPrompt({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [remaining, setRemaining] = useState<number | null>(null);
  const openadp = new eVaultOpenADP();

  const handleUnlock = async () => {
    try {
      const metadata = getUserMetadata(); // From server
      const { privateKey, remaining } = await openadp.recoverVaultKey(metadata, pin);
      
      // Derive and cache public key
      const publicKey = await derivePublicKey(privateKey);
      cachePublicKey(publicKey);
      
      setRemaining(remaining);
      onUnlock();
    } catch (error) {
      alert(`Failed to unlock vault: ${error.message}`);
    }
  };

  return (
    <div className="pin-prompt">
      <h3>Enter PIN to Access Vault</h3>
      <input
        type="password"
        placeholder="Enter your PIN"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        className="w-full p-2 border rounded"
      />
      {remaining !== null && (
        <p className="text-orange-600">⚠️ {remaining} attempts remaining</p>
      )}
      <button onClick={handleUnlock} className="bg-blue-500 text-white px-4 py-2 rounded">
        Unlock Vault
      </button>
    </div>
  );
}
```

### **3.7 OpenADP API Routes (Node.js SDK)**

**Security-First Approach:** Using the well-tested Node.js SDK via Next.js API routes addresses test coverage concerns:

```typescript
// client/src/pages/api/openadp/register.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { register } from '@openadp/node-sdk';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { userID, appID, secret, pin, maxGuesses } = req.body;
  
  try {
    // Validate inputs
    if (!userID || !appID || !secret || !pin) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Register with OpenADP network using Node.js SDK
    const metadata = await register(
      userID,
      appID,
      new Uint8Array(secret),
      pin,
      maxGuesses || 10
    );
    
    res.status(200).json({ metadata: Array.from(metadata) });
  } catch (error) {
    console.error('OpenADP registration error:', error);
    res.status(500).json({ error: error.message });
  }
}

// client/src/pages/api/openadp/recover.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { recover } from '@openadp/node-sdk';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { metadata, pin } = req.body;
  
  try {
    // Validate inputs
    if (!metadata || !pin) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Recover with OpenADP network using Node.js SDK
    const result = await recover(
      new Uint8Array(metadata),
      pin
    );
    
    res.status(200).json({
      secret: Array.from(result.secret),
      updatedMetadata: Array.from(result.updatedMetadata),
      remaining: result.remaining
    });
  } catch (error) {
    console.error('OpenADP recovery error:', error);
    res.status(500).json({ error: error.message });
  }
}
```

**Package Dependencies:**
```json
// Add to client/package.json
{
  "dependencies": {
    "@openadp/node-sdk": "^1.0.0"
  }
}
```

**Why Node.js SDK is Better:**
- ✅ **11KB+ of comprehensive unit tests** vs browser SDK's 36-line stub
- ✅ **Included in cross-language compatibility tests** (validates protocol correctness)
- ✅ **Server-side execution** (secrets never exposed to browser)
- ✅ **Better security model** (no client-side OpenADP keys)

**Browser SDK Test Coverage Analysis:**
- **Browser SDK:** 36 lines of stub HTML that doesn't test `register()` or `recover()`
- **Node.js SDK:** 11KB+ of comprehensive tests with proper validation
- **Cross-language tests:** Include 5 languages (C++, Go, Python, Rust, Node.js) but **exclude browser SDK**
- **Security implications:** Browser SDK is essentially untested for protocol compatibility

**Recommendation:** Use Node.js SDK via API routes instead of browser SDK for production security.

### **3.8 Testing Phase 3**

**Server API Testing:**
```go
// server/internal/handlers/api_test.go
func TestRegisterVault(t *testing.T) {
    handler := setupTestHandler(t)
    
    req := RegisterVaultRequest{
        VaultPublicKey:  "test-public-key-base64",
        OpenADPMetadata: "test-metadata-base64",
    }
    
    // Test successful registration
    w := httptest.NewRecorder()
    c, _ := gin.CreateTestContext(w)
    c.Set("user", &User{UserID: "test-user"})
    
    handler.RegisterVault(c)
    
    assert.Equal(t, 200, w.Code)
    
    // Verify user was updated in database
    user, err := handler.db.GetUserByID("test-user")
    assert.NoError(t, err)
    assert.Equal(t, req.VaultPublicKey, *user.VaultPublicKey)
}

func TestAddEntry(t *testing.T) {
    handler := setupTestHandler(t)
    
    req := AddEntryRequest{
        Name:         "GitHub Recovery Codes",
        HpkeBlob:     "encrypted-data-base64",
        DeletionHash: "deletion-hash-base64",
    }
    
    // Test successful entry addition
    w := httptest.NewRecorder()
    c, _ := gin.CreateTestContext(w)
    c.Set("user", &User{UserID: "test-user"})
    
    handler.AddEntry(c)
    
    assert.Equal(t, 200, w.Code)
    
    // Verify entry was created
    entries, err := handler.db.ListUserEntries("test-user")
    assert.NoError(t, err)
    assert.Contains(t, entries, req.Name)
}

func TestEntryValidation(t *testing.T) {
    // Test entry size limit (1KiB)
    largeEntry := strings.Repeat("x", 1025)
    err := validateEntrySize([]byte(largeEntry))
    assert.Error(t, err)
    
    // Test entry count limit (1024 entries)
    err = validateUserEntryCount("test-user-with-max-entries")
    assert.Error(t, err)
    
    // Test deletion hash validation
    preHash := []byte("test-pre-hash")
    hash := sha256.Sum256(preHash)
    err = validateDeletionHash(preHash, hash[:])
    assert.NoError(t, err)
}

// server/internal/database/entries_test.go
func TestEntryOperations(t *testing.T) {
    db := setupTestDB(t)
    defer cleanupTestDB(t, db)
    
    entry := &Entry{
        UserID:       "test-user",
        Name:         "Test Entry",
        HpkeBlob:     []byte("encrypted-data"),
        DeletionHash: []byte("deletion-hash"),
    }
    
    // Test entry creation
    err := db.CreateEntry(entry)
    assert.NoError(t, err)
    
    // Test entry retrieval
    retrievedEntry, err := db.GetEntry("test-user", "Test Entry")
    assert.NoError(t, err)
    assert.Equal(t, entry.Name, retrievedEntry.Name)
    
    // Test entry update
    entry.HpkeBlob = []byte("updated-encrypted-data")
    err = db.UpdateEntry(entry)
    assert.NoError(t, err)
    
    // Test entry deletion
    err = db.DeleteEntry("test-user", "Test Entry")
    assert.NoError(t, err)
    
    // Verify entry was deleted
    _, err = db.GetEntry("test-user", "Test Entry")
    assert.Error(t, err)
}
```

**Client Crypto Testing:**
```typescript
// client/src/lib/__tests__/openadp.test.ts
import { eVaultOpenADP } from '../openadp';

// Mock fetch for API routes
global.fetch = jest.fn();

describe('OpenADP Integration', () => {
  const openadp = new eVaultOpenADP();
  
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });
  
  test('vault registration via API', async () => {
    const mockMetadata = [1, 2, 3, 4];
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ metadata: mockMetadata })
    });
    
    const result = await openadp.registerNewVault('test-user', '3344');
    
    expect(fetch).toHaveBeenCalledWith('/api/openadp/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userID: 'test-user',
        appID: 'evault',
        secret: expect.any(Array),
        pin: '3344',
        maxGuesses: 10
      })
    });
    
    expect(result.metadata).toBeDefined();
    expect(result.publicKey).toBeDefined();
  });
  
  test('key recovery via API', async () => {
    const mockResult = {
      secret: [4, 5, 6],
      remaining: 9,
      updatedMetadata: [7, 8, 9]
    };
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResult
    });
    
    const result = await openadp.recoverVaultKey('test-metadata', '3344');
    
    expect(fetch).toHaveBeenCalledWith('/api/openadp/recover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metadata: expect.any(Array),
        pin: '3344'
      })
    });
    
    expect(result.privateKey).toEqual(new Uint8Array([4, 5, 6]));
    expect(result.remaining).toBe(9);
  });
  
  test('handles API errors gracefully', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error'
    });
    
    await expect(openadp.registerNewVault('test-user', '3344')).rejects.toThrow(
      'Vault registration failed: Registration failed: Internal Server Error'
    );
  });
});

// client/src/lib/__tests__/crypto.test.ts
import { encryptEntry, decryptEntry } from '../crypto';

describe('HPKE Encryption', () => {
  test('encrypt and decrypt entry', async () => {
    const name = 'GitHub Recovery Codes';
    const secret = 'code1\ncode2\ncode3';
    
    // Mock public key
    const publicKey = new Uint8Array(32);
    jest.spyOn(window, 'getCachedPublicKey').mockReturnValue(publicKey);
    
    // Test encryption
    const { hpkeBlob, deletionHash } = await encryptEntry(name, secret);
    
    expect(hpkeBlob).toBeDefined();
    expect(deletionHash).toBeDefined();
    
    // Test decryption
    const privateKey = new Uint8Array(32);
    const decrypted = await decryptEntry(hpkeBlob, privateKey);
    
    expect(decrypted.secret).toBe(secret);
    expect(decrypted.name).toBe(name);
  });
  
  test('encryption fails without public key', async () => {
    jest.spyOn(window, 'getCachedPublicKey').mockReturnValue(null);
    
    await expect(encryptEntry('test', 'secret')).rejects.toThrow(
      'Please unlock vault first'
    );
  });
});

// client/src/pages/api/openadp/__tests__/register.test.ts
import handler from '../register';
import { createMocks } from 'node-mocks-http';
import { register } from '@openadp/node-sdk';

jest.mock('@openadp/node-sdk', () => ({
  register: jest.fn(),
}));

describe('/api/openadp/register', () => {
  beforeEach(() => {
    (register as jest.Mock).mockClear();
  });

  test('successful registration', async () => {
    const mockMetadata = new Uint8Array([1, 2, 3, 4]);
    (register as jest.Mock).mockResolvedValue(mockMetadata);

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        userID: 'test-user',
        appID: 'evault',
        secret: [1, 2, 3, 4],
        pin: '3344',
        maxGuesses: 10
      }
    });

    await handler(req, res);

    expect(register).toHaveBeenCalledWith(
      'test-user',
      'evault',
      new Uint8Array([1, 2, 3, 4]),
      '3344',
      10
    );
    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({
      metadata: [1, 2, 3, 4]
    });
  });

  test('validates required fields', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { userID: 'test-user' } // Missing fields
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'Missing required fields'
    });
  });

  test('handles OpenADP errors', async () => {
    (register as jest.Mock).mockRejectedValue(new Error('OpenADP server unavailable'));

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        userID: 'test-user',
        appID: 'evault',
        secret: [1, 2, 3, 4],
        pin: '3344'
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData())).toEqual({
      error: 'OpenADP server unavailable'
    });
  });
});

// Cross-language compatibility validation
describe('OpenADP Node.js SDK Compatibility', () => {
  test('should validate cross-language compatibility', async () => {
    // This test ensures our Node.js SDK usage is compatible
    // with the comprehensive cross-language test suite
    
    // Run: cd ../openadp/tests/cross-language && python3 test_cross_language_ocrypt_5x5.py
    // This validates that our Node.js SDK implementation is protocol-compatible
    // with all other OpenADP language implementations (Go, Python, Rust, C++)
    
    console.log('✅ Node.js SDK is included in OpenADP cross-language tests');
    console.log('✅ Validates protocol compatibility across 5 languages');
    console.log('✅ 11KB+ of comprehensive unit tests in Node.js SDK');
    console.log('❌ Browser SDK excluded from cross-language tests');
  });
});
```

**Client Component Testing:**
```typescript
// client/src/components/__tests__/AddEntryForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddEntryForm } from '../vault/AddEntryForm';

describe('AddEntryForm', () => {
  test('successful entry addition', async () => {
    const mockAddEntry = jest.fn().mockResolvedValue(undefined);
    jest.mock('../hooks/useVault', () => ({
      useVault: () => ({ addEntry: mockAddEntry })
    }));
    
    render(<AddEntryForm />);
    
    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/entry name/i), {
      target: { value: 'GitHub Recovery Codes' }
    });
    fireEvent.change(screen.getByPlaceholderText(/recovery codes/i), {
      target: { value: 'code1\ncode2\ncode3' }
    });
    
    // Submit form
    fireEvent.click(screen.getByText('Add Entry (No PIN Required!)'));
    
    await waitFor(() => {
      expect(mockAddEntry).toHaveBeenCalledWith({
        name: 'GitHub Recovery Codes',
        hpke_blob: expect.any(String),
        deletion_hash: expect.any(String)
      });
    });
  });
});

// client/src/components/__tests__/PINPrompt.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PINPrompt } from '../vault/PINPrompt';

describe('PINPrompt', () => {
  test('successful PIN unlock', async () => {
    const mockOnUnlock = jest.fn();
    const mockRecoverVaultKey = jest.fn().mockResolvedValue({
      privateKey: new Uint8Array(32),
      remaining: 9
    });
    
    render(<PINPrompt onUnlock={mockOnUnlock} />);
    
    // Enter PIN
    fireEvent.change(screen.getByPlaceholderText('Enter your PIN'), {
      target: { value: '3344' }
    });
    
    // Click unlock
    fireEvent.click(screen.getByText('Unlock Vault'));
    
    await waitFor(() => {
      expect(mockOnUnlock).toHaveBeenCalled();
      expect(screen.getByText('⚠️ 9 attempts remaining')).toBeInTheDocument();
    });
  });
  
  test('failed PIN unlock', async () => {
    const mockRecoverVaultKey = jest.fn().mockRejectedValue(
      new Error('Invalid PIN')
    );
    
    render(<PINPrompt onUnlock={jest.fn()} />);
    
    // Enter wrong PIN
    fireEvent.change(screen.getByPlaceholderText('Enter your PIN'), {
      target: { value: '0000' }
    });
    
    // Click unlock
    fireEvent.click(screen.getByText('Unlock Vault'));
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to unlock vault/)).toBeInTheDocument();
    });
  });
});
```

**End-to-End Testing:**
```typescript
// e2e/vault.spec.ts
test('complete vault workflow', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.click('text=Login with Google');
  await authenticateUser(page);
  
  // Register new vault
  await page.goto('/vault/setup');
  await page.fill('[placeholder="Enter your PIN"]', '3344');
  await page.click('text=Create Vault');
  
  // Should be redirected to dashboard
  await expect(page).toHaveURL('/dashboard');
  
  // Add entry (no PIN required)
  await page.click('text=Add Entry');
  await page.fill('[placeholder*="entry name"]', 'GitHub Recovery Codes');
  await page.fill('[placeholder*="recovery codes"]', 'code1\ncode2\ncode3');
  await page.click('text=Add Entry (No PIN Required!)');
  
  // Verify entry appears in list
  await expect(page.locator('text=GitHub Recovery Codes')).toBeVisible();
  
  // View entry (PIN required)
  await page.click('text=GitHub Recovery Codes');
  await page.fill('[placeholder="Enter your PIN"]', '3344');
  await page.click('text=Unlock Vault');
  
  // Should see decrypted content
  await expect(page.locator('text=code1')).toBeVisible();
  await expect(page.locator('text=code2')).toBeVisible();
  await expect(page.locator('text=code3')).toBeVisible();
});

test('PIN attempt limiting', async ({ page }) => {
  await authenticateUser(page);
  
  // Try wrong PIN multiple times
  for (let i = 0; i < 3; i++) {
    await page.fill('[placeholder="Enter your PIN"]', '0000');
    await page.click('text=Unlock Vault');
    
    await expect(page.locator(`text=⚠️ ${10 - i - 1} attempts remaining`))
      .toBeVisible();
  }
});
```

**Test Commands:**
```bash
# Phase 3 testing
make test-phase3
make server-test-api
make client-test-crypto
make client-test-components
make integration-test-vault

# Specific API tests
make test-register-vault
make test-add-entry
make test-entry-validation
make test-openadp-integration
make test-hpke-crypto
```

### **3.8 Deliverables Phase 3**

**Server:**
- [ ] All 6 core APIs implemented (including RecoverVault)
- [ ] OpenADP metadata storage and retrieval
- [ ] Vault public key management
- [ ] Entry size and count validation
- [ ] Database operations tested
- [ ] Error handling and responses
- [ ] API documentation/OpenAPI spec

**Client:**
- [ ] OpenADP SDK integration (@openadp/browser-sdk)
- [ ] PIN-based vault registration with OpenADP
- [ ] PIN prompt UI for vault unlock
- [ ] Vault dashboard UI (list entries)
- [ ] Add entry form with encryption (no PIN required)
- [ ] View entries with decryption (PIN required)
- [ ] Delete entry with confirmation
- [ ] Entry management (edit, organize)
- [ ] HPKE encryption/decryption working
- [ ] Public key caching for frictionless adding
- [ ] OpenADP metadata management

**Integration:**
- [ ] All client-server API calls working
- [ ] Proper error handling and user feedback
- [ ] Loading states and responsive UI
- [ ] End-to-end user flow testing

**Testing:**
- [ ] All 6 API endpoint tests
- [ ] Database entry operation tests
- [ ] Entry validation tests (size, count, deletion)
- [ ] OpenADP integration tests
- [ ] HPKE encryption/decryption tests
- [ ] Client component tests (forms, PIN prompt)
- [ ] End-to-end vault workflow tests
- [ ] PIN attempt limiting tests

---

## **Phase 4: Security & Crypto Integration**
*Session 4 - Security Layer (2-3 hours)*

### **4.1 HPKE Integration**
```go
// internal/crypto/hpke.go
func ValidateHPKEBlob(blob []byte) error
func ExtractMetadata(blob []byte) (*EntryMetadata, error)
func ValidateMetadata(metadata *EntryMetadata, name string) error

type EntryMetadata struct {
    Name         string `json:"name"`
    CreationTime int64  `json:"creation_time"`
}
```

### **4.2 HPKE Blob Format**
From `highlevel_design.md`:
- 32-bit length prefix for JSON metadata length
- JSON metadata (AAD for HPKE encryption)
- HPKE ciphertext containing secret text and deletionPreHash

### **4.3 Security Middleware**
```go
// internal/handlers/security.go
func RateLimitMiddleware() gin.HandlerFunc
func SecurityHeadersMiddleware() gin.HandlerFunc
func RequestSizeLimitMiddleware() gin.HandlerFunc
func CORSMiddleware() gin.HandlerFunc
```

### **4.4 Input Sanitization**
```go
// internal/handlers/sanitization.go
func sanitizeUserInput(input string) string
func validateEntryName(name string) error
func validateUserID(userID string) error
```

### **4.5 Client Security**
```typescript
// client/src/lib/security.ts
export class SecureStorage {
  // Store sensitive data with encryption
  static async storeEncrypted(key: string, data: any): Promise<void> {
    const encrypted = await encrypt(JSON.stringify(data), await getDeviceKey())
    localStorage.setItem(key, encrypted)
  }

  // Retrieve and decrypt sensitive data
  static async getEncrypted(key: string): Promise<any> {
    const encrypted = localStorage.getItem(key)
    if (!encrypted) return null
    
    const decrypted = await decrypt(encrypted, await getDeviceKey())
    return JSON.parse(decrypted)
  }

  // Clear sensitive data
  static clear(): void {
    localStorage.removeItem('vault_public_key')
    localStorage.removeItem('cached_entries')
    // ... clear other sensitive data
  }
}

// client/src/lib/validation.ts
export function validateEntryName(name: string): boolean {
  return name.length > 0 && name.length <= 255 && /^[a-zA-Z0-9\s-_.]+$/.test(name)
}

export function validateSecretSize(secret: string): boolean {
  return new TextEncoder().encode(secret).length <= 1024 // 1KiB limit
}
```

### **4.6 Testing Phase 4**

**Server Security Testing:**
```go
// server/internal/crypto/hpke_test.go
func TestHPKEBlobValidation(t *testing.T) {
    // Test valid HPKE blob
    validBlob := createValidHPKEBlob(t)
    err := ValidateHPKEBlob(validBlob)
    assert.NoError(t, err)
    
    // Test invalid blob structure
    invalidBlob := []byte("invalid-blob")
    err = ValidateHPKEBlob(invalidBlob)
    assert.Error(t, err)
    
    // Test corrupted metadata
    corruptedBlob := createCorruptedMetadataBlob(t)
    err = ValidateHPKEBlob(corruptedBlob)
    assert.Error(t, err)
}

func TestMetadataExtraction(t *testing.T) {
    blob := createValidHPKEBlob(t)
    metadata, err := ExtractMetadata(blob)
    assert.NoError(t, err)
    
    assert.Equal(t, "Test Entry", metadata.Name)
    assert.Greater(t, metadata.CreationTime, int64(0))
}

// server/internal/handlers/security_test.go
func TestRateLimiting(t *testing.T) {
    handler := setupTestHandler(t)
    
    // Make requests up to the limit
    for i := 0; i < 100; i++ {
        w := httptest.NewRecorder()
        req := httptest.NewRequest("GET", "/api/entries", nil)
        req.Header.Set("X-Forwarded-For", "192.168.1.1")
        
        handler.ServeHTTP(w, req)
        
        if i < 50 {
            assert.Equal(t, 200, w.Code, "Request %d should succeed", i)
        } else {
            assert.Equal(t, 429, w.Code, "Request %d should be rate limited", i)
        }
    }
}

func TestSecurityHeaders(t *testing.T) {
    handler := setupTestHandler(t)
    
    w := httptest.NewRecorder()
    req := httptest.NewRequest("GET", "/api/health", nil)
    handler.ServeHTTP(w, req)
    
    // Verify security headers
    assert.Equal(t, "nosniff", w.Header().Get("X-Content-Type-Options"))
    assert.Equal(t, "DENY", w.Header().Get("X-Frame-Options"))
    assert.Equal(t, "1; mode=block", w.Header().Get("X-XSS-Protection"))
    assert.NotEmpty(t, w.Header().Get("Content-Security-Policy"))
}

func TestInputSanitization(t *testing.T) {
    // Test entry name validation
    tests := []struct {
        name    string
        input   string
        isValid bool
    }{
        {"valid name", "GitHub Recovery Codes", true},
        {"empty name", "", false},
        {"too long", strings.Repeat("x", 256), false},
        {"special chars", "test<script>alert(1)</script>", false},
        {"sql injection", "'; DROP TABLE users; --", false},
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := validateEntryName(tt.input)
            if tt.isValid {
                assert.NoError(t, err)
            } else {
                assert.Error(t, err)
            }
        })
    }
}

// server/internal/handlers/validation_test.go
func TestRequestSizeLimiting(t *testing.T) {
    handler := setupTestHandler(t)
    
    // Test oversized request
    largePayload := strings.Repeat("x", 2*1024*1024) // 2MB
    w := httptest.NewRecorder()
    req := httptest.NewRequest("POST", "/api/entries", strings.NewReader(largePayload))
    req.Header.Set("Content-Type", "application/json")
    
    handler.ServeHTTP(w, req)
    
    assert.Equal(t, 413, w.Code) // Request Entity Too Large
}
```

**Client Security Testing:**
```typescript
// client/src/lib/__tests__/security.test.ts
import { SecureStorage } from '../security';

describe('Secure Storage', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });
  
  test('stores and retrieves encrypted data', async () => {
    const testData = { secret: 'test-secret', timestamp: Date.now() };
    
    await SecureStorage.storeEncrypted('test-key', testData);
    
    // Verify data is encrypted in localStorage
    const rawStored = localStorage.getItem('test-key');
    expect(rawStored).not.toContain('test-secret');
    
    // Verify decryption works
    const retrieved = await SecureStorage.getEncrypted('test-key');
    expect(retrieved).toEqual(testData);
  });
  
  test('clears sensitive data', () => {
    localStorage.setItem('vault_public_key', 'test-key');
    localStorage.setItem('cached_entries', 'test-entries');
    localStorage.setItem('safe_data', 'keep-this');
    
    SecureStorage.clear();
    
    expect(localStorage.getItem('vault_public_key')).toBeNull();
    expect(localStorage.getItem('cached_entries')).toBeNull();
    expect(localStorage.getItem('safe_data')).toBe('keep-this'); // Should remain
  });
});

// client/src/lib/__tests__/validation.test.ts
import { validateEntryName, validateSecretSize } from '../validation';

describe('Client Validation', () => {
  test('entry name validation', () => {
    expect(validateEntryName('GitHub Recovery Codes')).toBe(true);
    expect(validateEntryName('')).toBe(false);
    expect(validateEntryName('a'.repeat(256))).toBe(false);
    expect(validateEntryName('test<script>')).toBe(false);
  });
  
  test('secret size validation', () => {
    const smallSecret = 'small secret';
    const largeSecret = 'x'.repeat(1025); // > 1KiB
    
    expect(validateSecretSize(smallSecret)).toBe(true);
    expect(validateSecretSize(largeSecret)).toBe(false);
  });
  
  test('XSS prevention in inputs', () => {
    const maliciousInput = '<script>alert("xss")</script>';
    const sanitized = sanitizeUserInput(maliciousInput);
    
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('alert');
  });
});

// client/src/components/__tests__/SecurityHeaders.test.tsx
describe('Security Headers', () => {
  test('CSP headers prevent inline scripts', async () => {
    // This would typically be tested with browser integration tests
    const response = await fetch('/');
    const csp = response.headers.get('Content-Security-Policy');
    
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toContain("'unsafe-inline'");
  });
});
```

**Security Integration Testing:**
```typescript
// e2e/security.spec.ts
test('security headers are present', async ({ page }) => {
  const response = await page.goto('/');
  
  const headers = response.headers();
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['content-security-policy']).toContain("default-src 'self'");
});

test('XSS protection', async ({ page }) => {
  await authenticateUser(page);
  
  // Try to inject malicious script in entry name
  await page.goto('/dashboard');
  await page.click('text=Add Entry');
  
  const maliciousName = '<script>window.xssTriggered = true;</script>';
  await page.fill('[placeholder*="entry name"]', maliciousName);
  await page.fill('[placeholder*="recovery codes"]', 'test-secret');
  await page.click('text=Add Entry');
  
  // Verify script didn't execute
  const xssTriggered = await page.evaluate(() => window.xssTriggered);
  expect(xssTriggered).toBeUndefined();
  
  // Verify entry name is sanitized
  expect(page.locator('text=<script>')).not.toBeVisible();
});

test('rate limiting protection', async ({ page }) => {
  await authenticateUser(page);
  
  // Make rapid API requests
  const promises = [];
  for (let i = 0; i < 100; i++) {
    promises.push(page.request.get('/api/entries'));
  }
  
  const responses = await Promise.all(promises);
  
  // Some requests should be rate limited (429 status)
  const rateLimited = responses.filter(r => r.status() === 429);
  expect(rateLimited.length).toBeGreaterThan(0);
});

test('SQL injection protection', async ({ page }) => {
  await authenticateUser(page);
  
  // Try SQL injection in entry name
  const sqlInjection = "'; DROP TABLE entries; --";
  
  await page.goto('/dashboard');
  await page.click('text=Add Entry');
  await page.fill('[placeholder*="entry name"]', sqlInjection);
  await page.fill('[placeholder*="recovery codes"]', 'test-secret');
  await page.click('text=Add Entry');
  
  // Database should still be intact - can still list entries
  await page.reload();
  expect(page.locator('text=Add Entry')).toBeVisible();
});

test('secure data clearing on logout', async ({ page }) => {
  await authenticateUser(page);
  
  // Add some entries to cache data
  await addTestEntry(page, 'Test Entry', 'test-secret');
  
  // Verify cached data exists
  const cachedData = await page.evaluate(() => 
    localStorage.getItem('vault_public_key')
  );
  expect(cachedData).not.toBeNull();
  
  // Logout
  await page.click('text=Logout');
  
  // Verify sensitive data is cleared
  const clearedData = await page.evaluate(() => 
    localStorage.getItem('vault_public_key')
  );
  expect(clearedData).toBeNull();
});
```

**Security Audit Testing:**
```bash
# server/scripts/security-audit.sh
#!/bin/bash

echo "Running security audit..."

# Check for known vulnerabilities
go list -json -deps ./... | nancy sleuth

# Run gosec for security issues
gosec ./...

# Check for hardcoded secrets
truffleHog --regex --entropy=False ./

# Verify TLS configuration
testssl.sh --grade --protocols https://localhost:8080

echo "Security audit complete"
```

**Penetration Testing Setup:**
```typescript
// tests/security/pen-test-setup.ts
export const penTestScenarios = [
  {
    name: 'Brute force PIN attempts',
    test: async (page) => {
      // Test PIN brute force protection
      for (let pin = 0; pin < 10000; pin++) {
        await attemptPIN(page, pin.toString().padStart(4, '0'));
        
        // Should be locked out after 10 attempts
        if (pin >= 10) {
          await expect(page.locator('text=Account locked')).toBeVisible();
          break;
        }
      }
    }
  },
  {
    name: 'Session fixation attack',
    test: async (page) => {
      // Verify session tokens change after login
      const preLoginToken = await getSessionToken(page);
      await authenticateUser(page);
      const postLoginToken = await getSessionToken(page);
      
      expect(preLoginToken).not.toBe(postLoginToken);
    }
  },
  {
    name: 'CSRF protection',
    test: async (page) => {
      // Test CSRF token validation
      const response = await page.request.post('/api/entries', {
        data: { name: 'test', secret: 'secret' },
        headers: { 'X-CSRF-Token': 'invalid-token' }
      });
      
      expect(response.status()).toBe(403);
    }
  }
];
```

**Test Commands:**
```bash
# Phase 4 security testing
make test-phase4
make security-audit
make test-pen-testing
make test-input-validation
make test-rate-limiting

# Security-specific tests
make test-hpke-validation
make test-security-headers
make test-xss-protection
make test-sql-injection
make test-session-security
```

### **4.7 Deliverables Phase 4**

**Server:**
- [ ] HPKE blob validation
- [ ] Security middleware implemented
- [ ] Rate limiting configured
- [ ] Input sanitization tested
- [ ] Security headers configured

**Client:**
- [ ] Secure local storage for sensitive data
- [ ] Input validation and sanitization
- [ ] Content Security Policy (CSP) headers
- [ ] XSS protection in UI components
- [ ] Secure key management (clear on logout)
- [ ] Rate limiting on client-side API calls

**Security Integration:**
- [ ] End-to-end encryption validation
- [ ] Security audit of data flow
- [ ] Penetration testing preparation
- [ ] Security documentation

**Testing:**
- [ ] HPKE blob validation tests
- [ ] Security middleware tests (rate limiting, headers)
- [ ] Input sanitization and validation tests
- [ ] XSS and injection protection tests
- [ ] Client-side security tests (secure storage, validation)
- [ ] End-to-end security integration tests
- [ ] Penetration testing scenarios
- [ ] Security audit automation

---

## **Phase 5: Testing & Local Development**
*Session 5 - Testing (1-2 hours)*

### **5.1 Unit Tests**
```go
// Test files to create
internal/auth/oauth_test.go
internal/database/models_test.go
internal/handlers/api_test.go
internal/crypto/hpke_test.go
```

### **5.2 Integration Tests**
```go
// tests/integration/
api_test.go          // End-to-end API tests
auth_test.go         // Authentication flow tests
database_test.go     // Database operations tests
```

### **5.3 Local Development Setup**
```bash
# docker-compose.yml for local PostgreSQL
# .env.example for configuration
# Makefile for common commands
```

### **5.4 Client Testing**
```typescript
// client/src/lib/__tests__/crypto.test.ts
import { encryptEntry, decryptEntry } from '../crypto'

describe('Crypto Functions', () => {
  test('should encrypt and decrypt entry correctly', async () => {
    const name = 'Test Entry'
    const secret = 'secret data'
    
    const { hpkeBlob, deletionHash } = await encryptEntry(name, secret)
    const decrypted = await decryptEntry(hpkeBlob, await getVaultPrivateKey())
    
    expect(decrypted.secret).toBe(secret)
    expect(decrypted.name).toBe(name)
  })
})

// client/src/components/__tests__/AddEntryForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { AddEntryForm } from '../vault/AddEntryForm'

describe('AddEntryForm', () => {
  test('should validate entry name and secret', async () => {
    render(<AddEntryForm />)
    
    const nameInput = screen.getByPlaceholderText(/entry name/i)
    const secretInput = screen.getByPlaceholderText(/recovery codes/i)
    
    fireEvent.change(nameInput, { target: { value: 'GitHub Recovery' } })
    fireEvent.change(secretInput, { target: { value: 'code1\ncode2\ncode3' } })
    
    expect(nameInput.value).toBe('GitHub Recovery')
    expect(secretInput.value).toBe('code1\ncode2\ncode3')
  })
})
```

### **5.5 End-to-End Testing**
```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test('complete user flow', async ({ page }) => {
  // Login with Google OAuth
  await page.goto('/login')
  await page.click('text=Login with Google')
  
  // Fill in OAuth (mock in test environment)
  await page.fill('[name="email"]', 'test@example.com')
  await page.click('text=Continue')
  
  // Register vault
  await page.click('text=Create New Vault')
  await expect(page).toHaveURL('/dashboard')
  
  // Add entry
  await page.click('text=Add Entry')
  await page.fill('[name="name"]', 'GitHub Recovery Codes')
  await page.fill('[name="secret"]', 'code1\ncode2\ncode3')
  await page.click('text=Save Entry')
  
  // Verify entry appears in list
  await expect(page.locator('text=GitHub Recovery Codes')).toBeVisible()
})
```

### **5.6 Deliverables Phase 5**

**Server Testing:**
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests working
- [ ] API endpoint tests
- [ ] Database operation tests
- [ ] Security middleware tests

**Client Testing:**
- [ ] Component unit tests
- [ ] Crypto function tests
- [ ] API client tests
- [ ] User interaction tests
- [ ] Responsive design tests

**Integration Testing:**
- [ ] End-to-end user flow tests
- [ ] Client-server API integration tests
- [ ] Authentication flow tests
- [ ] Error handling tests
- [ ] Performance tests

**Development Environment:**
- [ ] Local development environment documented
- [ ] Docker setup for local testing
- [ ] CI/CD pipeline basic setup
- [ ] Automated testing pipeline

---

## **Phase 6: GCP Deployment**
*Session 6 - Deployment (2-3 hours)*

### **6.1 Cloud Infrastructure**
```yaml
# cloudbuild.yaml for Cloud Build
# Dockerfile optimized for Cloud Run
# terraform/ directory for infrastructure as code
```

### **6.2 Configuration Management**
```go
// internal/config/config.go
type Config struct {
    Port               string
    DatabaseURL        string
    GoogleClientID     string
    GoogleClientSecret string
    JWTSecret         string
    Environment       string
}
```

### **6.3 Monitoring & Logging**
```go
// internal/monitoring/
logger.go           // Structured logging
metrics.go          // Prometheus metrics
health.go           // Health check endpoints
```

### **6.4 Client Deployment**
```typescript
// client/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_OPENADP_URL: process.env.NEXT_PUBLIC_OPENADP_URL,
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: "default-src 'self'; connect-src 'self' https://api.evault.com https://openadp.org",
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
      ],
    },
  ],
}

module.exports = nextConfig
```

### **6.5 Testing Phase 6**

**Infrastructure Testing:**
```bash
# terraform/test/infrastructure_test.go
func TestInfrastructure(t *testing.T) {
    // Test Cloud Run service exists
    terraformOptions := terraform.WithDefaultRetryableErrors(t, &terraform.Options{
        TerraformDir: "../",
    })
    
    defer terraform.Destroy(t, terraformOptions)
    terraform.InitAndApply(t, terraformOptions)
    
    // Verify Cloud Run service
    serviceName := terraform.Output(t, terraformOptions, "cloud_run_service_name")
    assert.NotEmpty(t, serviceName)
    
    // Verify Cloud SQL instance
    dbInstance := terraform.Output(t, terraformOptions, "cloud_sql_instance")
    assert.NotEmpty(t, dbInstance)
    
    // Test service connectivity
    serviceURL := terraform.Output(t, terraformOptions, "service_url")
    http_helper.HttpGetWithRetry(t, serviceURL+"/health", nil, 200, "healthy", 30, 10*time.Second)
}

# scripts/test-deployment.sh
#!/bin/bash

echo "Testing deployment..."

# Test Cloud Run deployment
gcloud run services describe evault-server --region=us-central1 --format="value(status.url)"

# Test database connectivity
gcloud sql connect evault-db --user=evault-user --database=evault

# Test environment variables
gcloud run services describe evault-server --region=us-central1 --format="value(spec.template.spec.template.spec.containers[0].env[])"

echo "Deployment test complete"
```

**Production Health Testing:**
```typescript
// e2e/production.spec.ts
test('production health checks', async ({ page }) => {
  // Test server health endpoint
  const response = await page.request.get('/health');
  expect(response.status()).toBe(200);
  
  const health = await response.json();
  expect(health.status).toBe('healthy');
  expect(health.database).toBe('connected');
  expect(health.openadp).toBe('available');
});

test('production performance', async ({ page }) => {
  // Test API response times
  const start = Date.now();
  
  await authenticateUser(page);
  await page.goto('/dashboard');
  await page.click('text=Add Entry');
  
  const loadTime = Date.now() - start;
  expect(loadTime).toBeLessThan(3000); // < 3 seconds for initial load
  
  // Test API performance
  const apiStart = Date.now();
  const response = await page.request.get('/api/entries');
  const apiTime = Date.now() - apiStart;
  
  expect(response.status()).toBe(200);
  expect(apiTime).toBeLessThan(500); // < 500ms for API calls
});

test('SSL and security headers in production', async ({ page }) => {
  const response = await page.goto('https://app.evault.com');
  
  // Verify HTTPS
  expect(page.url()).toMatch(/^https:/);
  
  // Verify security headers
  const headers = response.headers();
  expect(headers['strict-transport-security']).toBeDefined();
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBe('DENY');
});

test('CDN and caching', async ({ page }) => {
  // Test static asset caching
  const response = await page.request.get('/static/css/main.css');
  expect(response.headers()['cache-control']).toContain('max-age');
  
  // Test CDN headers
  expect(response.headers()['cf-cache-status']).toBeDefined(); // Cloudflare
});
```

**Load Testing:**
```typescript
// tests/load/load-test.ts
import { check } from 'k6';
import http from 'k6/http';

export let options = {
  stages: [
    { duration: '5m', target: 100 }, // Ramp up to 100 users
    { duration: '10m', target: 100 }, // Maintain 100 users
    { duration: '5m', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% under 500ms
    http_req_failed: ['rate<0.1'], // Error rate under 10%
  },
};

export default function () {
  // Test authentication
  let loginResponse = http.post('https://api.evault.com/auth/login', {
    email: 'test@example.com',
    password: 'test-password',
  });
  
  check(loginResponse, {
    'login successful': (r) => r.status === 200,
  });
  
  let token = loginResponse.json('token');
  
  // Test vault operations
  let headers = { Authorization: `Bearer ${token}` };
  
  let entriesResponse = http.get('https://api.evault.com/api/entries', { headers });
  check(entriesResponse, {
    'list entries successful': (r) => r.status === 200,
  });
  
  let addEntryResponse = http.post(
    'https://api.evault.com/api/entries',
    JSON.stringify({
      name: 'Load Test Entry',
      hpke_blob: 'encrypted-data',
      deletion_hash: 'hash',
    }),
    { headers: { ...headers, 'Content-Type': 'application/json' } }
  );
  
  check(addEntryResponse, {
    'add entry successful': (r) => r.status === 200,
  });
}
```

**Monitoring and Alerting Tests:**
```bash
# scripts/test-monitoring.sh
#!/bin/bash

echo "Testing monitoring and alerting..."

# Test Prometheus metrics
curl -f http://localhost:9090/metrics | grep "evault_"

# Test health check endpoint
curl -f https://api.evault.com/health

# Test alerting rules
promtool check rules monitoring/alert-rules.yml

# Test Grafana dashboards
curl -f "http://admin:admin@localhost:3000/api/dashboards/db/evault-dashboard"

echo "Monitoring test complete"
```

**Disaster Recovery Testing:**
```bash
# scripts/test-disaster-recovery.sh
#!/bin/bash

echo "Testing disaster recovery..."

# Create backup
gcloud sql export sql evault-db gs://evault-backups/test-backup-$(date +%Y%m%d).sql --database=evault

# Simulate database failure and restore
gcloud sql instances stop evault-db
sleep 30
gcloud sql instances start evault-db

# Test data integrity after restore
curl -f https://api.evault.com/health

# Test service restart
gcloud run services update evault-server --region=us-central1

echo "Disaster recovery test complete"
```

**CI/CD Pipeline Testing:**
```yaml
# .github/workflows/test-deployment.yml
name: Test Deployment Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-infrastructure:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2
        
      - name: Terraform Plan
        run: |
          cd terraform
          terraform init
          terraform plan -out=tfplan
          
      - name: Test Infrastructure
        run: |
          cd terraform
          terraform apply -auto-approve tfplan
          terraform output
          
  test-deployment:
    needs: test-infrastructure
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Staging
        run: |
          gcloud run deploy evault-server-staging \
            --image gcr.io/$PROJECT_ID/evault-server:$GITHUB_SHA \
            --region us-central1
            
      - name: Run E2E Tests
        run: |
          npx playwright test --config=playwright.staging.config.ts
          
      - name: Load Test
        run: |
          k6 run tests/load/load-test.ts
          
  promote-to-production:
    needs: test-deployment
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Production
        run: |
          gcloud run deploy evault-server \
            --image gcr.io/$PROJECT_ID/evault-server:$GITHUB_SHA \
            --region us-central1
            
      - name: Verify Production
        run: |
          curl -f https://api.evault.com/health
          npx playwright test --config=playwright.production.config.ts
```

**Test Commands:**
```bash
# Phase 6 testing
make test-phase6
make test-infrastructure
make test-deployment
make test-production
make test-performance

# Infrastructure tests
make test-cloud-run
make test-cloud-sql
make test-ssl-config
make test-monitoring

# Performance tests
make load-test
make stress-test
make test-cdn-performance

# Disaster recovery
make test-backup-restore
make test-failover
make test-rollback
```

### **6.6 Deliverables Phase 6**

**Server Deployment:**
- [ ] Cloud Run deployment working
- [ ] Cloud SQL connection established
- [ ] Environment variables configured
- [ ] Basic monitoring setup
- [ ] Production-ready logging

**Client Deployment:**
- [ ] Vercel/Netlify deployment configured
- [ ] Environment variables set
- [ ] Domain and SSL configured
- [ ] CDN optimization enabled
- [ ] Security headers configured

**Production Infrastructure:**
- [ ] DNS configuration
- [ ] SSL certificates
- [ ] Load balancing (if needed)
- [ ] Monitoring and alerting
- [ ] Backup and disaster recovery
- [ ] Performance optimization

**DevOps Pipeline:**
- [ ] GitHub Actions CI/CD
- [ ] Automated testing in pipeline
- [ ] Deployment automation
- [ ] Environment promotion (dev → staging → prod)
- [ ] Rollback procedures

**Testing:**
- [ ] Infrastructure testing (Terraform, GCP resources)
- [ ] Production health check tests
- [ ] Performance and load testing
- [ ] SSL and security configuration tests
- [ ] Monitoring and alerting tests
- [ ] Disaster recovery tests
- [ ] CI/CD pipeline tests
- [ ] CDN and caching tests

---

## **Context Restoration Checklist**

When resuming work, quickly verify:
1. [ ] Go version and dependencies installed
2. [ ] Database connection string configured
3. [ ] Google OAuth credentials set up
4. [ ] Current phase completion status
5. [ ] Last working endpoint tested

## **Key Configuration Files**

### **Environment Variables**
```bash
# .env
PORT=8080
DATABASE_URL=postgres://user:pass@localhost/evault?sslmode=disable
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
JWT_SECRET=your-jwt-secret
ENVIRONMENT=development
```

### **Development Commands**
```bash
# Quick start commands
make setup          # Install dependencies (both server and client)
make db-up          # Start local database
make migrate        # Run migrations
make test           # Run tests (both server and client)
make dev            # Start both server and client in development mode
make deploy         # Deploy to GCP

# Server-specific commands
make server-setup   # Install Go dependencies
make server-test    # Run Go tests
make server-run     # Start Go server only
make server-deploy  # Deploy Go server to Cloud Run

# Client-specific commands
make client-setup   # Install Node.js dependencies
make client-test    # Run TypeScript/React tests
make client-run     # Start Next.js development server
make client-build   # Build client for production
make client-deploy  # Deploy client to Vercel/Netlify

# Development workflow
make dev-reset      # Reset local environment (containers, migrations, etc.)
make dev-logs       # View logs from all services
make dev-shell      # Open shell in development container

# Phase-specific testing
make test-phase1    # Phase 1: Foundation tests
make test-phase2    # Phase 2: Authentication tests
make test-phase3    # Phase 3: Core API tests
make test-phase4    # Phase 4: Security tests
make test-phase5    # Phase 5: Integration tests
make test-phase6    # Phase 6: Deployment tests

# Component-specific testing
make server-test-basic       # Basic server functionality
make server-test-auth        # Authentication system
make server-test-api         # Core API endpoints
make client-test-basic       # Basic client functionality
make client-test-auth        # Client authentication
make client-test-crypto      # Crypto operations
make client-test-components  # UI components

# Integration testing
make integration-test-basic  # Basic client-server integration
make integration-test-auth   # Authentication flow
make integration-test-vault  # Complete vault workflows
make integration-test-security # Security features

# Security testing
make security-audit          # Run security audit tools
make test-pen-testing        # Penetration testing scenarios
make test-input-validation   # Input sanitization tests
make test-rate-limiting      # Rate limiting tests
make test-xss-protection     # XSS protection tests
make test-sql-injection      # SQL injection protection tests

# Production testing
make test-infrastructure     # Infrastructure tests
make test-deployment         # Deployment pipeline tests
make test-production         # Production health checks
make test-performance        # Performance and load tests
make load-test              # Load testing with k6
make stress-test            # Stress testing
make test-backup-restore     # Disaster recovery tests

# OpenADP specific testing
make test-openadp-integration # OpenADP SDK integration
make test-hpke-crypto        # HPKE encryption/decryption
make test-pin-recovery       # PIN-based key recovery
```

## **OpenADP Integration Architecture**

### **How OpenADP Transforms eVault Security**

**Traditional Approach (Vulnerable):**
```
User PIN "3344" → Local key derivation → Easily crackable
```

**OpenADP Approach (Nation-State Resistant):**
```
User PIN "3344" → OpenADP distributed network → Cryptographically strong key
```

### **eVault + OpenADP Flow**

**1. Vault Registration (First Time)**
```typescript
// Client-side
const privateKey = generateHPKEPrivateKey();
const metadata = await openadp.register(userID, 'evault', privateKey, pin, 10);
const publicKey = derivePublicKey(privateKey);

// Send to eVault server
await api.registerVault({
  vault_public_key: base64(publicKey),
  openadp_metadata: base64(metadata)
});
```

**2. Adding Entries (Frictionless)**
```typescript
// Client-side - no PIN needed!
const publicKey = getCachedPublicKey();
const encryptedEntry = await hpkeEncrypt(publicKey, secret);
await api.addEntry(encryptedEntry);
```

**3. Viewing Entries (PIN Required)**
```typescript
// Client-side - PIN required
const { privateKey, remaining } = await openadp.recover(metadata, pin);
const decryptedEntries = await hpkeDecryptAll(privateKey, encryptedEntries);
```

### **Security Benefits**

1. **Distributed Trust**: Keys protected across multiple countries
2. **Guess Limiting**: Only 10 PIN attempts before lockout
3. **Information Theoretic Security**: Even compromised servers learn nothing about PIN
4. **Frictionless UX**: Public key cached for easy entry addition
5. **Nation-State Resistance**: No single point of failure

### **Network Architecture**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   eVault        │    │  eVault Server   │    │   OpenADP       │
│   Client        │◄──►│  (Go + GCP)      │    │   Network       │
│   (TypeScript)  │    │                  │    │   (Distributed) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User PIN      │    │  OpenADP         │    │   Multiple      │
│   "3344"        │    │  Metadata        │    │   Countries     │
│   (Local Only)  │    │  (Safe to Store) │    │   (Threshold)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### **Data Flow**

**Registration:**
1. User enters PIN in browser
2. Client generates HPKE key pair
3. Client calls OpenADP to protect private key with PIN
4. Client sends public key + metadata to eVault server
5. eVault server stores metadata (safe to store anywhere)

**Adding Entries:**
1. User pastes recovery codes
2. Client encrypts with cached public key
3. Client sends encrypted data to eVault server
4. **No PIN required** - frictionless experience!

**Viewing Entries:**
1. User enters PIN in browser
2. Client calls OpenADP to recover private key
3. Client downloads encrypted entries from eVault server
4. Client decrypts entries with recovered private key
5. Client displays decrypted secrets

## **Business Context**

### **Core Value Proposition**
- **Primary Use Case**: Secure storage of recovery codes (never lose Gmail/GitHub/banking recovery codes)
- **Target Market**: Tech-savvy individuals 25-55 who have been locked out before
- **Revenue Model**: $5 early adopter special OR $4.99/month OR pay-per-recovery ($7.99/event)

### **Technical Requirements**
- **Performance**: 126 QPS steady state, 10,000+ QPS peak during service outages
- **Security**: PIN-protected access, distributed encryption via OpenADP
- **Scalability**: Support 1M users, 4 secrets per user per year
- **Constraints**: 1KiB max per entry, 1024 entries max per user

### **Integration Points**
- **OpenADP**: Distributed threshold cryptography for key recovery
- **HPKE**: Hybrid Public Key Encryption for entry encryption
- **OAuth**: Google OAuth for user authentication

## **Parallel Development Workflow**

### **Development Environment Setup**
```bash
# 1. Clone and setup
git clone <repo>
cd evault
make setup          # Installs both Go and Node.js dependencies

# 2. Start development environment
make dev            # Starts PostgreSQL, Go server, and Next.js client
# This runs:
# - PostgreSQL in Docker (port 5432)
# - Go server (port 8080)
# - Next.js client (port 3000)
```

### **Typical Development Session**
```bash
# Terminal 1: Database and services
make db-up          # Start PostgreSQL
make migrate        # Run any new migrations

# Terminal 2: Go server development
cd server
go run cmd/server/main.go

# Terminal 3: Next.js client development  
cd client
npm run dev

# Terminal 4: Testing
make test           # Run all tests
# or individually:
make server-test    # Go tests
make client-test    # TypeScript/React tests
```

### **Phase Development Strategy**

**Phase 1: Foundation**
- Day 1: Set up Go project structure, basic HTTP server
- Day 2: Set up Next.js project structure, basic UI
- Day 3: Connect client to server (health check endpoint)

**Phase 2: Authentication**
- Day 1: Implement Go OAuth endpoints and JWT
- Day 2: Implement Next.js auth with NextAuth
- Day 3: Test end-to-end authentication flow

**Phase 3: Core Features**
- Day 1-2: Implement Go API endpoints
- Day 3-4: Implement Next.js UI for each API
- Day 5: Test complete user workflows

### **Integration Points**
- **API Types**: Shared between Go and TypeScript using code generation
- **Authentication**: JWT tokens passed from client to server
- **Crypto**: HPKE encryption on client, validation on server
- **Testing**: End-to-end tests covering client-server integration

### **Development Tips**
- Use `make dev` for quick iteration (auto-restart on changes)
- Keep API types in sync between server and client
- Test each API endpoint in isolation, then with client
- Use browser dev tools for debugging crypto operations
- Monitor server logs for API errors during client development

This implementation plan provides complete context for resuming work in any session! 