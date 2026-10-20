#!/usr/bin/env sh
set -e

# Apply pending migrations, then serve the API.
alembic upgrade head

# The application logs the requests itself (without the query string), so uvicorn's
# own access log is disabled to keep phone numbers out of the logs.
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --no-access-log
