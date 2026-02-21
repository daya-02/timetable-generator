---
description: Stabilize and extend the college timetable generation system
---

# Stabilize & Extend — Implementation Plan

## Phase 1: Backend Stability & Performance (CRITICAL)
1. Add database indexes on key columns (models.py)
2. Add SQLite WAL mode for concurrent reads (session.py)
3. Wrap all API routes in try-catch with structured error responses
4. Add eager loading / prevent N+1 queries in API routes
5. Make generation async with background task support

## Phase 2: Elective System Fix (College-Wide, Unlimited)
1. Remove hard-coded elective subject limits
2. Ensure elective baskets are year-based and cross-department
3. Global teacher blocking during elective slots
4. Multiple baskets per year with independent slots

## Phase 3: Parallel Lab System Fix
1. Ensure parallel_lab_group column exists and is used
2. Fix backend API to save parallel_lab_group correctly
3. Verify _schedule_parallel_multi_subject_labs works
4. Add retry logic for teacher unavailability

## Phase 4: Frontend Performance & UX
1. Remove heavy console.log in production
2. Add skeleton loaders
3. Lazy-load timetable only when filters selected
4. Department/Year/Section filter flow
5. Quick Entry Mode toggle

## Phase 5: UI Cleanup (Teacher-Friendly)
1. Clean professional theme (white base, subtle accent)
2. Teacher Dashboard with weekly/lab/elective hours
3. Fast sidebar navigation (no full reload)
4. Print-friendly timetable
