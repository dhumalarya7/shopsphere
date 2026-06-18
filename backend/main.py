import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from jose import jwt
from pydantic import BaseModel, ConfigDict
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

try:
    from backend import models
    from backend.database import Base, SessionLocal, engine
    from backend.models import User
except ModuleNotFoundError:
    import models
    from database import Base, SessionLocal, engine
    from models import User


SECRET_KEY = os.getenv("JWT_SECRET_KEY", "shopsphere-dev-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
PASSWORD_SCHEME = "pbkdf2_sha256"
PASSWORD_ITERATIONS = 210_000
DEFAULT_PRODUCTS = [
    {"name": "MacBook Air M3", "price": 114900},
    {"name": "iPhone 16 Pro", "price": 119900},
    {"name": "Sony WH-1000XM5", "price": 29990},
    {"name": "Apple Watch Series 10", "price": 49900},
    {"name": "Samsung Odyssey G6", "price": 39999},
]

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://shopsphere-tau-mauve.vercel.app",
        "https://shopsphere-ariii1.vercel.app",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def initialize_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(models.Product).count() == 0:
            db.add_all([models.Product(**product) for product in DEFAULT_PRODUCTS])
            db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise
    finally:
        db.close()


initialize_database()


def normalize_email(email: str) -> str:
    return email.strip().lower()


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        PASSWORD_ITERATIONS,
    ).hex()
    return f"{PASSWORD_SCHEME}${PASSWORD_ITERATIONS}${salt}${digest}"


def verify_password(password: str, stored_password: str) -> bool:
    if not stored_password:
        return False

    parts = stored_password.split("$")
    if len(parts) == 4 and parts[0] == PASSWORD_SCHEME:
        try:
            iterations = int(parts[1])
        except ValueError:
            return False

        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            parts[2].encode("utf-8"),
            iterations,
        ).hex()
        return hmac.compare_digest(digest, parts[3])

    return hmac.compare_digest(password, stored_password)


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


class ProductCreate(BaseModel):
    name: str
    price: int


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    price: int


class UserCreate(BaseModel):
    name: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str


class RegisterResponse(BaseModel):
    message: str
    id: int


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


@app.get("/")
def home():
    return {"message": "ShopSphere API Running"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/products", response_model=list[ProductOut])
def get_products(db: Session = Depends(get_db)):
    try:
        return db.query(models.Product).order_by(models.Product.id).all()
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable",
        ) from exc


@app.post("/products", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    if not product.name.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Product name is required")
    if product.price < 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Product price must be positive")

    new_product = models.Product(name=product.name.strip(), price=product.price)

    try:
        db.add(new_product)
        db.commit()
        db.refresh(new_product)
        return new_product
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not create product",
        ) from exc


@app.put("/products/{id}", response_model=ProductOut)
def update_product(id: int, product: ProductCreate, db: Session = Depends(get_db)):
    db_product = db.query(models.Product).filter(models.Product.id == id).first()
    if not db_product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    if not product.name.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Product name is required")
    if product.price < 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Product price must be positive")

    db_product.name = product.name.strip()
    db_product.price = product.price

    try:
        db.commit()
        db.refresh(db_product)
        return db_product
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not update product",
        ) from exc


@app.delete("/products/{id}")
def delete_product(id: int, db: Session = Depends(get_db)):
    db_product = db.query(models.Product).filter(models.Product.id == id).first()
    if not db_product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    try:
        db.delete(db_product)
        db.commit()
        return {"message": "Product Deleted"}
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not delete product",
        ) from exc


@app.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(user: UserCreate, db: Session = Depends(get_db)):
    name = user.name.strip()
    email = normalize_email(user.email)
    password = user.password

    if not name:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Name is required")
    if "@" not in email:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Valid email is required")
    if len(password) < 8:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Password must be at least 8 characters")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")

    new_user = User(name=name, email=email, password=hash_password(password))

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return {"message": "User registered successfully", "id": new_user.id}
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered") from exc
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not register user",
        ) from exc


@app.post("/login", response_model=TokenResponse)
def login(user: UserLogin, db: Session = Depends(get_db)):
    email = normalize_email(user.email)
    db_user = db.query(User).filter(User.email == email).first()

    if not db_user or not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if not db_user.password.startswith(f"{PASSWORD_SCHEME}$"):
        db_user.password = hash_password(user.password)
        db.commit()
        db.refresh(db_user)

    access_token = create_access_token(data={"sub": db_user.email})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": db_user,
    }
