"""
CRUD API routes for Parallel Lab Baskets.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.db.models import ParallelLabBasket, ParallelLabBasketSubject

router = APIRouter(prefix="/parallel-lab-baskets", tags=["Parallel Lab Baskets"])

class ParallelLabBasketSubjectCreate(BaseModel):
    subject_id: int
    batch_name: str
    teacher_id: int
    room_id: Optional[int] = None

class ParallelLabBasketCreate(BaseModel):
    dept_id: int
    year: int
    section: str
    slot_day: int = -1
    slot_period_start: int = -1
    slot_period_count: int = 4
    subjects: List[ParallelLabBasketSubjectCreate]

class ParallelLabBasketSubjectResponse(BaseModel):
    id: int
    basket_id: int
    subject_id: int
    batch_name: str
    teacher_id: int
    room_id: Optional[int] = None

    class Config:
        from_attributes = True

class ParallelLabBasketResponse(BaseModel):
    id: int
    dept_id: int
    year: int
    section: str
    slot_day: int
    slot_period_start: int
    slot_period_count: int
    basket_subjects: List[ParallelLabBasketSubjectResponse]

    class Config:
        from_attributes = True

@router.get("/", response_model=List[ParallelLabBasketResponse])
def get_all_baskets(dept_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(ParallelLabBasket).options(joinedload(ParallelLabBasket.basket_subjects))
    if dept_id:
        query = query.filter(ParallelLabBasket.dept_id == dept_id)
    return query.all()

@router.post("/", response_model=ParallelLabBasketResponse)
def create_basket(basket_data: ParallelLabBasketCreate, db: Session = Depends(get_db)):
    basket = ParallelLabBasket(
        dept_id=basket_data.dept_id,
        year=basket_data.year,
        section=basket_data.section,
        slot_day=basket_data.slot_day,
        slot_period_start=basket_data.slot_period_start,
        slot_period_count=basket_data.slot_period_count
    )
    db.add(basket)
    db.commit()
    db.refresh(basket)

    for subj in basket_data.subjects:
        basket_subj = ParallelLabBasketSubject(
            basket_id=basket.id,
            subject_id=subj.subject_id,
            batch_name=subj.batch_name,
            teacher_id=subj.teacher_id,
            room_id=subj.room_id
        )
        db.add(basket_subj)

    db.commit()
    db.refresh(basket)
    return basket

@router.delete("/{basket_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_basket(basket_id: int, db: Session = Depends(get_db)):
    basket = db.query(ParallelLabBasket).filter(ParallelLabBasket.id == basket_id).first()
    if not basket:
        raise HTTPException(status_code=404, detail="Basket not found")
    
    db.delete(basket)
    db.commit()
    return None

@router.put("/{basket_id}", response_model=ParallelLabBasketResponse)
def update_basket(basket_id: int, basket_data: ParallelLabBasketCreate, db: Session = Depends(get_db)):
    basket = db.query(ParallelLabBasket).filter(ParallelLabBasket.id == basket_id).first()
    if not basket:
        raise HTTPException(status_code=404, detail="Basket not found")
    
    basket.dept_id = basket_data.dept_id
    basket.year = basket_data.year
    basket.section = basket_data.section
    basket.slot_day = basket_data.slot_day
    basket.slot_period_start = basket_data.slot_period_start
    basket.slot_period_count = basket_data.slot_period_count
    
    # Delete old subjects
    db.query(ParallelLabBasketSubject).filter(ParallelLabBasketSubject.basket_id == basket_id).delete()
    
    for subj in basket_data.subjects:
        basket_subj = ParallelLabBasketSubject(
            basket_id=basket.id,
            subject_id=subj.subject_id,
            batch_name=subj.batch_name,
            teacher_id=subj.teacher_id,
            room_id=subj.room_id
        )
        db.add(basket_subj)
        
    db.commit()
    db.refresh(basket)
    return basket
