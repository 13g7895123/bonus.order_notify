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

        // Allow the requesting origin if it exists, otherwise use a default
        // Note: When using credentials, cannot use '*'
        if ($origin) {
            $response->setHeader('Access-Control-Allow-Origin', $origin);
            $response->setHeader('Access-Control-Allow-Credentials', 'true');
        } else {
            // For requests without origin (e.g., same-origin or direct API calls)
            $response->setHeader('Access-Control-Allow-Origin', '*');
        }

        $response->setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
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

        if ($origin) {
            $response->setHeader('Access-Control-Allow-Origin', $origin);
            $response->setHeader('Access-Control-Allow-Credentials', 'true');
        }
    }
}
