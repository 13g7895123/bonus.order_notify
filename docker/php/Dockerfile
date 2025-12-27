FROM php:8.2-apache

# Install dependencies for CI4
RUN apt-get update && apt-get install -y \
    libicu-dev \
    libonig-dev \
    zip \
    unzip \
    git \
    && docker-php-ext-install intl mbstring pdo pdo_mysql mysqli

# Enable Apache rewrite module
RUN a2enmod rewrite

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Adjust permissions
RUN chown -R www-data:www-data /var/www/html
