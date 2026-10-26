"""Aggregated router for API version 1."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.accounts import accounts_router
from app.api.v1.admin import admin_router
from app.api.v1.public import health_router, public_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(public_router)
api_router.include_router(accounts_router)
api_router.include_router(admin_router)
