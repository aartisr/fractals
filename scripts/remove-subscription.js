#!/usr/bin/env node
"use strict";
/**
 * Remove Subscription Script
 *
 * Usage:
 *   node scripts/remove-subscription.ts --list
 *   node scripts/remove-subscription.ts --user dev-user-123
 *   node scripts/remove-subscription.ts --subscription 5
 *   node scripts/remove-subscription.ts --all
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const util_1 = require("util");
const readline = __importStar(require("readline"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
};
function log(message) {
    console.log(`${colors.green}[INFO]${colors.reset} ${message}`);
}
function warn(message) {
    console.log(`${colors.yellow}[WARNING]${colors.reset} ${message}`);
}
function error(message) {
    console.log(`${colors.red}[ERROR]${colors.reset} ${message}`);
}
async function query(sql) {
    try {
        const { stdout } = await execAsync(`docker exec ntv-postgres psql -U ntv -d nithyananda-tv -c "${sql.replace(/"/g, '\\"')}"`, { maxBuffer: 10 * 1024 * 1024 });
        return stdout;
    }
    catch (err) {
        throw new Error(`Database query failed: ${err.message}`);
    }
}
async function prompt(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}
async function listSubscriptions() {
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
    }
    catch (err) {
        error(err.message);
        process.exit(1);
    }
}
async function removeSubscriptionById(subId) {
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
        }
        else {
            error('Deletion cancelled');
            process.exit(1);
        }
    }
    catch (err) {
        error(err.message);
        process.exit(1);
    }
}
async function removeUserSubscriptions(userId) {
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
        const confirm = await prompt(`\nAre you sure you want to delete all subscriptions for this user? (yes/no): `);
        if (confirm.toLowerCase() === 'yes') {
            await query(`DELETE FROM user_subscriptions WHERE "user" = '${userId}';`);
            log(`All subscriptions for user '${userId}' deleted successfully`);
        }
        else {
            error('Deletion cancelled');
            process.exit(1);
        }
    }
    catch (err) {
        error(err.message);
        process.exit(1);
    }
}
async function removeAllSubscriptions() {
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
        }
        else {
            error('Deletion cancelled');
            process.exit(1);
        }
    }
    catch (err) {
        error(err.message);
        process.exit(1);
    }
}
function showHelp() {
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
async function main() {
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
