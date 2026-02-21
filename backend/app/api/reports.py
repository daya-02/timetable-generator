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
