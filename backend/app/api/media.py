from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool
from app.services.local_media import capabilities, transcribe, recognize_photo

router=APIRouter(prefix='/media',tags=['Local media'])

@router.get('/status')
def status(): return capabilities()

@router.post('/transcribe')
async def speech(request: Request):
    data=bytearray()
    async for chunk in request.stream():
        data.extend(chunk)
        if len(data)>12*1024*1024: raise HTTPException(413,'Audio demasiado grande.')
    return await run_in_threadpool(transcribe,bytes(data))

class Photo(BaseModel):
    dataUrl: str=Field(max_length=3_000_000)

@router.post('/ocr')
def ocr(photo: Photo): return recognize_photo(photo.dataUrl)
