from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import (
    StructuredCompositeBasket, 
    StructuredCompositeBasketSubject,
    Subject, 
    Department,
    Semester
)
from app.schemas.schemas import (
    StructuredCompositeBasketCreate, 
    StructuredCompositeBasketUpdate, 
    StructuredCompositeBasketResponse
)

router = APIRouter(prefix="/structured-composite-baskets", tags=["Structured Composite Baskets"])


@router.get("/", response_model=List[StructuredCompositeBasketResponse])
def list_scb(db: Session = Depends(get_db)):
    """Get all structured composite baskets."""
    baskets = db.query(StructuredCompositeBasket).all()
    # Ensure manual mapping if needed
    result = []
    for b in baskets:
        basket_dict = {
            "id": b.id,
            "name": b.name,
            "semester": b.semester,
            "theory_hours": b.theory_hours,
            "lab_hours": b.lab_hours,
            "continuous_lab_periods": b.continuous_lab_periods,
            "same_slot_across_departments": b.same_slot_across_departments,
            "allow_lab_parallel": b.allow_lab_parallel,
            "is_scheduled": b.is_scheduled,
            "scheduled_slots": b.scheduled_slots,
            "departments_involved": b.departments_involved,
            "linked_subjects": [link.subject for link in b.linked_subjects]
        }
        result.append(basket_dict)
    return result


@router.get("/{basket_id}", response_model=StructuredCompositeBasketResponse)
def get_scb(basket_id: int, db: Session = Depends(get_db)):
    """Get a specific SCB."""
    basket = db.query(StructuredCompositeBasket).filter(StructuredCompositeBasket.id == basket_id).first()
    if not basket:
        raise HTTPException(status_code=404, detail="Structured Composite Basket not found")
    
    basket_dict = {
        "id": basket.id,
        "name": basket.name,
        "semester": basket.semester,
        "theory_hours": basket.theory_hours,
        "lab_hours": basket.lab_hours,
        "continuous_lab_periods": basket.continuous_lab_periods,
        "same_slot_across_departments": basket.same_slot_across_departments,
        "allow_lab_parallel": basket.allow_lab_parallel,
        "is_scheduled": basket.is_scheduled,
        "scheduled_slots": basket.scheduled_slots,
        "departments_involved": basket.departments_involved,
        "linked_subjects": [link.subject for link in basket.linked_subjects]
    }
    return basket_dict


@router.post("/", response_model=StructuredCompositeBasketResponse, status_code=status.HTTP_201_CREATED)
def create_scb(basket_data: StructuredCompositeBasketCreate, db: Session = Depends(get_db)):
    """Create a new Structured Composite Basket."""
    basket = StructuredCompositeBasket(
        name=basket_data.name,
        semester=basket_data.semester,
        theory_hours=basket_data.theory_hours,
        lab_hours=basket_data.lab_hours,
        continuous_lab_periods=basket_data.continuous_lab_periods,
        same_slot_across_departments=basket_data.same_slot_across_departments,
        allow_lab_parallel=basket_data.allow_lab_parallel
    )
    
    # Assign participating departments
    if basket_data.department_ids:
        depts = db.query(Department).filter(Department.id.in_(basket_data.department_ids)).all()
        basket.departments_involved = depts
        
    db.add(basket)
    db.commit()
    db.refresh(basket)
    
    # Link subjects
    if basket_data.subject_ids:
        for subj_id in basket_data.subject_ids:
            subject = db.query(Subject).filter(Subject.id == subj_id).first()
            if subject:
                link = StructuredCompositeBasketSubject(basket_id=basket.id, subject_id=subject.id)
                db.add(link)
        db.commit()
        db.refresh(basket)

    return {
        "id": basket.id,
        "name": basket.name,
        "semester": basket.semester,
        "theory_hours": basket.theory_hours,
        "lab_hours": basket.lab_hours,
        "continuous_lab_periods": basket.continuous_lab_periods,
        "same_slot_across_departments": basket.same_slot_across_departments,
        "allow_lab_parallel": basket.allow_lab_parallel,
        "is_scheduled": basket.is_scheduled,
        "scheduled_slots": basket.scheduled_slots,
        "departments_involved": basket.departments_involved,
        "linked_subjects": [link.subject for link in basket.linked_subjects]
    }


@router.put("/{basket_id}", response_model=StructuredCompositeBasketResponse)
def update_scb(basket_id: int, basket_data: StructuredCompositeBasketUpdate, db: Session = Depends(get_db)):
    """Update a Structured Composite Basket."""
    basket = db.query(StructuredCompositeBasket).filter(StructuredCompositeBasket.id == basket_id).first()
    if not basket:
        raise HTTPException(status_code=404, detail="Structured Composite Basket not found")
        
    update_data = basket_data.model_dump(exclude_unset=True)
    
    if 'department_ids' in update_data:
        dept_ids = update_data.pop('department_ids')
        if dept_ids is not None:
            depts = db.query(Department).filter(Department.id.in_(dept_ids)).all()
            basket.departments_involved = depts
            
    if 'subject_ids' in update_data:
        subj_ids = update_data.pop('subject_ids')
        if subj_ids is not None:
            # Clear old
            db.query(StructuredCompositeBasketSubject).filter(
                StructuredCompositeBasketSubject.basket_id == basket_id
            ).delete()
            # Add new
            for subj_id in subj_ids:
                subject = db.query(Subject).filter(Subject.id == subj_id).first()
                if subject:
                    link = StructuredCompositeBasketSubject(basket_id=basket.id, subject_id=subject.id)
                    db.add(link)
    
    for key, value in update_data.items():
        setattr(basket, key, value)
        
    db.commit()
    db.refresh(basket)
    
    return {
        "id": basket.id,
        "name": basket.name,
        "semester": basket.semester,
        "theory_hours": basket.theory_hours,
        "lab_hours": basket.lab_hours,
        "continuous_lab_periods": basket.continuous_lab_periods,
        "same_slot_across_departments": basket.same_slot_across_departments,
        "allow_lab_parallel": basket.allow_lab_parallel,
        "is_scheduled": basket.is_scheduled,
        "scheduled_slots": basket.scheduled_slots,
        "departments_involved": basket.departments_involved,
        "linked_subjects": [link.subject for link in basket.linked_subjects]
    }


@router.delete("/{basket_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scb(basket_id: int, db: Session = Depends(get_db)):
    """Delete a Structured Composite Basket."""
    basket = db.query(StructuredCompositeBasket).filter(StructuredCompositeBasket.id == basket_id).first()
    if not basket:
        raise HTTPException(status_code=404, detail="Structured Composite Basket not found")
        
    db.delete(basket)
    db.commit()
    return None
