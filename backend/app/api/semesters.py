"""
CRUD API routes for Semesters (Classes).
Department-aware filtering supported via `dept_id` query param.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.db.models import Semester, Batch
from app.schemas.schemas import SemesterCreate, SemesterUpdate, SemesterResponse, SemesterResponseWithBatches, BatchCreate, BatchResponse

router = APIRouter(prefix="/semesters", tags=["Semesters/Classes"])


@router.get("/", response_model=List[SemesterResponseWithBatches])
def list_semesters(
    skip: int = 0,
    limit: int = 100,
    dept_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Get all semesters/classes with their batches."""
    query = db.query(Semester).options(joinedload(Semester.batches))
    if dept_id:
        query = query.filter(Semester.dept_id == dept_id)
    semesters = query.offset(skip).limit(limit).all()
    # Deduplicate (joinedload + limit can cause duplicates)
    seen = set()
    unique = []
    for s in semesters:
        if s.id not in seen:
            seen.add(s.id)
            unique.append(s)
    return unique


@router.get("/{semester_id}", response_model=SemesterResponse)
def get_semester(semester_id: int, db: Session = Depends(get_db)):
    """Get a specific semester by ID."""
    semester = db.query(Semester).filter(Semester.id == semester_id).first()
    if not semester:
        raise HTTPException(status_code=404, detail="Semester not found")
    return semester


@router.post("/", response_model=SemesterResponse, status_code=status.HTTP_201_CREATED)
def create_semester(semester_data: SemesterCreate, db: Session = Depends(get_db)):
    """Create a new semester/class."""
    # Check for duplicate code
    existing = db.query(Semester).filter(Semester.code == semester_data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Semester with this code already exists")
    
    semester = Semester(**semester_data.model_dump())
    db.add(semester)
    db.commit()
    db.refresh(semester)
    return semester


@router.put("/{semester_id}", response_model=SemesterResponse)
def update_semester(semester_id: int, semester_data: SemesterUpdate, db: Session = Depends(get_db)):
    """Update a semester."""
    semester = db.query(Semester).filter(Semester.id == semester_id).first()
    if not semester:
        raise HTTPException(status_code=404, detail="Semester not found")
    
    update_data = semester_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(semester, key, value)
    
    db.commit()
    db.refresh(semester)
    return semester


@router.delete("/{semester_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_semester(semester_id: int, db: Session = Depends(get_db)):
    """Delete a semester."""
    semester = db.query(Semester).filter(Semester.id == semester_id).first()
    if not semester:
        raise HTTPException(status_code=404, detail="Semester not found")
    
    db.delete(semester)
    db.commit()
    return None


@router.get("/{semester_id}/batches", response_model=List[BatchResponse])
def list_batches(semester_id: int, db: Session = Depends(get_db)):
    """Get all batches for a semester."""
    semester = db.query(Semester).filter(Semester.id == semester_id).first()
    if not semester:
        raise HTTPException(status_code=404, detail="Semester not found")
    return semester.batches


@router.post("/{semester_id}/batches", response_model=BatchResponse, status_code=status.HTTP_201_CREATED)
def create_batch(semester_id: int, batch_data: BatchCreate, db: Session = Depends(get_db)):
    """Create a new batch for a semester."""
    semester = db.query(Semester).filter(Semester.id == semester_id).first()
    if not semester:
        raise HTTPException(status_code=404, detail="Semester not found")
    
    # Check for duplicate batch name in this semester
    existing = db.query(Batch).filter(Batch.semester_id == semester_id, Batch.name == batch_data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Batch with this name already exists in this semester")
    
    batch = Batch(**batch_data.model_dump(), semester_id=semester_id)
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch


@router.delete("/{semester_id}/batches/{batch_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_batch(semester_id: int, batch_id: int, db: Session = Depends(get_db)):
    """Delete a batch."""
    batch = db.query(Batch).filter(Batch.id == batch_id, Batch.semester_id == semester_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    db.delete(batch)
    db.commit()
    return None
