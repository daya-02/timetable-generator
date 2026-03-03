"""
Application configuration settings.
Loads environment variables and provides typed access.

COLLEGE TIME STRUCTURE:
- Total periods per day: 7
- Working days: Monday to Friday

PERIOD TIMINGS:
1st Period  : 08:45 – 09:45
2nd Period  : 09:45 – 10:45
BREAK       : 10:45 – 11:00
3rd Period  : 11:00 – 12:00
LUNCH       : 12:00 – 01:00
4th Period  : 01:00 – 02:00
5th Period  : 02:00 – 02:50
BREAK       : 02:50 – 03:05
6th Period  : 03:05 – 03:55
7th Period  : 03:55 – 04:45

LAB RULES:
- A LAB occupies TWO CONTINUOUS PERIODS
- Labs can be scheduled at any time slot
- No overlapping labs

FREE PERIOD:
- Exactly 1 free period per class per week
"""
from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH = BACKEND_ROOT / "timetable.db"
DEFAULT_SQLITE_URL = f"sqlite:///{DEFAULT_DB_PATH.as_posix()}"


def _normalize_database_url(database_url: str) -> str:
    """
    Resolve relative SQLite paths against backend root so all run modes
    (uvicorn from backend/, root/, IDE, scripts) use one physical DB file.
    """
    if not database_url or not database_url.startswith("sqlite"):
        return database_url

    if database_url in {"sqlite://", "sqlite:///:memory:", "sqlite+pysqlite:///:memory:"}:
        return database_url

    if database_url.startswith("sqlite:///"):
        raw_path = database_url[len("sqlite:///"):]
        if not raw_path:
            return DEFAULT_SQLITE_URL

        # Handle Windows absolute paths sometimes represented as "/C:/..."
        if raw_path.startswith("/") and len(raw_path) > 2 and raw_path[2] == ":":
            raw_path = raw_path[1:]

        candidate_path = Path(raw_path)
        if not candidate_path.is_absolute():
            candidate_path = BACKEND_ROOT / candidate_path

        return f"sqlite:///{candidate_path.resolve().as_posix()}"

    return database_url


class PeriodTiming:
    """Represents a period with start and end times."""
    def __init__(self, period: int, start: str, end: str, is_break: bool = False, is_lunch: bool = False):
        self.period = period
        self.start = start
        self.end = end
        self.is_break = is_break
        self.is_lunch = is_lunch
    
    def __repr__(self):
        return f"Period {self.period}: {self.start} - {self.end}"


# Define the college timetable structure
PERIOD_TIMINGS = [
    PeriodTiming(1, "08:45", "09:45"),
    PeriodTiming(2, "09:45", "10:45"),
    PeriodTiming(0, "10:45", "11:00", is_break=True),  # BREAK
    PeriodTiming(3, "11:00", "12:00"),
    PeriodTiming(0, "12:00", "13:00", is_lunch=True),  # LUNCH
    PeriodTiming(4, "13:00", "14:00"),
    PeriodTiming(5, "14:00", "14:50"),
    PeriodTiming(0, "14:50", "15:05", is_break=True),  # BREAK
    PeriodTiming(6, "15:05", "15:55"),
    PeriodTiming(7, "15:55", "16:45"),
]

# Academic periods only (excluding breaks and lunch)
ACADEMIC_PERIODS = [p for p in PERIOD_TIMINGS if not p.is_break and not p.is_lunch]

# Period display strings for frontend
PERIOD_DISPLAY = {
    1: "1st (08:45-09:45)",
    2: "2nd (09:45-10:45)",
    3: "3rd (11:00-12:00)",
    4: "4th (01:00-02:00)",
    5: "5th (02:00-02:50)",
    6: "6th (03:05-03:55)",
    7: "7th (03:55-04:45)",
}

# Lab slots: Labs can be scheduled at any consecutive slot pairs
# All possible consecutive slot pairs (0-indexed)
LAB_SLOT_PAIRS = [
    (0, 1),   # 1st + 2nd period (08:45 - 10:45)
    (2, 3),   # 3rd + 4th period (11:00 - 14:00) - crosses lunch, usually avoided
    (3, 4),   # 4th + 5th period (13:00 - 14:50)
    (4, 5),   # 5th + 6th period (14:00 - 15:55)
    (5, 6),   # 6th + 7th period (15:05 - 16:45)
]


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database
    DATABASE_URL: str = DEFAULT_SQLITE_URL
    
    # Security
    SECRET_KEY: str = "dev-secret-key-change-me"
    
    # App settings
    APP_NAME: str = "AI Dept Timetable Generator"
    DEBUG: bool = True
    
    # Timetable configuration
    DAYS: list[str] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    SLOTS_PER_DAY: int = 7  # 7 academic periods per day
    
    # Period timings for display
    SLOT_TIMINGS: list[dict] = [
        {"slot": 0, "period": 1, "start": "08:45", "end": "09:45", "label": "1st Period"},
        {"slot": 1, "period": 2, "start": "09:45", "end": "10:45", "label": "2nd Period"},
        {"slot": 2, "period": 3, "start": "11:00", "end": "12:00", "label": "3rd Period"},
        {"slot": 3, "period": 4, "start": "13:00", "end": "14:00", "label": "4th Period"},
        {"slot": 4, "period": 5, "start": "14:00", "end": "14:50", "label": "5th Period"},
        {"slot": 5, "period": 6, "start": "15:05", "end": "15:55", "label": "6th Period"},
        {"slot": 6, "period": 7, "start": "15:55", "end": "16:45", "label": "7th Period"},
    ]
    
    # Break timings for display
    BREAKS: list[dict] = [
        {"after_slot": 1, "start": "10:45", "end": "11:00", "label": "Break"},
        {"after_slot": 2, "start": "12:00", "end": "13:00", "label": "Lunch"},
        {"after_slot": 4, "start": "14:50", "end": "15:05", "label": "Break"},
    ]
    
    # Lab scheduling rules - labs can be at any consecutive slots
    # All valid consecutive slot pairs
    LAB_SLOT_PAIRS: list[tuple] = [(0, 1), (2, 3), (3, 4), (4, 5), (5, 6)]
    
    # Free periods per class per week (exactly 1 free period)
    FREE_PERIODS_PER_CLASS: int = 1
    
    # Substitution weights
    SUBJECT_MATCH_WEIGHT: float = 0.4
    WORKLOAD_WEIGHT: float = 0.3
    EFFECTIVENESS_WEIGHT: float = 0.2
    EXPERIENCE_WEIGHT: float = 0.1
    
    class Config:
        env_file = str(BACKEND_ROOT / ".env")
        extra = "ignore"

    def __init__(self, **values):
        super().__init__(**values)
        self.DATABASE_URL = _normalize_database_url(self.DATABASE_URL)


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
