#!/bin/zsh


# verify_package.sh: Build, install, and verify the fractals package locally

set -e
set -x  # Enable shell tracing for debugging
setopt +o nomatch  # Prevent errors on unmatched globs

# Exit if another venv is active
if [[ -n "$VIRTUAL_ENV" ]]; then
	echo "ERROR: Please deactivate your current virtual environment before running this script."
	exit 1
fi

# Step 1: Clean previous builds
echo "Cleaning previous builds..."
rm -rf dist/ build/ *.egg-info

# Step 2: Build the package
echo "Building the package..."
pipx run build

# Step 3: Create a temporary virtual environment
echo "Creating a temporary virtual environment..."
python3 -m venv .venv_verify
source .venv_verify/bin/activate


# Step 4: Upgrade pip and install the built package
echo "Upgrading pip and installing the package..."
pip install --upgrade pip
pip install dist/*.whl
echo "Installed packages in venv:"
pip list


# Step 5: Verify the CLI entry point
echo "Verifying CLI entry point..."
CLI_PATH=".venv_verify/bin/fractal-workspace"
if [[ ! -x "$CLI_PATH" ]]; then
	echo "ERROR: CLI entry point not found at $CLI_PATH"
	exit 1
fi
echo "Using CLI at $CLI_PATH"
$CLI_PATH --help

# Step 6: Deactivate and clean up
echo "Deactivating and cleaning up..."
deactivate
rm -rf .venv_verify

echo "Verification complete."
