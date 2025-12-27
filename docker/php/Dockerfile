FROM php:8.2-fpm

# Install dependencies for CI4
RUN apt-get update && apt-get install -y \
    libicu-dev \
    libonig-dev \
    libcurl4-openssl-dev \
    zip \
    unzip \
    git \
    && docker-php-ext-install intl mbstring pdo pdo_mysql mysqli curl \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Create startup script to handle permissions and composer install
RUN echo '#!/bin/bash\n\
    set -e\n\
    cd /var/www/html\n\
    if [ ! -d "vendor" ]; then\n\
    echo "Installing composer dependencies..."\n\
    composer install --no-dev --optimize-autoloader --no-interaction\n\
    fi\n\
    chmod -R 777 /var/www/html/writable 2>/dev/null || true\n\
    php-fpm -F' > /usr/local/bin/start.sh && chmod +x /usr/local/bin/start.sh

CMD ["/usr/local/bin/start.sh"]
