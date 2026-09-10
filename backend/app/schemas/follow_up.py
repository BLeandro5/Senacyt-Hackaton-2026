from typing import Literal
from pydantic import BaseModel, Field

class FollowUpCandidate(BaseModel):
    equipment_index: int = Field(ge=0)
    field: Literal['quantity','manufacturer','age','model','configuration','condition']
    question: str = Field(min_length=3,max_length=240)
