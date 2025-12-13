#!/bin/bash

# Remove Subscription Script
# Usage: ./scripts/remove-subscription.sh [user_id] [subscription_id]
# Example: ./scripts/remove-subscription.sh dev-user-123 5

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database configuration
DB_CONTAINER="ntv-postgres"
DB_USER="ntv"
DB_NAME="nithyananda-tv"

# Function to print colored output
print_status() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker container is running
if ! docker ps | grep -q $DB_CONTAINER; then
  print_error "Database container '$DB_CONTAINER' is not running"
  echo "Start it with: docker-compose up -d"
  exit 1
fi

# Parse arguments
if [ $# -eq 0 ]; then
  echo "Remove Subscription Script"
  echo ""
  echo "Usage: $0 [OPTIONS]"
  echo ""
  echo "Options:"
  echo "  -u, --user USER_ID          Remove all subscriptions for a user"
  echo "  -s, --subscription ID       Remove a specific subscription by ID"
  echo "  -a, --all                   Remove ALL subscriptions (dangerous!)"
  echo "  -l, --list                  List all subscriptions"
  echo "  -h, --help                  Show this help message"
  echo ""
  echo "Examples:"
  echo "  $0 --list                                 # List all subscriptions"
  echo "  $0 --user dev-user-123                    # Remove all subscriptions for user"
  echo "  $0 --subscription 5                       # Remove subscription with ID 5"
  echo ""
  exit 0
fi

# Function to list subscriptions
list_subscriptions() {
  print_status "Listing all subscriptions..."
  docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
    SELECT 
      us.id,
      us.\"user\",
      sp.name as plan_name,
      us.status,
      us.created_at,
      us.paystack_subscription_code
    FROM user_subscriptions us
    LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
    ORDER BY us.created_at DESC;
  "
}

# Function to remove subscription by ID
remove_subscription_by_id() {
  local sub_id=$1
  
  print_warning "Removing subscription with ID: $sub_id"
  
  # Show subscription details before deletion
  echo ""
  print_status "Subscription details:"
  docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
    SELECT 
      us.id,
      us.\"user\",
      sp.name as plan_name,
      us.status,
      us.created_at
    FROM user_subscriptions us
    LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.id = $sub_id;
  "
  
  echo ""
  read -p "Are you sure you want to delete this subscription? (yes/no) " -n 3 -r
  echo
  if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "DELETE FROM user_subscriptions WHERE id = $sub_id;"
    print_status "Subscription $sub_id deleted successfully"
  else
    print_error "Deletion cancelled"
    exit 1
  fi
}

# Function to remove all subscriptions for a user
remove_user_subscriptions() {
  local user_id=$1
  
  print_warning "Removing all subscriptions for user: $user_id"
  
  # Show subscriptions before deletion
  echo ""
  print_status "Subscriptions for this user:"
  docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "
    SELECT 
      us.id,
      sp.name as plan_name,
      us.status,
      us.created_at
    FROM user_subscriptions us
    LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.\"user\" = '$user_id'
    ORDER BY us.created_at DESC;
  "
  
  echo ""
  read -p "Are you sure you want to delete all subscriptions for this user? (yes/no) " -n 3 -r
  echo
  if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "DELETE FROM user_subscriptions WHERE \"user\" = '$user_id';"
    print_status "All subscriptions for user '$user_id' deleted successfully"
  else
    print_error "Deletion cancelled"
    exit 1
  fi
}

# Function to remove all subscriptions
remove_all_subscriptions() {
  print_error "DANGEROUS OPERATION: This will delete ALL subscriptions!"
  echo ""
  print_status "Total subscriptions that will be deleted:"
  docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) FROM user_subscriptions;"
  
  echo ""
  read -p "Type 'DELETE ALL' to confirm: " confirm
  if [ "$confirm" = "DELETE ALL" ]; then
    docker exec $DB_CONTAINER psql -U $DB_USER -d $DB_NAME -c "DELETE FROM user_subscriptions;"
    print_status "All subscriptions deleted"
  else
    print_error "Deletion cancelled"
    exit 1
  fi
}

# Parse options
case "$1" in
  -l|--list)
    list_subscriptions
    ;;
  -s|--subscription)
    if [ -z "$2" ]; then
      print_error "Subscription ID is required"
      exit 1
    fi
    remove_subscription_by_id "$2"
    ;;
  -u|--user)
    if [ -z "$2" ]; then
      print_error "User ID is required"
      exit 1
    fi
    remove_user_subscriptions "$2"
    ;;
  -a|--all)
    remove_all_subscriptions
    ;;
  -h|--help)
    $0
    ;;
  *)
    print_error "Unknown option: $1"
    $0 --help
    exit 1
    ;;
esac
