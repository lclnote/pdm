import asyncio
import uuid

from sqlalchemy import select

from app.core.database import async_session, engine, Base
from app.core.security import get_password_hash
from app.models.user import User


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        admin_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
        result = await session.execute(select(User).where(User.id == admin_id))
        existing = result.scalar_one_or_none()
        if not existing:
            admin = User(
                id=admin_id,
                name="Admin",
                email="admin@pdm.local",
                password_hash=get_password_hash("admin123"),
                role="system_admin",
            )
            session.add(admin)
            await session.commit()
            print("Admin user created: admin@pdm.local / admin123")
        else:
            print("Admin user already exists")

        test_users = [
            User(id=uuid.UUID("00000000-0000-0000-0000-000000000002"), name="Taro Yamada",  email="taro@pdm.local",  password_hash=get_password_hash("test123"), role="project_manager"),
            User(id=uuid.UUID("00000000-0000-0000-0000-000000000003"), name="Hanako Sato",  email="hanako@pdm.local", password_hash=get_password_hash("test123"), role="developer"),
            User(id=uuid.UUID("00000000-0000-0000-0000-000000000004"), name="Ichiro Suzuki", email="ichiro@pdm.local", password_hash=get_password_hash("test123"), role="developer"),
            User(id=uuid.UUID("00000000-0000-0000-0000-000000000005"), name="Yuki Tanaka",  email="yuki@pdm.local",   password_hash=get_password_hash("test123"), role="viewer"),
        ]
        for u in test_users:
            existing = await session.execute(select(User).where(User.id == u.id))
            if not existing.scalar_one_or_none():
                session.add(u)
        await session.commit()
        print("Test users created")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
