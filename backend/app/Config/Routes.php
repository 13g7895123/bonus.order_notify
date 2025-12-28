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

    // User Management (Admin)
    $routes->get('users', 'Users::index');
    $routes->get('users/me', 'Users::me');
    $routes->put('users/me', 'Users::updateProfile');
    $routes->post('users', 'Users::create');
    $routes->put('users/(:num)', 'Users::update/$1');
    $routes->delete('users/(:num)', 'Users::delete/$1');
    $routes->post('users/(:num)/regenerate-webhook', 'Users::regenerateWebhook/$1');

    // Activity Logs (Admin)
    $routes->get('activity-logs', 'ActivityLogs::index');
    $routes->get('activity-logs/stats', 'ActivityLogs::stats');
    $routes->delete('activity-logs', 'ActivityLogs::clear');

    // User Applications
    $routes->post('applications/apply', 'UserApplications::apply'); // Public - no auth (with invite code)
    $routes->post('applications/invite', 'UserApplications::inviteUsers'); // Logged-in users
    $routes->get('applications', 'UserApplications::index'); // Admin only
    $routes->get('applications/pending-count', 'UserApplications::pendingCount'); // Admin only
    $routes->post('applications/(:num)/approve', 'UserApplications::approve/$1'); // Admin only
    $routes->post('applications/(:num)/reject', 'UserApplications::reject/$1'); // Admin only
    $routes->get('applications/invite-code', 'UserApplications::getInviteCode'); // Admin only
    $routes->put('applications/invite-code', 'UserApplications::updateInviteCode'); // Admin only
});
