#!/usr/bin/env python3
"""
UI Test Runner for Fractal Workspace

This script runs all UI end-to-end tests and generates a detailed report.
It includes options for running specific test categories or all tests.

Usage:
    python run_ui_tests.py              # Run all tests
    python run_ui_tests.py --tab=fractal  # Run only Fractal Generator tests
    python run_ui_tests.py --verbose      # Verbose output
    python run_ui_tests.py --html         # Generate HTML report
"""

import sys
import argparse
from pathlib import Path

# Add tests directory to path
tests_dir = Path(__file__).parent / "tests"
sys.path.insert(0, str(Path(__file__).parent))


def run_all_tests(verbose=False, html_report=False):
    """Run all UI end-to-end tests."""
    import pytest
    
    args = [str(tests_dir / "test_ui_end_to_end.py")]
    
    if verbose:
        args.append("-v")
    else:
        args.append("-q")
    
    if html_report:
        args.extend(["--html=test_report.html", "--self-contained-html"])
    
    args.extend([
        "--tb=short",
        "--color=yes",
        "-ra"  # Show all test summary info
    ])
    
    print("\n" + "="*70)
    print("Running Fractal Workspace UI End-to-End Tests")
    print("="*70 + "\n")
    
    exit_code = pytest.main(args)
    
    print("\n" + "="*70)
    if exit_code == 0:
        print("✅ All tests passed successfully!")
    else:
        print("❌ Some tests failed. Please review the output above.")
    print("="*70 + "\n")
    
    return exit_code


def run_specific_tab_tests(tab_name, verbose=False):
    """Run tests for a specific tab."""
    import pytest
    
    test_class_map = {
        "fractal": "TestFractalGeneratorTab",
        "box": "TestBoxCounterTab",
        "compare": "TestImageCompareTab",
        "tumor": "TestTumorDetectionTab",
        "integration": "TestTabIntegration",
        "quality": "TestUIQuality",
        "error": "TestErrorHandling"
    }
    
    if tab_name.lower() not in test_class_map:
        print(f"❌ Unknown tab: {tab_name}")
        print(f"Available options: {', '.join(test_class_map.keys())}")
        return 1
    
    test_class = test_class_map[tab_name.lower()]
    test_file = tests_dir / "test_ui_end_to_end.py"
    
    args = [
        f"{test_file}::{test_class}",
        "-v" if verbose else "-q",
        "--tb=short",
        "--color=yes"
    ]
    
    print(f"\n{'='*70}")
    print(f"Running tests for: {tab_name.upper()}")
    print(f"Test class: {test_class}")
    print(f"{'='*70}\n")
    
    exit_code = pytest.main(args)
    
    print(f"\n{'='*70}")
    if exit_code == 0:
        print(f"✅ All {tab_name} tests passed!")
    else:
        print(f"❌ Some {tab_name} tests failed.")
    print(f"{'='*70}\n")
    
    return exit_code


def list_available_tests():
    """List all available test categories."""
    print("\n" + "="*70)
    print("Available Test Categories:")
    print("="*70 + "\n")
    
    categories = [
        ("fractal", "Fractal Generator Tab Tests", "35 tests"),
        ("box", "Box Counter Tab Tests", "20 tests"),
        ("compare", "Image Compare Tab Tests", "25 tests"),
        ("tumor", "Tumor Detection Tab Tests", "20 tests"),
        ("integration", "Tab Integration Tests", "10 tests"),
        ("quality", "UI Quality & Accessibility Tests", "8 tests"),
        ("error", "Error Handling Tests", "5 tests")
    ]
    
    for key, description, count in categories:
        print(f"  {key:12} - {description:40} ({count})")
    
    print("\n" + "="*70)
    print("Usage Examples:")
    print("="*70)
    print("  python run_ui_tests.py                    # Run all tests")
    print("  python run_ui_tests.py --tab=fractal      # Run fractal tests only")
    print("  python run_ui_tests.py --verbose          # Verbose output")
    print("  python run_ui_tests.py --html             # Generate HTML report")
    print("  python run_ui_tests.py --list             # Show this list")
    print("="*70 + "\n")


def main():
    """Main entry point for test runner."""
    parser = argparse.ArgumentParser(
        description="Run UI end-to-end tests for Fractal Workspace"
    )
    parser.add_argument(
        "--tab",
        type=str,
        help="Run tests for specific tab (fractal, box, compare, tumor, integration, quality, error)"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Verbose test output"
    )
    parser.add_argument(
        "--html",
        action="store_true",
        help="Generate HTML test report"
    )
    parser.add_argument(
        "--list", "-l",
        action="store_true",
        help="List available test categories"
    )
    
    args = parser.parse_args()
    
    if args.list:
        list_available_tests()
        return 0
    
    if args.tab:
        return run_specific_tab_tests(args.tab, verbose=args.verbose)
    else:
        return run_all_tests(verbose=args.verbose, html_report=args.html)


if __name__ == "__main__":
    sys.exit(main())
