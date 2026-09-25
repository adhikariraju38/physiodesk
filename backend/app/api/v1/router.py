from fastapi import APIRouter

from app.api.v1 import appointments, auth, invoices, patients, schedule, therapists

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(patients.router)
api_router.include_router(therapists.router)
api_router.include_router(schedule.router)
api_router.include_router(appointments.router)
api_router.include_router(invoices.router)
