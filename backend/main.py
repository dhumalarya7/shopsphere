from fastapi import FastAPI
from pydantic import BaseModel
from jose import jwt
from datetime import datetime, timedelta
from database import engine, Base, SessionLocal
import models
from models import User

app = FastAPI()

# Create tables
Base.metadata.create_all(bind=engine)

print("Tables Created!")
SECRET_KEY = "shopsphere-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def create_access_token(data: dict):
    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return encoded_jwt


# -----------------------------
# Pydantic Schemas
# -----------------------------

class ProductCreate(BaseModel):
    name: str
    price: int


class UserCreate(BaseModel):
    name: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


# -----------------------------
# Home Route
# -----------------------------

@app.get("/")
def home():
    return {"message": "ShopSphere API Running"}


# -----------------------------
# GET Products
# -----------------------------

@app.get("/products")
def get_products():
    db = SessionLocal()

    products = db.query(models.Product).all()

    return products


# -----------------------------
# CREATE Product
# -----------------------------

@app.post("/products")
def create_product(product: ProductCreate):
    db = SessionLocal()

    new_product = models.Product(
        name=product.name,
        price=product.price
    )

    db.add(new_product)
    db.commit()
    db.refresh(new_product)

    return {
        "message": "Product Created",
        "id": new_product.id
    }


# -----------------------------
# UPDATE Product
# -----------------------------

@app.put("/products/{id}")
def update_product(id: int, product: ProductCreate):
    db = SessionLocal()

    db_product = db.query(models.Product).filter(
        models.Product.id == id
    ).first()

    if not db_product:
        return {"error": "Product not found"}

    db_product.name = product.name
    db_product.price = product.price

    db.commit()
    db.refresh(db_product)

    return {
        "message": "Product Updated",
        "product": {
            "id": db_product.id,
            "name": db_product.name,
            "price": db_product.price
        }
    }


# -----------------------------
# DELETE Product
# -----------------------------

@app.delete("/products/{id}")
def delete_product(id: int):
    db = SessionLocal()

    db_product = db.query(models.Product).filter(
        models.Product.id == id
    ).first()

    if not db_product:
        return {"error": "Product not found"}

    db.delete(db_product)
    db.commit()

    return {"message": "Product Deleted"}


# -----------------------------
# REGISTER User
# -----------------------------

@app.post("/register")
def register(user: UserCreate):
    db = SessionLocal()

    new_user = User(
        name=user.name,
        email=user.email,
        password=user.password
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User registered successfully",
        "id": new_user.id
    }


# -----------------------------
# LOGIN User
# -----------------------------

@app.post("/login")
def login(user: UserLogin):
    db = SessionLocal()

    db_user = db.query(User).filter(
        User.email == user.email
    ).first()

    if not db_user:
        return {"error": "User not found"}

    if db_user.password != user.password:
        return {"error": "Wrong password"}

    access_token = create_access_token(
    data={"sub": db_user.email}
)

    return {
    "access_token": access_token,
    "token_type": "bearer"
}