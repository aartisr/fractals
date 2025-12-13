## Mock Authentication Refactoring Summary

All mock authentication code has been centralized into a single shared file to maintain consistency across the CMS and web app.

### Changes Made

#### 1. Created Centralized Mock Auth Module
**File:** `/shared/mock-auth.ts`
- Single source of truth for mock authentication
- Exports:
  - `MockAuthUser` interface
  - `MOCK_AUTH_USER` constant with mock user data
  - `isMockAuthEnabled()` - Check if mock auth is enabled
  - `getMockAuthUser()` - Get mock user object
  - `getMockSessionToken()` - Get mock session token
  - `getAuthUserIfMockEnabled()` - Combined check and get

**Mock User Details:**
```typescript
{
  id: 'dev-user-123',
  email: 'dev@example.com',
  first_name: 'Development',
  last_name: 'User',
  role: 'admin'
}
```

### Files Updated

#### CMS
1. **`cms/src/utils/auth.ts`**
   - Imported centralized mock auth functions
   - Updated `authenticateRequest()` to use `isMockAuthEnabled()` and `getMockAuthUser()`
   - Single import statement replaces multiple mock user definitions

#### Web App
1. **`web/src/routes/plugin@auth.ts`**
   - Imported centralized mock auth functions
   - Uses `isMockAuthEnabled()` and `getMockAuthUser()`

2. **`web/src/routes/api/me/index.ts`**
   - Imported centralized functions
   - Uses `isMockAuthEnabled()`, `getMockAuthUser()`, `getMockSessionToken()`

3. **`web/src/routes/api/subscriptions/create/index.ts`**
   - Imported centralized functions
   - Uses `isMockAuthEnabled()` and `getMockSessionToken()`

### Benefits
- ✅ Single point of maintenance for mock user configuration
- ✅ Consistent mock user ID and credentials across all services
- ✅ Easy to update mock user details without searching multiple files
- ✅ Shared module works in both Node.js (CMS) and Browser (web app) environments
- ✅ Clear, discoverable API for mock authentication

### Usage
To use the centralized mock auth in any file:

```typescript
import { 
  isMockAuthEnabled, 
  getMockAuthUser, 
  getMockSessionToken,
  MOCK_AUTH_USER 
} from '../../../shared/mock-auth';

// Check if mock auth is enabled
if (isMockAuthEnabled()) {
  const user = getMockAuthUser(); // Returns { id: 'dev-user-123', ... }
  const token = getMockSessionToken(); // Returns 'mock-dev-session-token'
}
```

### Environment Variable
Enable mock authentication by setting in `.env`:
```
USE_MOCK_AUTH=true
```
