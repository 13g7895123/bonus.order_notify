<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

class Cors implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $response = service('response');

        // Get origin from request
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        // List of allowed origins (add your frontend URLs here)
        $allowedOrigins = [
            'http://localhost:8080',
            'http://localhost:3000',
            'http://127.0.0.1:8080',
            'http://127.0.0.1:3000',
        ];

        // In production, add your domain
        if (ENVIRONMENT === 'production') {
            // Add production domains here
            // $allowedOrigins[] = 'https://yourdomain.com';
        }

        // Check if origin is allowed
        if (in_array($origin, $allowedOrigins) || ENVIRONMENT !== 'production') {
            $response->setHeader('Access-Control-Allow-Origin', $origin ?: '*');
            $response->setHeader('Access-Control-Allow-Credentials', 'true');
        }

        $response->setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        $response->setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');

        $method = $_SERVER['REQUEST_METHOD'];
        if ($method == "OPTIONS") {
            $response->setStatusCode(200);
            $response->send();
            exit();
        }
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        // Add CORS headers to response as well
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        $allowedOrigins = [
            'http://localhost:8080',
            'http://localhost:3000',
            'http://127.0.0.1:8080',
            'http://127.0.0.1:3000',
        ];

        if (in_array($origin, $allowedOrigins) || ENVIRONMENT !== 'production') {
            $response->setHeader('Access-Control-Allow-Origin', $origin ?: '*');
            $response->setHeader('Access-Control-Allow-Credentials', 'true');
        }
    }
}
