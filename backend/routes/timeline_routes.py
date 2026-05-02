from fastapi import APIRouter, HTTPException, Depends
from services.auth_service import get_current_user
from services.timeline_service import TimelineService

router = APIRouter(prefix="/timeline", tags=["timeline"])

# Dependency to get an authenticated Timeline service
async def get_timeline_service(auth=Depends(get_current_user)):
    user, token = auth
    return TimelineService(token=token)

@router.get("/")
async def get_timeline(auth=Depends(get_current_user), ts: TimelineService = Depends(get_timeline_service)):
    """Returns the user's document timeline grouped by month."""
    user, token = auth
    try:
        timeline = await ts.get_timeline(user.id)
        return {"timeline": timeline}
    except Exception as e:
        print(f"[get_timeline] Internal error: {e}")
        raise HTTPException(status_code=500, detail="Could not retrieve timeline.")

@router.get("/{year}/{month}/summary")
async def get_monthly_summary(year: int, month: int, auth=Depends(get_current_user), ts: TimelineService = Depends(get_timeline_service)):
    """Returns an AI summary of what was learned in a specific month."""
    user, token = auth
    try:
        summary = await ts.summarize_month(user.id, year, month)
        return {
            "year": year,
            "month": month,
            "summary": summary
        }
    except Exception as e:
        print(f"[get_monthly_summary] Internal error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate monthly summary.")
