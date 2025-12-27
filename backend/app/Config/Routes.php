<?php

namespace Config;

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */
$routes->get('/', 'Home::index');

$routes->group('api', ['namespace' => 'App\Controllers\Api'], function ($routes) {
    // Auth
    $routes->post('auth/login', 'Auth::login');
    $routes->post('auth/logout', 'Auth::logout');

    // Templates
    $routes->get('templates', 'Templates::index');
    $routes->post('templates', 'Templates::create');
    $routes->put('templates/(:num)', 'Templates::update/$1');
    $routes->delete('templates/(:num)', 'Templates::delete/$1');

    // Customers
    $routes->get('customers', 'Customers::index');
    $routes->post('customers', 'Customers::create'); // or update if id present
    $routes->delete('customers/(:num)', 'Customers::delete/$1');

    // Notifications
    $routes->post('notifications/send', 'Notifications::send');
    $routes->post('notifications/import-preview', 'Notifications::importPreview');

    // Settings
    $routes->get('settings', 'Settings::index');
    $routes->post('settings', 'Settings::update');

    // Messages
    $routes->get('messages', 'Messages::index');
    $routes->get('messages/history/(:num)', 'Messages::history/$1'); // customer_id

    // LINE Webhook & Users
    $routes->post('line/webhook', 'LineWebhook::receive');
    $routes->get('line/users', 'LineWebhook::listUsers');
    $routes->get('line/webhook-logs', 'LineWebhook::debugLogs');

    // Dashboard Stats
    $routes->get('stats', 'Stats::index');
});
