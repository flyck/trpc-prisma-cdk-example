# Use the official PostgreSQL image from Docker Hub
FROM postgres:latest

# Optionally, set environment variables (e.g., if you want to configure the database)
ENV POSTGRES_USER myuser
ENV POSTGRES_PASSWORD mypassword
ENV POSTGRES_DB mydatabase

# Optionally, you can add any custom initialization scripts or SQL files
# COPY init.sql /docker-entrypoint-initdb.d/
# (Uncomment the line above if you have a file named "init.sql" in the same directory as the Dockerfile)

# Expose the default PostgreSQL port (5432) for connections
EXPOSE 5432