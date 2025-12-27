FROM php:8.2-fpm

# Install dependencies for CI4
RUN apt-get update && apt-get install -y \
    libicu-dev \
    libonig-dev \
    zip \
    unzip \
    git \
    && docker-php-ext-install intl mbstring pdo pdo_mysql mysqli

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Create startup script to handle permissions
RUN echo '#!/bin/bash\nchmod -R 777 /var/www/html/writable 2>/dev/null || true\nphp-fpm' > /usr/local/bin/start.sh && chmod +x /usr/local/bin/start.sh

CMD ["/usr/local/bin/start.sh"]
