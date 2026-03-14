from supabase import acreate_client, AsyncClient
from app.core.config import settings


async def get_client() -> AsyncClient:
    """
    Returns an async Supabase client using the configured URL and key.
    """
    return await acreate_client(
        supabase_url=str(settings.SUPABASE_URL),
        supabase_key=str(settings.SUPABASE_KEY)
    )


async def database_healthcheck() -> None:
    """
    Validate Supabase connectivity with a lightweight query.

    Raises:
        RuntimeError: If the Supabase connection fails.
    """
    try:
        client = await get_client()
        await client.table("testcase").select("jira_project_name").limit(1).execute()
    except Exception as e:
        raise RuntimeError(f"Supabase healthcheck failed: {e}")
