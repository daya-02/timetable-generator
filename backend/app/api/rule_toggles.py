"""
Department rule toggle API.
Read/write configuration only (no generation impact).
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.db.models import Department, DepartmentRuleToggle
from app.schemas.schemas import DepartmentRuleToggleResponse, DepartmentRuleToggleUpdate

router = APIRouter(prefix="/rule-toggles", tags=["Rule Toggles"])


@router.get("/", response_model=List[DepartmentRuleToggleResponse])
def list_rule_toggles(db: Session = Depends(get_db)):
    """List all rule toggle configurations."""
    toggles = db.query(DepartmentRuleToggle).options(
        joinedload(DepartmentRuleToggle.department)
    ).all()
    return toggles


@router.get("/{dept_id}", response_model=DepartmentRuleToggleResponse)
def get_rule_toggle(dept_id: int, db: Session = Depends(get_db)):
    """Get rule toggle configuration for a department."""
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    toggle = db.query(DepartmentRuleToggle).filter(
        DepartmentRuleToggle.dept_id == dept_id
    ).first()

    if not toggle:
        # Return defaults without persisting
        return DepartmentRuleToggleResponse(
            id=None,
            dept_id=dept.id,
            department=dept,
            lab_continuity_strict=False,
            teacher_gap_preference=False,
            max_consecutive_enabled=False,
            max_consecutive_limit=3,
            lab_continuity_is_hard=False,
            teacher_gap_is_hard=False,
            max_consecutive_is_hard=False,
        )

    return toggle


@router.put("/{dept_id}", response_model=DepartmentRuleToggleResponse)
def update_rule_toggle(
    dept_id: int,
    payload: DepartmentRuleToggleUpdate,
    db: Session = Depends(get_db),
):
    """Update rule toggle configuration for a department."""
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    toggle = db.query(DepartmentRuleToggle).filter(
        DepartmentRuleToggle.dept_id == dept_id
    ).first()

    if not toggle:
        toggle = DepartmentRuleToggle(dept_id=dept_id)
        db.add(toggle)

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(toggle, key, value)

    db.commit()
    db.refresh(toggle)
    return toggle

