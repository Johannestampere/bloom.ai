from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=[".env", "../.env", "../../.env"])

    DATABASE_URL: str
    DIRECT_URL: str
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    SUPABASE_ANON_KEY: str
    SUPABASE_JWT_SECRET: str
    OPENAI_API_KEY: str
    REDIS_URL: str = "redis://localhost:6379"
    AI_RATE_LIMIT_PER_DAY: int = 5

settings = Settings()