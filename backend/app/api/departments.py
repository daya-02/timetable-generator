from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import Department
from app.schemas.schemas import DepartmentCreate, DepartmentUpdate, DepartmentResponse

router = APIRouter(prefix="/departments", tags=["Departments"])

@router.get("/", response_model=List[DepartmentResponse])
def list_departments(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all departments."""
    departments = db.query(Department).offset(skip).limit(limit).all()
    return departments

@router.post("/", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_department(dept_data: DepartmentCreate, db: Session = Depends(get_db)):
    """Create a new department."""
    # Check uniqueness
    if db.query(Department).filter(Department.code == dept_data.code).first():
        raise HTTPException(status_code=400, detail="Department code already exists")
    if db.query(Department).filter(Department.name == dept_data.name).first():
        raise HTTPException(status_code=400, detail="Department name already exists")
    
    dept = Department(**dept_data.model_dump())
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept

@router.get("/{dept_id}", response_model=DepartmentResponse)
def get_department(dept_id: int, db: Session = Depends(get_db)):
    """Get department by ID."""
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return dept

@router.put("/{dept_id}", response_model=DepartmentResponse)
def update_department(dept_id: int, dept_data: DepartmentUpdate, db: Session = Depends(get_db)):
    """Update a department."""
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    
    update_data = dept_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(dept, key, value)
    
    db.commit()
    db.refresh(dept)
    return dept

@router.delete("/{dept_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department(dept_id: int, db: Session = Depends(get_db)):
    """Delete a department."""
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    db.delete(dept)
    db.commit()
    return None
