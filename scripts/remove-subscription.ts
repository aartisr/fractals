#!/usr/bin/env node

/**
 * Remove Subscription Script
 * 
 * Usage:
 *   node scripts/remove-subscription.ts --list
 *   node scripts/remove-subscription.ts --user dev-user-123
 *   node scripts/remove-subscription.ts --subscription 5
 *   node scripts/remove-subscription.ts --all
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as readline from 'readline';

const execAsync = promisify(exec);

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
};

function log(message: string): void {
  console.log(`${colors.green}[INFO]${colors.reset} ${message}`);
}

function warn(message: string): void {
  console.log(`${colors.yellow}[WARNING]${colors.reset} ${message}`);
}

function error(message: string): void {
  console.log(`${colors.red}[ERROR]${colors.reset} ${message}`);
}

async function query(sql: string): Promise<string> {
  try {
    const { stdout } = await execAsync(
      `docker exec ntv-postgres psql -U ntv -d nithyananda-tv -c "${sql.replace(/"/g, '\\"')}"`,
      { maxBuffer: 10 * 1024 * 1024 }
    );
    return stdout;
  } catch (err: any) {
    throw new Error(`Database query failed: ${err.message}`);
  }
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer: string) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function listSubscriptions(): Promise<void> {
  log('Listing all subscriptions...\n');
  const sql = `
    SELECT 
      us.id,
      us."user",
      sp.name as plan_name,
      us.status,
      us.created_at,
      us.paystack_subscription_code
    FROM user_subscriptions us
    LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
    ORDER BY us.created_at DESC;
  `;
  
  try {
    const result = await query(sql);
    console.log(result);
  } catch (err: any) {
    error(err.message);
    process.exit(1);
  }
}

async function removeSubscriptionById(subId: number): Promise<void> {
  warn(`Removing subscription with ID: ${subId}`);

  // Show subscription details
  console.log('\nSubscription details:');
  const sql = `
    SELECT 
      us.id,
      us."user",
      sp.name as plan_name,
      us.status,
      us.created_at
    FROM user_subscriptions us
    LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.id = ${subId};
  `;

  try {
    const result = await query(sql);
    console.log(result);

    const confirm = await prompt('\nAre you sure? (yes/no): ');

    if (confirm.toLowerCase() === 'yes') {
      await query(`DELETE FROM user_subscriptions WHERE id = ${subId};`);
      log(`Subscription ${subId} deleted successfully`);
    } else {
      error('Deletion cancelled');
      process.exit(1);
    }
  } catch (err: any) {
    error(err.message);
    process.exit(1);
  }
}

async function removeUserSubscriptions(userId: string): Promise<void> {
  warn(`Removing all subscriptions for user: ${userId}`);

  console.log('\nSubscriptions for this user:');
  const sql = `
    SELECT 
      us.id,
      sp.name as plan_name,
      us.status,
      us.created_at
    FROM user_subscriptions us
    LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us."user" = '${userId}'
    ORDER BY us.created_at DESC;
  `;

  try {
    const result = await query(sql);
    console.log(result);

    const confirm = await prompt(
      `\nAre you sure you want to delete all subscriptions for this user? (yes/no): `
    );

    if (confirm.toLowerCase() === 'yes') {
      await query(`DELETE FROM user_subscriptions WHERE "user" = '${userId}';`);
      log(`All subscriptions for user '${userId}' deleted successfully`);
    } else {
      error('Deletion cancelled');
      process.exit(1);
    }
  } catch (err: any) {
    error(err.message);
    process.exit(1);
  }
}

async function removeAllSubscriptions(): Promise<void> {
  error('DANGEROUS OPERATION: This will delete ALL subscriptions!');

  console.log('\nTotal subscriptions that will be deleted:');
  const countSql = `SELECT COUNT(*) FROM user_subscriptions;`;

  try {
    const countResult = await query(countSql);
    console.log(countResult);

    const confirm = await prompt('\nType "DELETE ALL" to confirm: ');

    if (confirm === 'DELETE ALL') {
      await query(`DELETE FROM user_subscriptions;`);
      log('All subscriptions deleted');
    } else {
      error('Deletion cancelled');
      process.exit(1);
    }
  } catch (err: any) {
    error(err.message);
    process.exit(1);
  }
}

function showHelp(): void {
  console.log(`
Remove Subscription Script

Usage: node scripts/remove-subscription.ts [OPTIONS]

Options:
  -l, --list              List all subscriptions
  -s, --subscription ID   Remove a specific subscription by ID
  -u, --user USER_ID      Remove all subscriptions for a user
  -a, --all               Remove ALL subscriptions (dangerous!)
  -h, --help              Show this help message

Examples:
  node scripts/remove-subscription.ts --list
  node scripts/remove-subscription.ts --user dev-user-123
  node scripts/remove-subscription.ts --subscription 5
  node scripts/remove-subscription.ts --all
  `);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    showHelp();
    return;
  }

  const [option, value] = args;

  switch (option) {
    case '-l':
    case '--list':
      await listSubscriptions();
      break;

    case '-s':
    case '--subscription':
      if (!value) {
        error('Subscription ID is required');
        process.exit(1);
      }
      await removeSubscriptionById(parseInt(value, 10));
      break;

    case '-u':
    case '--user':
      if (!value) {
        error('User ID is required');
        process.exit(1);
      }
      await removeUserSubscriptions(value);
      break;

    case '-a':
    case '--all':
      await removeAllSubscriptions();
      break;

    case '-h':
    case '--help':
      showHelp();
      break;

    default:
      error(`Unknown option: ${option}`);
      showHelp();
      process.exit(1);
  }
}

main().catch((err) => {
  error(err.message);
  process.exit(1);
});
