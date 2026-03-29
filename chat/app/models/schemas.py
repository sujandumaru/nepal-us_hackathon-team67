from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=3,
                          description="User's visa-related question")


class ChatResponse(BaseModel):
    answer: str
    sources: list[str]
    route_reason: str
