import hashlib
import secrets
import sqlite3
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from fastapi import HTTPException, status

from app.core.settings import settings


@dataclass
class UserRecord:
    id: int
    email: str
    name: str
    created_at: str


class UserService:
    def __init__(self, database_path: str = settings.database_path) -> None:
        self.database_path = Path(database_path)
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    def register_user(self, email: str, password: str, name: str) -> tuple[UserRecord, str]:
        normalized_email = email.strip().lower()
        if not normalized_email:
            raise HTTPException(status_code=400, detail="Email is required")

        password_hash = self._hash_password(password)
        created_at = datetime.now(UTC).isoformat()
        try:
            with self._connect() as connection:
                cursor = connection.execute(
                    "insert into users (email, password_hash, name, created_at) values (?, ?, ?, ?)",
                    (normalized_email, password_hash, name.strip() or normalized_email, created_at),
                )
                user = UserRecord(
                    id=int(cursor.lastrowid),
                    email=normalized_email,
                    name=name.strip() or normalized_email,
                    created_at=created_at,
                )
        except sqlite3.IntegrityError as exc:
            raise HTTPException(status_code=409, detail="User already exists") from exc

        return user, self.create_session(user.id)

    def authenticate_user(self, email: str, password: str) -> tuple[UserRecord, str]:
        normalized_email = email.strip().lower()
        with self._connect() as connection:
            row = connection.execute(
                "select id, email, password_hash, name, created_at from users where email = ?",
                (normalized_email,),
            ).fetchone()

        if row is None or not self._verify_password(password, row["password_hash"]):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

        user = UserRecord(id=row["id"], email=row["email"], name=row["name"], created_at=row["created_at"])
        return user, self.create_session(user.id)

    def create_session(self, user_id: int) -> str:
        token = secrets.token_urlsafe(32)
        token_hash = self._hash_token(token)
        created_at = datetime.now(UTC).isoformat()
        with self._connect() as connection:
            connection.execute(
                "insert into sessions (token_hash, user_id, created_at) values (?, ?, ?)",
                (token_hash, user_id, created_at),
            )
        return token

    def get_user_by_token(self, token: str) -> UserRecord:
        token_hash = self._hash_token(token)
        with self._connect() as connection:
            row = connection.execute(
                """
                select users.id, users.email, users.name, users.created_at
                from sessions
                join users on users.id = sessions.user_id
                where sessions.token_hash = ?
                """,
                (token_hash,),
            ).fetchone()

        if row is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token")

        return UserRecord(id=row["id"], email=row["email"], name=row["name"], created_at=row["created_at"])

    def delete_session(self, token: str) -> None:
        with self._connect() as connection:
            connection.execute("delete from sessions where token_hash = ?", (self._hash_token(token),))

    def _initialize(self) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                create table if not exists users (
                    id integer primary key autoincrement,
                    email text not null unique,
                    password_hash text not null,
                    name text not null,
                    created_at text not null
                )
                """
            )
            connection.execute(
                """
                create table if not exists sessions (
                    token_hash text primary key,
                    user_id integer not null,
                    created_at text not null,
                    foreign key (user_id) references users(id) on delete cascade
                )
                """
            )

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database_path)
        connection.row_factory = sqlite3.Row
        connection.execute("pragma foreign_keys = on")
        return connection

    def _hash_password(self, password: str) -> str:
        if len(password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
        salt = secrets.token_hex(16)
        digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120_000)
        return f"{salt}:{digest.hex()}"

    def _verify_password(self, password: str, stored_hash: str) -> bool:
        salt, expected_digest = stored_hash.split(":", 1)
        digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120_000)
        return secrets.compare_digest(digest.hex(), expected_digest)

    def _hash_token(self, token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()
