from fastapi import APIRouter, HTTPException, Depends
from services.auth_service import get_current_user
from services.timeline_service import TimelineService

router = APIRouter(prefix="/timeline", tags=["timeline"])
timeline_service = TimelineService()

@router.get("/")
async def get_timeline(user=Depends(get_current_user)):
    """Returns the user's document timeline grouped by month."""
    try:
        timeline = await timeline_service.get_timeline(user.id)
        return {"timeline": timeline}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{year}/{month}/summary")
async def get_monthly_summary(year: int, month: int, user=Depends(get_current_user)):
    """Returns an AI summary of what was learned in a specific month."""
    try:
        summary = await timeline_service.summarize_month(user.id, year, month)
        return {
            "year": year,
            "month": month,
            "summary": summary
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
