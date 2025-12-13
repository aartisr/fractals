# Subscription Management Scripts

This directory contains scripts for managing subscriptions in the Nithyananda TV application.

## Available Scripts

### 1. Bash Script (`remove-subscription.sh`)

A pure bash script for managing subscriptions using Docker and PostgreSQL directly.

**Requirements:**
- Docker running with `ntv-postgres` container
- Bash shell
- `docker` command available

**Usage:**

```bash
# List all subscriptions
./scripts/remove-subscription.sh --list

# Remove a specific subscription by ID
./scripts/remove-subscription.sh --subscription 5

# Remove all subscriptions for a user
./scripts/remove-subscription.sh --user dev-user-123

# Remove ALL subscriptions (requires confirmation)
./scripts/remove-subscription.sh --all

# Show help
./scripts/remove-subscription.sh --help
```

**Make executable:**
```bash
chmod +x scripts/remove-subscription.sh
```

---

### 2. Node.js Script (Compiled JavaScript - `remove-subscription.js`)

The compiled JavaScript version of the TypeScript script. No additional dependencies required beyond Node.js.

**Requirements:**
- Node.js 14+
- Docker running with `ntv-postgres` container

**Usage:**

```bash
# List all subscriptions
node scripts/remove-subscription.js --list
# or if executable
./scripts/remove-subscription.js --list

# Remove a specific subscription by ID
node scripts/remove-subscription.js --subscription 5

# Remove all subscriptions for a user
node scripts/remove-subscription.js --user dev-user-123

# Remove ALL subscriptions (requires confirmation)
node scripts/remove-subscription.js --all

# Show help
node scripts/remove-subscription.js --help
```

**Make executable:**
```bash
chmod +x scripts/remove-subscription.js
```

---

### 3. TypeScript Source (`remove-subscription.ts`)

The TypeScript source file. Provides better type safety and is automatically compiled to JavaScript during development.

**Requirements:**
- Node.js 14+
- Docker running with `ntv-postgres` container
- TypeScript installed (optional if using compiled JS)

**Usage - via ts-node:**

```bash
# List all subscriptions
npx ts-node scripts/remove-subscription.ts --list

# Remove a specific subscription by ID
npx ts-node scripts/remove-subscription.ts --subscription 5

# Remove all subscriptions for a user
npx ts-node scripts/remove-subscription.ts --user dev-user-123

# Remove ALL subscriptions (requires confirmation)
npx ts-node scripts/remove-subscription.ts --all
```

**Usage - compile and run:**

```bash
# Compile to JavaScript
npx tsc scripts/remove-subscription.ts --outDir scripts --target es2020 --module commonjs --lib es2020 --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames

# Run compiled version
node scripts/remove-subscription.js --list
```

---

## Quick Start

### Option 1: Use Bash Script (Recommended - No Dependencies)
```bash
chmod +x scripts/remove-subscription.sh
./scripts/remove-subscription.sh --list
```

### Option 2: Use Node.js Script (Pre-compiled)
```bash
chmod +x scripts/remove-subscription.js
node scripts/remove-subscription.js --list
```

### Option 3: Use TypeScript (Requires ts-node)
```bash
npx ts-node scripts/remove-subscription.ts --list
```

---

## Examples

### Example 1: List all subscriptions
```bash
$ ./scripts/remove-subscription.sh --list
[INFO] Listing all subscriptions...

 id |         user         |     plan_name     | status |         created_at         | paystack_subscription_code
----+----------------------+-------------------+--------+----------------------------+-------------------------------
  5 | dev-user-123         | Gold Membership   | active | 2025-12-13 17:51:01.645+00 | xxihkkc2dv
  4 | alice@example.com    | Silver Membership | active | 2025-12-13 17:45:29.897+00 | paystack-test-789
  3 | john.doe@example.com | Bronze Membership | active | 2025-12-13 17:45:03.08+00  | 
  2 | test-user-new        | Silver Membership | active | 2025-12-13 17:44:20.187+00 |
(4 rows)
```

### Example 2: Remove a specific subscription
```bash
$ ./scripts/remove-subscription.sh --subscription 1
[WARNING] Removing subscription with ID: 1

[INFO] Subscription details:
 id |     user     | plan_name       | status | created_at
----+--------------+-----------------+--------+----------------------------
  1 | dev-user-123 | Gold Membership | active | 2025-12-13 17:51:01.645+00

Are you sure? (yes/no) yes
[INFO] Subscription 1 deleted successfully
```

### Example 3: Remove all subscriptions for a user
```bash
$ ./scripts/remove-subscription.sh --user dev-user-123
[WARNING] Removing all subscriptions for user: dev-user-123

[INFO] Subscriptions for this user:
 id | plan_name       | status | created_at
----+-----------------+--------+----------------------------
  1 | Gold Membership | active | 2025-12-13 17:51:01.645+00

Are you sure you want to delete all subscriptions for this user? (yes/no) yes
[INFO] All subscriptions for user 'dev-user-123' deleted successfully
```

---

## Database Schema

The scripts operate on the `user_subscriptions` table:

```sql
CREATE TABLE user_subscriptions (
  id SERIAL PRIMARY KEY,
  user VARCHAR NOT NULL,
  plan_id INTEGER NOT NULL,
  status VARCHAR NOT NULL,
  start_date TIMESTAMP,
  renews_at TIMESTAMP,
  paystack_subscription_code VARCHAR,
  paystack_reference VARCHAR,
  is_cancelled BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
```

## Safety Features

- **Confirmation prompts**: All scripts require explicit confirmation before deletion
- **Preview before delete**: Shows subscription details before deletion
- **Colored output**: Clear visual indicators for info, warnings, and errors
- **Count validation**: Shows total count before bulk operations
- **Double safeguard for --all**: Requires typing "DELETE ALL" to confirm bulk deletion

---

## Troubleshooting

### "Database container 'ntv-postgres' is not running"
Make sure Docker and the PostgreSQL container are running:
```bash
docker-compose up -d
```

### "Database query failed"
Check that the container name and database credentials are correct:
- Container: `ntv-postgres`
- User: `ntv`
- Database: `nithyananda-tv`

Verify with:
```bash
docker ps | grep ntv-postgres
```

### Permission denied on .sh script
Make the script executable:
```bash
chmod +x scripts/remove-subscription.sh
```

### "Cannot find module 'child_process'" (TypeScript)
Install @types/node:
```bash
npm install --save-dev @types/node
```

### JavaScript version not found
The `.js` file is generated by compiling the TypeScript source. If missing, compile it:
```bash
npm install --save-dev typescript
npx tsc scripts/remove-subscription.ts --outDir scripts --target es2020 --module commonjs --lib es2020 --esModuleInterop --skipLibCheck --forceConsistentCasingInFileNames
```

---

## Integration in Code

To add a remove subscription endpoint to your API:

```typescript
import { exec } from 'child_process';

// Remove subscription by ID
export async function removeSubscription(subscriptionId: number) {
  const cmd = `./scripts/remove-subscription.sh --subscription ${subscriptionId}`;
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout) => {
      if (error) reject(error);
      resolve(stdout);
    });
  });
}
```

Or use the Node.js script directly:

```typescript
import { spawn } from 'child_process';

export async function removeSubscriptionViaNode(subscriptionId: number) {
  const proc = spawn('node', ['scripts/remove-subscription.js', '--subscription', String(subscriptionId)]);
  
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => { stdout += data; });
    proc.stderr.on('data', (data) => { stderr += data; });
    
    proc.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr));
    });
  });
}
```

---

## Contributing

When adding new features to these scripts:
1. Update both the bash and TypeScript versions for consistency
2. Add confirmation prompts for destructive operations
3. Include colored output for better UX
4. Test with the development database
5. Recompile the TypeScript to JavaScript: `npm run compile:scripts`

---

## Script Comparison

| Feature | Bash | Node.js | TypeScript |
|---------|------|---------|-----------|
| No Dependencies | ✅ | ✅ | ❌ (ts-node needed) |
| Pre-compiled | ✅ | ✅ | ❌ |
| Type Safe | ❌ | ✅ | ✅ |
| Color Output | ✅ | ✅ | ✅ |
| Error Handling | ✅ | ✅ | ✅ |
| **Recommended** | ✅ | ✅ | - |

**Recommendation**: Use the Bash script for simplicity or the Node.js compiled script for more robust error handling.
