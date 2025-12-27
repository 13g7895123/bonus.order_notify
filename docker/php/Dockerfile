FROM php:8.2-fpm

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libicu-dev \
    libonig-dev \
    libcurl4-openssl-dev \
    libzip-dev \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    zip \
    unzip \
    git \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install intl mbstring pdo pdo_mysql mysqli curl zip gd \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Composer globally
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Create entrypoint script
RUN echo '#!/bin/bash\n\
    set -e\n\
    cd /var/www/html\n\
    \n\
    # Install composer dependencies if vendor does not exist\n\
    if [ ! -d "vendor" ] || [ ! -f "vendor/autoload.php" ]; then\n\
    echo "Installing composer dependencies..."\n\
    composer install --no-dev --optimize-autoloader --no-interaction\n\
    fi\n\
    \n\
    # Set permissions\n\
    chmod -R 777 /var/www/html/writable 2>/dev/null || true\n\
    \n\
    # Start PHP-FPM\n\
    exec php-fpm\n\
    ' > /usr/local/bin/docker-entrypoint.sh && chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 9000

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
