<?php

require_once __DIR__ . '/vendor/autoload.php';

use App\Middleware\Cors;
use App\Middleware\Auth;
use App\Utils\Response;
use App\Controllers\AuthController;
use App\Controllers\ProductController;
use App\Controllers\CategoryController;
use App\Controllers\CustomerController;
use App\Controllers\VanController;
use App\Controllers\StockController;
use App\Controllers\TransferController;
use App\Controllers\InvoiceController;
use App\Controllers\PaymentController;
use App\Controllers\ReportController;
use App\Controllers\LocationController;
use App\Controllers\EmployeeController;
use App\Controllers\UserController;

// Handle CORS
Cors::handle();

// Get request method and URI
$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = str_replace('/diyaa-stock/new/backend', '', $uri);
$uri = trim($uri, '/');

// Parse route
$parts = explode('/', $uri);
$resource = $parts[1] ?? null;
$id = $parts[2] ?? null;
$action = $parts[3] ?? null;

// Public routes (no authentication required)
if ($resource === 'login' && $method === 'POST') {
    $controller = new AuthController();
    $controller->login();
    exit;
}

// Protected routes (authentication required)
try {
    $user = Auth::check();

    // Auth routes
    if ($resource === 'me' && $method === 'GET') {
        $controller = new AuthController();
        $controller->me($user);
    }

    // Product routes
    elseif ($resource === 'products') {
        $controller = new ProductController();
        
        if ($method === 'GET' && !$id) {
            $controller->index();
        } elseif ($method === 'GET' && $id) {
            $controller->show($id);
        } elseif ($method === 'POST') {
            $controller->store();
        } elseif ($method === 'PUT' && $id) {
            $controller->update($id);
        } elseif ($method === 'DELETE' && $id) {
            $controller->delete($id);
        } else {
            Response::notFound('Route not found');
        }
    }

    // Category routes
    elseif ($resource === 'categories') {
        $controller = new CategoryController();
        
        if ($method === 'GET') {
            $controller->index();
        } elseif ($method === 'POST') {
            $controller->store();
        } elseif ($method === 'PUT' && $id) {
            $controller->update($id);
        } elseif ($method === 'DELETE' && $id) {
            $controller->delete($id);
        } else {
            Response::notFound('Route not found');
        }
    }

    // Customer routes
    elseif ($resource === 'customers') {
        $controller = new CustomerController();
        
        if ($method === 'GET' && !$id) {
            $controller->index();
        } elseif ($method === 'GET' && $id) {
            $controller->show($id);
        } elseif ($method === 'POST') {
            $controller->store();
        } elseif ($method === 'PUT' && $id) {
            $controller->update($id);
        } elseif ($method === 'DELETE' && $id) {
            $controller->delete($id);
        } else {
            Response::notFound('Route not found');
        }
    }

    // Location routes
    elseif ($resource === 'locations') {
        $controller = new LocationController();
        
        if ($method === 'GET' && !$id) {
            $controller->index();
        } elseif ($method === 'GET' && $id) {
            $controller->show($id);
        } elseif ($method === 'POST') {
            $controller->store();
        } elseif ($method === 'PUT' && $id) {
            $controller->update($id);
        } elseif ($method === 'DELETE' && $id) {
            $controller->delete($id);
        } else {
            Response::notFound('Route not found');
        }
    }

    // Employee routes
    elseif ($resource === 'employees') {
        $controller = new EmployeeController();
        
        if ($method === 'GET' && !$id) {
            $controller->index();
        } elseif ($method === 'GET' && $id) {
            $controller->show($id);
        } elseif ($method === 'POST') {
            $controller->store();
        } elseif ($method === 'PUT' && $id) {
            $controller->update($id);
        } elseif ($method === 'DELETE' && $id) {
            $controller->delete($id);
        } else {
            Response::notFound('Route not found');
        }
    }

    // Van routes
    elseif ($resource === 'vans') {
        $controller = new VanController();
        
        if ($method === 'GET' && !$id) {
            $controller->index();
        } elseif ($method === 'GET' && $id && !$action) {
            $controller->show($id);
        } elseif ($method === 'GET' && $id && $action === 'stock') {
            $stockController = new StockController();
            $stockController->vanStock($id);
        } elseif ($method === 'POST') {
            $controller->store();
        } elseif ($method === 'PUT' && $id) {
            $controller->update($id);
        } elseif ($method === 'DELETE' && $id) {
            $controller->delete($id);
        } else {
            Response::notFound('Route not found');
        }
    }

    // Stock routes
    elseif ($resource === 'stock') {
        $controller = new StockController();
        
        if ($method === 'GET' && !$id) {
            $controller->warehouseStock();
        } elseif ($method === 'GET' && $id === 'movements') {
            $controller->movements();
        } else {
            Response::notFound('Route not found');
        }
    }

    // Transfer routes
    elseif ($resource === 'transfers') {
        $controller = new TransferController();
        
        if ($method === 'GET' && !$id) {
            $controller->index();
        } elseif ($method === 'GET' && $id) {
            $controller->show($id);
        } elseif ($method === 'POST') {
            $controller->store($user);
        } else {
            Response::notFound('Route not found');
        }
    }

    // Invoice routes
    elseif ($resource === 'invoices') {
        $controller = new InvoiceController();
        
        if ($method === 'GET' && $id === 'stats') {
            $controller->stats();
        } elseif ($method === 'GET' && !$id) {
            $controller->index();
        } elseif ($method === 'GET' && $id) {
            $controller->show($id);
        } elseif ($method === 'POST' && $id === 'purchase') {
            $controller->createPurchase($user);
        } elseif ($method === 'POST' && $id === 'sales') {
            $controller->createSales($user);
        } else {
            Response::notFound('Route not found');
        }
    }

    // Payment routes
    elseif ($resource === 'payments') {
        $controller = new PaymentController();
        
        if ($method === 'GET') {
            $controller->index();
        } elseif ($method === 'POST') {
            $controller->store($user);
        } else {
            Response::notFound('Route not found');
        }
    }

    // Report routes
    elseif ($resource === 'reports') {
        $controller = new ReportController();
        
        if ($method === 'GET' && $id === 'sales') {
            $controller->sales();
        } elseif ($method === 'GET' && $id === 'stock-movements') {
            $controller->stockMovements();
        } elseif ($method === 'GET' && $id === 'receivables') {
            $controller->receivables();
        } elseif ($method === 'GET' && $id === 'product-performance') {
            $controller->productPerformance();
        } elseif ($method === 'GET' && $id === 'dashboard') {
            $controller->dashboard();
        } else {
            Response::notFound('Route not found');
        }
    }

    // User routes
    elseif ($resource === 'users') {
        $controller = new UserController();
        
        if ($method === 'GET' && !$id) {
            $controller->index();
        } elseif ($method === 'GET' && $id) {
            $controller->show($id);
        } elseif ($method === 'POST') {
            $controller->store();
        } elseif ($method === 'PUT' && $id) {
            $controller->update($id);
        } elseif ($method === 'DELETE' && $id) {
            $controller->delete($id);
        } else {
            Response::notFound('Route not found');
        }
    }

    else {
        Response::notFound('Route not found');
    }

} catch (\Exception $e) {
    Response::error($e->getMessage(), 500);
}
