
from getpass import getpass

from database import SessionLocal
from models import User
from security import hash_password


def main():
    full_name = input("Admin full name: ").strip()
    email = input("Admin email: ").strip().lower()
    password = getpass("Admin password (minimum 8 characters): ")

    if len(full_name) < 2:
        print("Error: Name must contain at least 2 characters.")
        return

    if len(password) < 8:
        print("Error: Password must contain at least 8 characters.")
        return

    db = SessionLocal()

    try:
        existing_user = (
            db.query(User)
            .filter(User.email == email)
            .first()
        )

        if existing_user:
            print("An account with this email already exists.")
            print("No account was changed.")
            return

        admin = User(
            full_name=full_name,
            email=email,
            password_hash=hash_password(password),
            role="admin",
            is_active=True,
        )

        db.add(admin)
        db.commit()

        print("Admin account created successfully.")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    main()
