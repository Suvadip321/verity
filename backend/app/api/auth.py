import asyncio

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import get_current_user
from app.core.supabase_client import supabase
from app.schemas.auth import LoginRequest, SignupRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup")
async def signup(request: SignupRequest):
    try:
        response = await asyncio.to_thread(
            supabase.auth.sign_up,
            {
                "email": request.email,
                "password": request.password,
            }
        )
        if response.user is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Signup failed",
            )
        return {"message": "User created successfully. Please check email for verification if enabled."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    try:
        response = await asyncio.to_thread(
            supabase.auth.sign_in_with_password,
            {
                "email": request.email,
                "password": request.password,
            }
        )
        return TokenResponse(
            access_token=response.session.access_token,
            token_type="bearer",
            user=UserResponse(
                id=str(response.user.id),
                email=response.user.email or "",
                created_at=response.user.created_at,
            ),
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user=Depends(get_current_user)):
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email or "",
        created_at=current_user.created_at,
    )
