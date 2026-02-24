"""
Accreditation Reports API (READ-ONLY).
"""
from datetime import date
from io import BytesIO
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.schemas import (
    TeacherWorkloadReport,
    RoomUtilizationReport,
    SubjectCoverageReport,
)
from app.db.models import Room, RoomType, Allocation, Semester
from sqlalchemy.orm import joinedload
from app.services.reporting import (
    build_teacher_workload_report,
    build_room_utilization_report,
    build_subject_coverage_report,
)
from app.services.report_pdf_service import ReportPDFService

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/teacher-workload", response_model=TeacherWorkloadReport)
def teacher_workload_report(
    dept_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Teacher workload report (READ-ONLY)."""
    return build_teacher_workload_report(db, dept_id=dept_id)


@router.get("/room-utilization", response_model=RoomUtilizationReport)
def room_utilization_report(
    dept_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Room utilization report (READ-ONLY)."""
    return build_room_utilization_report(db, dept_id=dept_id)


@router.get("/subject-coverage", response_model=SubjectCoverageReport)
def subject_coverage_report(
    dept_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Subject coverage report (READ-ONLY)."""
    return build_subject_coverage_report(db, dept_id=dept_id)


@router.get("/teacher-workload/pdf")
def teacher_workload_report_pdf(
    dept_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Teacher workload report PDF (READ-ONLY)."""
    report = build_teacher_workload_report(db, dept_id=dept_id)
    pdf_service = ReportPDFService()

    subtitle = "All Departments" if not report.get("department") else report["department"]["name"]
    headers = [
        "Teacher",
        "Code",
        "Total",
        "Theory",
        "Lab",
        "Tutorial",
        "Project",
        "Report",
        "Seminar",
        "Internship",
        "Elective",
        "Max Consecutive",
        "Free Periods",
        "Departments",
    ]
    rows = []
    for row in report["rows"]:
        rows.append([
            row["teacher_name"],
            row.get("teacher_code") or "",
            str(row["total_hours"]),
            str(row["theory_hours"]),
            str(row["lab_hours"]),
            str(row.get("tutorial_hours", 0)),
            str(row.get("project_hours", 0)),
            str(row.get("report_hours", 0)),
            str(row.get("seminar_hours", 0)),
            str(row.get("internship_hours", 0)),
            str(row["elective_hours"]),
            str(row["max_consecutive_periods"]),
            str(row["free_periods"]),
            ", ".join([d["code"] for d in row.get("departments", [])]),
        ])

    pdf_bytes = pdf_service.build_report_pdf(
        "Teacher Workload Report",
        f"Department: {subtitle}",
        headers,
        rows,
        landscape_mode=True,
    )

    filename = f"Teacher_Workload_Report_{date.today().isoformat()}.pdf"
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/room-utilization/pdf")
def room_utilization_report_pdf(
    dept_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Room utilization report PDF (READ-ONLY)."""
    report = build_room_utilization_report(db, dept_id=dept_id)
    pdf_service = ReportPDFService()

    subtitle = "All Departments" if not report.get("department") else report["department"]["name"]
    headers = [
        "Room",
        "Type",
        "Available",
        "Used",
        "Utilization %",
        "Peak Days",
    ]
    rows = []
    for row in report["rows"]:
        rows.append([
            row["room_name"],
            str(row["room_type"]),
            str(row["total_available_periods"]),
            str(row["periods_used"]),
            f"{row['utilization_percent']:.2f}",
            ", ".join(row.get("peak_usage_days", [])),
        ])

    pdf_bytes = pdf_service.build_report_pdf(
        "Room Utilization Report",
        f"Department: {subtitle}",
        headers,
        rows,
        landscape_mode=True,
    )

    filename = f"Room_Utilization_Report_{date.today().isoformat()}.pdf"
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/subject-coverage/pdf")
def subject_coverage_report_pdf(
    dept_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    """Subject coverage report PDF (READ-ONLY)."""
    report = build_subject_coverage_report(db, dept_id=dept_id)
    pdf_service = ReportPDFService()

    subtitle = "All Departments" if not report.get("department") else report["department"]["name"]
    headers = [
        "Subject",
        "Code",
        "Class",
        "Required",
        "Assigned",
        "Status",
        "Teachers",
    ]
    rows = []
    for row in report["rows"]:
        class_label = f"{row.get('semester_code', '')} ({row.get('year', '')}{row.get('section', '')})"
        rows.append([
            row["subject_name"],
            row["subject_code"],
            class_label.strip(),
            str(row["required_hours"]),
            str(row["assigned_hours"]),
            row["status"],
            ", ".join(row.get("teacher_codes", []) or row.get("teacher_names", [])),
        ])

    pdf_bytes = pdf_service.build_report_pdf(
        "Subject Coverage Report",
        f"Department: {subtitle}",
        headers,
        rows,
        landscape_mode=True,
    )

    filename = f"Subject_Coverage_Report_{date.today().isoformat()}.pdf"
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/master-lab")
def master_lab_timetable(
    dept_id: Optional[int] = None,
    semester_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Master Lab Timetable (READ-ONLY)."""
    # 1. Get all Lab Rooms
    rooms_query = db.query(Room).filter(Room.room_type == RoomType.LAB)
    lab_rooms = rooms_query.order_by(Room.name).all()
    room_ids = [r.id for r in lab_rooms]

    if not room_ids:
        return {"rooms": [], "grid": {}}

    # 2. Base query for allocations in these lab rooms
    query = db.query(Allocation).options(
        joinedload(Allocation.subject),
        joinedload(Allocation.semester),
        joinedload(Allocation.teacher),
        joinedload(Allocation.batch)
    ).filter(Allocation.room_id.in_(room_ids))

    # Apply filters
    if dept_id:
        dept_sem_ids = [sid for (sid,) in db.query(Semester.id).filter(Semester.dept_id == dept_id).all()]
        if dept_sem_ids:
            query = query.filter(Allocation.semester_id.in_(dept_sem_ids))
        else:
            query = query.filter(Allocation.id < 0)  # Empty

    if semester_type == "ODD":
        query = query.join(Semester).filter(Semester.semester_number % 2 != 0)
    elif semester_type == "EVEN":
        query = query.join(Semester).filter(Semester.semester_number % 2 == 0)

    allocations = query.all()

    # 3. Build the Grid View
    # Structure: grid[day][slot][room_id] = [alloc1, alloc2, ...]
    grid = {}
    for d in range(5):
        grid[str(d)] = {}
        for s in range(7):
            grid[str(d)][str(s)] = {}
            for r in lab_rooms:
                grid[str(d)][str(s)][str(r.id)] = []

    for a in allocations:
        day_str = str(a.day)
        slot_str = str(a.slot)
        room_str = str(a.room_id)
        
        if day_str not in grid: grid[day_str] = {}
        if slot_str not in grid[day_str]: grid[day_str][slot_str] = {}
        if room_str not in grid[day_str][slot_str]: grid[day_str][slot_str][room_str] = []
        
        grid[day_str][slot_str][room_str].append({
            "class_name": a.semester.name,
            "subject_code": a.subject.code,
            "batch": a.batch.name if a.batch else "",
            "teacher": a.teacher.teacher_code or a.teacher.name
        })

    return {
        "rooms": [{"id": r.id, "name": r.name} for r in lab_rooms],
        "grid": grid
    }
