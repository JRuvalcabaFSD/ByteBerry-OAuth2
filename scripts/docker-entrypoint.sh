#!/bin/sh
set -e

echo "🚀 ByteBerry OAuth2 Service Starting..."
echo "📦 Version: ${APP_VERSION:-unknown}"
echo "🌍 Environment: ${NODE_ENV:-development}"
echo "─────────────────────────────────────────"

# ============================================
# STEP 1: Wait for Database
# ============================================
wait_for_db() {
    echo "⏳ Waiting for database connection..."

    # Extraer host y puerto de DATABASE_URL
    # Formato: postgresql://user:pass@host:port/db
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

    # Default values
    DB_HOST=${DB_HOST:-localhost}
    DB_PORT=${DB_PORT:-5432}

    MAX_RETRIES=30
    RETRY_COUNT=0

    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; then
            echo "✅ Database is ready! ($DB_HOST:$DB_PORT)"
            return 0
        fi

        RETRY_COUNT=$((RETRY_COUNT + 1))
        echo "   Attempt $RETRY_COUNT/$MAX_RETRIES - waiting for $DB_HOST:$DB_PORT..."
        sleep 2
    done

    echo "❌ Database connection timeout after $MAX_RETRIES attempts"
    exit 1
}

# ============================================
# STEP 2: Run Database Migrations
# ============================================
run_migrations() {
    echo "📦 Running database migrations..."

    # Verificar que prisma está instalado
    if [ ! -f "./node_modules/.bin/prisma" ]; then
        echo "❌ ERROR: prisma not found in node_modules"
        echo "Make sure prisma is in dependencies (not devDependencies)"
        exit 1
    fi

    # prisma migrate deploy es idempotente
    # Solo aplica migraciones que no estén en _prisma_migrations
    ./node_modules/.bin/prisma migrate deploy

    if [ $? -eq 0 ]; then
        echo "✅ Migrations completed successfully"
    else
        echo "❌ Migration failed"
        exit 1
    fi
}

# ============================================
# STEP 3: Run Seed (Manual in development)
# ============================================
run_seed() {
    # Seed solo se ejecuta manualmente en desarrollo local
    # En Docker no tenemos tsx instalado (devDependency)
    # Para seedear en Docker dev: docker exec <container> pnpm db db seed
    echo "⏭️  Seed skipped (run manually with: pnpm db db seed)"
}

# ============================================
# STEP 4: JWT Key Management
# ============================================
echo "🔐 ByteBerry OAuth2 - JWT Key Management"

setup_jwt_keys() {
    if [ "$NODE_ENV" = "production" ]; then
        echo "📦 Production mode - validating JWT keys..."

        # Verificar que las claves existan
        if [ ! -f "/app/keys/private.pem" ] || [ ! -f "/app/keys/public.pem" ]; then
            echo "❌ ERROR: JWT keys not found in /app/keys/"
            echo "Please mount keys volume: -v /path/to/keys:/app/keys:ro"
            exit 1
        fi

        # Verificar permisos
        if [ "$(stat -c '%a' /app/keys/private.pem 2>/dev/null || stat -f '%Lp' /app/keys/private.pem 2>/dev/null)" != "600" ]; then
            echo "⚠️  WARNING: private.pem should have 600 permissions"
        fi

        echo "✅ JWT keys validated successfully"

        # Cargar claves desde archivos a variables de entorno (si no están definidas)
        if [ -z "$JWT_PRIVATE_KEY" ]; then
            export JWT_PRIVATE_KEY=$(cat /app/keys/private.pem | tr '\n' '|' | sed 's/|/\\n/g')
        fi

        if [ -z "$JWT_PUBLIC_KEY" ]; then
            export JWT_PUBLIC_KEY=$(cat /app/keys/public.pem | tr '\n' '|' | sed 's/|/\\n/g')
        fi

    else
        echo "🛠️  Development mode - setting up JWT keys..."

        # Auto-generar claves si no existen
        if [ ! -f "/app/keys/private.pem" ]; then
            echo "🔧 Generating JWT keys automatically..."

            # Generar con openssl directamente (más rápido que node script)
            openssl genpkey -algorithm RSA -out /app/keys/private.pem -pkeyopt rsa_keygen_bits:2048 2>/dev/null
            openssl rsa -pubout -in /app/keys/private.pem -out /app/keys/public.pem 2>/dev/null

            echo "✅ Keys generated in /app/keys/"
        else
            echo "✅ Using existing keys from /app/keys/"
        fi

        # Cargar desde archivos
        export JWT_PRIVATE_KEY=$(cat /app/keys/private.pem | tr '\n' '|' | sed 's/|/\\n/g')
        export JWT_PUBLIC_KEY=$(cat /app/keys/public.pem | tr '\n' '|' | sed 's/|/\\n/g')
    fi
}

# ============================================
# MAIN EXECUTION
# ============================================

if [ "$NODE_ENV" = "test" ]; then
		echo "🧪 Test mode detected - skipping database checks and migrations"
    setup_jwt_keys
else

		# Step 1: Wait for database
		wait_for_db

		# Step 2: Run migrations (idempotent)
		run_migrations

		# Step 3: Run seed (dev only, idempotent)
		run_seed

		# Step 4: Setup JWT keys
		setup_jwt_keys

fi


# ============================================
# STEP 5: Start Application
# ============================================
echo ""
echo "─────────────────────────────────────────"
echo "🎉 Starting OAuth2 Service..."
echo "   Port: ${PORT:-4000}"
echo "   Key ID: ${JWT_KEY_ID:-default-key-1}"
echo "─────────────────────────────────────────"

# Ejecutar la aplicación (CMD del Dockerfile)
exec "$@"
