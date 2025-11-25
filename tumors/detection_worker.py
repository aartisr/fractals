"""
Tumor Detection Worker Module
==============================

Provides a PyQt6 worker thread for running tumor detection processes asynchronously.

This module contains a QObject-based worker that executes tumor detection commands
in a separate thread, preventing UI freezing during long-running detection operations.

Key Features:
    - Asynchronous subprocess execution
    - Signal-based communication with main thread
    - Robust error handling and validation
    - Output file verification

Author: Aarti S Ravikumar
License: MIT
Version: 2.0.0
"""

from typing import List, Optional, Union
import os
import subprocess
import logging
from pathlib import Path
from PyQt6.QtCore import QObject, pyqtSignal

# ============================================================================
# LOGGING CONFIGURATION
# ============================================================================


# Ensure logging is always configured for production
def _configure_logging():
    logger = logging.getLogger(__name__)
    if not logger.hasHandlers():
        handler = logging.StreamHandler()
        formatter = logging.Formatter('[%(asctime)s] %(levelname)s %(name)s: %(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    return logger

logger = _configure_logging()


# ============================================================================
# CONSTANTS
# ============================================================================


# Subprocess timeout (seconds) - prevent hanging on failed processes
DEFAULT_TIMEOUT = int(os.environ.get("TUMOR_DETECT_TIMEOUT", 300))  # 5 minutes
MAX_TIMEOUT = int(os.environ.get("TUMOR_DETECT_MAX_TIMEOUT", 1800)) # 30 minutes

# File verification retry settings
FILE_CHECK_DELAY = float(os.environ.get("TUMOR_DETECT_FILE_CHECK_DELAY", 0.5))  # seconds
MAX_FILE_CHECK_RETRIES = int(os.environ.get("TUMOR_DETECT_MAX_FILE_CHECK_RETRIES", 5))


# ============================================================================
# DETECTION WORKER CLASS
# ============================================================================

class DetectionWorker(QObject):
    """
    Asynchronous worker for running tumor detection processes.
    
    Executes detection commands in a separate thread to prevent UI freezing.
    Communicates results back to the main thread via Qt signals.
    
    This worker is designed to be used with QThread for safe multi-threading
    in PyQt6 applications. It runs subprocess commands and verifies output.
    
    Signals:
        finished(str): Emitted when detection completes successfully (output file path)
        error(str): Emitted when an error occurs (error message)
        progress(int): Emitted to report progress (0-100, optional)

    Thread Safety:
        Designed for use with QThread. All heavy operations run in the thread; only signals cross thread boundaries.

    Example Usage:
        >>> worker = DetectionWorker(
        ...     command=["python", "tumor_detector.py", "--input", "image.jpg"],
        ...     detected_path="/output/detected.jpg"
        ... )
        >>> thread = QThread()
        >>> worker.moveToThread(thread)
        >>> worker.finished.connect(on_detection_complete)
        >>> worker.error.connect(on_detection_error)
        >>> thread.started.connect(worker.run)
        >>> thread.start()
    """
    
    # Qt signals for thread-safe communication
    finished = pyqtSignal(str)  # Emits path to detected image
    error = pyqtSignal(str)     # Emits error message
    progress = pyqtSignal(int)  # Emits progress percentage (future use)
    
    def __init__(
        self,
        command: Union[List[str], str],
        detected_path: Union[str, Path],
        timeout: Optional[int] = None,
        verify_output: bool = True,
        parent: Optional[QObject] = None
    ):
        """
        Initialize the detection worker.

        Args:
            command: Command to execute for tumor detection (list or string)
            detected_path: Expected path to the output/detected image file
            timeout: Maximum execution time in seconds (default: from env or 300)
            verify_output: Whether to verify output file exists (default: True)
            parent: Optional parent QObject for Qt object hierarchy
        """
        super().__init__(parent)
        self.command = self._validate_command(command)
        self.detected_path = self._validate_path(detected_path)
        self.timeout = self._validate_timeout(timeout if timeout is not None else DEFAULT_TIMEOUT)
        self.verify_output = bool(verify_output)
        self._is_running = False
        self._process: Optional[subprocess.Popen] = None
        logger.info(
            f"DetectionWorker initialized: command={self.command}, "
            f"output={self.detected_path}, timeout={self.timeout}s"
        )
    
    # ========================================================================
    # VALIDATION METHODS
    # ========================================================================
    
    @staticmethod
    def _validate_command(command: Union[List[str], str]) -> List[str]:
        """
        Validate and normalize command format.
        
        Args:
            command: Command as list or string
        
        Returns:
            Validated command as list of strings
        
        Raises:
            TypeError: If command is not list or string
            ValueError: If command is empty or contains empty strings
        """
        if isinstance(command, str):
            # Convert string to list by splitting on whitespace
            command = command.split()
        
        if not isinstance(command, list):
            raise TypeError(
                f"Command must be list or string, got {type(command).__name__}"
            )
        
        if not command:
            raise ValueError("Command cannot be empty")
        
        # Ensure all elements are strings and non-empty
        validated = []
        for i, item in enumerate(command):
            if not isinstance(item, str):
                raise TypeError(
                    f"Command element {i} must be string, got {type(item).__name__}"
                )
            if not item.strip():
                raise ValueError(f"Command element {i} cannot be empty string")
            validated.append(item.strip())
        
        return validated
    
    @staticmethod
    def _validate_path(path: Union[str, Path]) -> str:
        """
        Validate and normalize output path.
        
        Args:
            path: Output file path as string or Path object
        
        Returns:
            Validated path as string
        
        Raises:
            TypeError: If path is not string or Path
            ValueError: If path is empty
        """
        if isinstance(path, Path):
            path = str(path)
        
        if not isinstance(path, str):
            raise TypeError(
                f"Path must be string or Path, got {type(path).__name__}"
            )
        
        if not path.strip():
            raise ValueError("Output path cannot be empty")
        
        # Normalize path (resolve relative paths, remove redundant separators)
        normalized = os.path.normpath(path.strip())
        
        return normalized
    
    @staticmethod
    def _validate_timeout(timeout: Optional[int]) -> Optional[int]:
        """
        Validate timeout value.
        
        Args:
            timeout: Timeout in seconds or None
        
        Returns:
            Validated timeout value
        
        Raises:
            TypeError: If timeout is not int or None
            ValueError: If timeout is out of valid range
        """
        if timeout is None:
            logger.warning("No timeout set - process may hang indefinitely")
            return None
        
        if not isinstance(timeout, int):
            raise TypeError(
                f"Timeout must be int or None, got {type(timeout).__name__}"
            )
        
        if timeout < 1:
            raise ValueError(f"Timeout must be positive, got {timeout}")
        
        if timeout > MAX_TIMEOUT:
            raise ValueError(
                f"Timeout too large: {timeout}s (max: {MAX_TIMEOUT}s)"
            )
        
        return timeout
    
    # ========================================================================
    # MAIN EXECUTION METHOD
    # ========================================================================
    
    def run(self) -> None:
        """
        Execute the detection command and verify output.
        
        This method is designed to run in a separate thread (via QThread).
        It executes the detection subprocess, monitors completion, and
        verifies the output file exists.
        
        Emits:
            finished(str): On successful completion with output path
            error(str): On any error with descriptive message
        
        Process:
            1. Execute subprocess command
            2. Wait for completion (with timeout)
            3. Check return code
            4. Verify output file exists (if enabled)
            5. Emit appropriate signal
        
        Error Handling:
            - Subprocess failures: Captured and reported via error signal
            - Timeouts: Detected and reported with specific message
            - Missing output: Reported if verify_output is True
            - Unexpected exceptions: Caught and logged
        
        Thread Safety:
            Safe to run in QThread. Only emits signals (thread-safe).
            Does not modify any GUI elements directly.
        """
        """
        Run the detection process. Emits signals for completion or error.
        """
        self._is_running = True
        try:
            logger.info(f"[DetectionWorker] Starting detection: {' '.join(self.command)}")
            self.progress.emit(5)
            result = self._execute_subprocess()
            self.progress.emit(60)
            if result.returncode != 0:
                error_msg = self._format_subprocess_error(result)
                logger.error(f"Detection failed: {error_msg}")
                self.error.emit(error_msg)
                return
            logger.info("Detection subprocess completed successfully")
            if self.verify_output:
                if not self._verify_output_file():
                    error_msg = (
                        f"Detection completed but output file not found: {self.detected_path}"
                    )
                    logger.error(error_msg)
                    self.error.emit(error_msg)
                    return
            self.progress.emit(95)
            logger.info(f"Detection complete: {self.detected_path}")
            self.finished.emit(self.detected_path)
            self.progress.emit(100)
        except subprocess.TimeoutExpired:
            error_msg = (
                f"Detection timed out after {self.timeout} seconds. "
                f"Process may be hung or image too large."
            )
            logger.error(error_msg)
            self.error.emit(error_msg)
        except FileNotFoundError as e:
            error_msg = (
                f"Detection command not found: {self.command[0]}. "
                f"Ensure the detection script/executable exists and is in your PATH."
            )
            logger.error(f"{error_msg} ({e})")
            self.error.emit(error_msg)
        except PermissionError as e:
            error_msg = (
                f"Permission denied executing: {self.command[0]}. "
                f"Check file permissions."
            )
            logger.error(f"{error_msg} ({e})")
            self.error.emit(error_msg)
        except Exception as e:
            error_msg = f"Unexpected error during detection: {type(e).__name__}: {e}"
            logger.exception(error_msg)
            self.error.emit(error_msg)
        finally:
            self._is_running = False
            self._process = None
    
    # ========================================================================
    # HELPER METHODS
    # ========================================================================
    
    def _execute_subprocess(self) -> subprocess.CompletedProcess:
        """
        Execute the detection subprocess.
        
        Returns:
            CompletedProcess object with return code and output
        
        Raises:
            subprocess.TimeoutExpired: If process exceeds timeout
            FileNotFoundError: If command executable not found
            PermissionError: If lacking permission to execute
        """
        """
        Run the detection subprocess and return the result.
        """
        try:
            result = subprocess.run(
                self.command,
                check=False,
                capture_output=True,
                text=True,
                timeout=self.timeout,
                shell=False
            )
            return result
        except subprocess.TimeoutExpired as e:
            if self._process:
                self._process.kill()
            raise
    
    def _format_subprocess_error(self, result: subprocess.CompletedProcess) -> str:
        """
        Format detailed error message from subprocess failure.
        
        Args:
            result: Completed subprocess with error information
        
        Returns:
            Formatted error message with return code and output
        """
        error_parts = [
            f"Detection process failed with exit code {result.returncode}."
        ]
        if result.stderr and result.stderr.strip():
            stderr_preview = result.stderr.strip()[:500]
            error_parts.append(f"Error output: {stderr_preview}")
        elif result.stdout and result.stdout.strip():
            stdout_preview = result.stdout.strip()[:500]
            error_parts.append(f"Output: {stdout_preview}")
        return "\n".join(error_parts)
    
    def _verify_output_file(self) -> bool:
        """
        Verify that the output file exists and is readable.
        
        Returns:
            True if file exists and is readable, False otherwise
        
        Note:
            Includes small delay and retry logic to handle filesystem lag
            on some systems where file creation isn't immediately visible.
        """
        import time
        for attempt in range(MAX_FILE_CHECK_RETRIES):
            if os.path.exists(self.detected_path):
                try:
                    size = os.path.getsize(self.detected_path)
                    if size > 0:
                        logger.info(f"Output file verified: {self.detected_path} ({size} bytes)")
                        return True
                    else:
                        logger.warning(f"Output file exists but is empty: {self.detected_path}")
                except OSError as e:
                    logger.warning(f"Cannot access output file: {e}")
            if attempt < MAX_FILE_CHECK_RETRIES - 1:
                time.sleep(FILE_CHECK_DELAY)
        logger.error(f"Output file not found after {MAX_FILE_CHECK_RETRIES} retries: {self.detected_path}")
        return False
    
    # ========================================================================
    # PUBLIC INTERFACE
    # ========================================================================
    
    def is_running(self) -> bool:
        """
        Check if detection is currently running.
        
        Returns:
            True if detection is in progress, False otherwise
        """
        return self._is_running
    
    def cancel(self) -> None:
        """
        Attempt to cancel the running detection process.
        
        Terminates the subprocess if it's currently running.
        May not work if process is unresponsive.
        
        Note:
            This sends SIGTERM (graceful shutdown). For forceful termination,
            the process is killed after a brief delay.
        """
        if self._process and self._process.poll() is None:
            logger.warning("Cancelling detection process...")
            try:
                self._process.terminate()
                import time
                time.sleep(0.5)
                if self._process.poll() is None:
                    logger.warning("Process did not terminate, forcing kill...")
                    self._process.kill()
            except Exception as e:
                logger.error(f"Error cancelling process: {e}")


# ============================================================================
# MODULE EXPORTS
# ============================================================================

__all__ = [
    'DetectionWorker',
]

