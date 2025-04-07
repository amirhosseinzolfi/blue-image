from rich.console import Console
from rich.logging import RichHandler
from rich.traceback import install
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TimeElapsedColumn
import logging
import time
from functools import wraps

# Install rich traceback handler
install(show_locals=True)

# Set up rich console
console = Console()

# Configure logging with rich
def setup_logging(log_level=logging.INFO):
    """Set up rich logging with the specified log level"""
    logging.basicConfig(
        level=log_level,
        format="%(message)s",
        datefmt="[%X]",
        handlers=[RichHandler(rich_tracebacks=True, console=console, show_path=False)]
    )
    return logging.getLogger("image-generator")

# Create logger
logger = setup_logging()

def log_message(message, level="info", category=None, **kwargs):
    """Log a message with rich formatting and optional metadata"""
    if category:
        message = f"[bold cyan]{category.upper()}:[/bold cyan] {message}"
    
    log_func = getattr(logger, level)
    log_func(message, extra={"markup": True, **kwargs})
    
    # Add visual separator for major events
    if kwargs.get("important"):
        console.rule(style="dim")

def create_progress(description="Processing"):
    """Create a rich progress bar for long-running tasks"""
    return Progress(
        SpinnerColumn(),
        TextColumn("[bold blue]{task.description}[/bold blue]"),
        BarColumn(),
        TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
        TimeElapsedColumn(),
        console=console
    )

def timed_operation(func=None, *, name=None):
    """Decorator to time and log function execution"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            operation_name = name or func.__name__
            start_time = time.time()
            log_message(f"Starting [yellow]{operation_name}[/yellow]", category="timing")
            
            result = func(*args, **kwargs)
            
            elapsed = time.time() - start_time
            log_message(
                f"Completed [yellow]{operation_name}[/yellow] in [green]{elapsed:.2f}s[/green]", 
                category="timing"
            )
            return result
        return wrapper
    
    if func is None:
        return decorator
    return decorator(func)
