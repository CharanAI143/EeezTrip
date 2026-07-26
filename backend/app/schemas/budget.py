from pydantic import BaseModel, Field
from typing import Optional

class BudgetBreakdownSchema(BaseModel):
    accommodation: int = Field(0, ge=0)
    food: int = Field(0, ge=0)
    transport: int = Field(0, ge=0)
    activities: int = Field(0, ge=0)
    misc: int = Field(0, ge=0)

class ExpenseCreate(BaseModel):
    trip_id: str
    category: str = Field(..., description="accommodation, food, transport, activities, misc")
    amount: int = Field(..., gt=0)
    note: Optional[str] = None
    date: str

class ExpenseOut(ExpenseCreate):
    id: str
    created_at: str
