<?php

namespace App\Controllers;

use App\Models\Customer;
use App\Utils\Response;
use App\Utils\Validator;

class CustomerController {
    private $customerModel;

    public function __construct() {
        $this->customerModel = new Customer();
    }

    public function index() {
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $perPage = isset($_GET['per_page']) ? (int)$_GET['per_page'] : 20;
        $offset = ($page - 1) * $perPage;
        $search = $_GET['search'] ?? null;
        
        // Build query with positional parameters
        $sql = "SELECT * FROM customers WHERE 1=1";
        $params = [];
        
        if ($search) {
            $sql .= " AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)";
            $searchParam = "%$search%";
            $params[] = $searchParam;
            $params[] = $searchParam;
            $params[] = $searchParam;
        }
        
        $sql .= " ORDER BY name ASC";
        
        // Get total count
        $countSql = "SELECT COUNT(*) as count FROM customers WHERE 1=1";
        $countParams = [];
        if ($search) {
            $countSql .= " AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)";
            $searchParam = "%$search%";
            $countParams[] = $searchParam;
            $countParams[] = $searchParam;
            $countParams[] = $searchParam;
        }
        $stmt = $this->customerModel->getDb()->prepare($countSql);
        $stmt->execute($countParams);
        $total = $stmt->fetch()['count'];
        
        // Get paginated results
        $sql .= " LIMIT ? OFFSET ?";
        $params[] = $perPage;
        $params[] = $offset;
        
        $stmt = $this->customerModel->getDb()->prepare($sql);
        $stmt->execute($params);
        $customers = $stmt->fetchAll();

        Response::success([
            'data' => $customers,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => ceil($total / $perPage),
                'from' => $offset + 1,
                'to' => min($offset + $perPage, $total)
            ]
        ]);
    }

    public function show($id) {
        $customer = $this->customerModel->findById($id);
        
        if (!$customer) {
            Response::notFound('Customer not found');
        }

        Response::success($customer);
    }

    public function store() {
        $data = json_decode(file_get_contents('php://input'), true);

        $validator = new Validator($data);
        $validator->required(['name']);

        if ($validator->fails()) {
            Response::validationError($validator->errors());
        }

        $customerData = [
            'name' => $data['name'],
            'phone' => $data['phone'] ?? null,
            'email' => $data['email'] ?? null,
            'address' => $data['address'] ?? null,
            'tax_number' => $data['tax_number'] ?? null,
            'credit_limit' => $data['credit_limit'] ?? 0,
            'is_active' => $data['is_active'] ?? 1
        ];

        $customerId = $this->customerModel->create($customerData);
        $customer = $this->customerModel->findById($customerId);

        Response::success($customer, 'Customer created successfully', 201);
    }

    public function update($id) {
        $customer = $this->customerModel->findById($id);
        
        if (!$customer) {
            Response::notFound('Customer not found');
        }

        $data = json_decode(file_get_contents('php://input'), true);

        $validator = new Validator($data);
        $validator->required(['name']);

        if ($validator->fails()) {
            Response::validationError($validator->errors());
        }

        $customerData = [
            'name' => $data['name'],
            'phone' => $data['phone'] ?? null,
            'email' => $data['email'] ?? null,
            'address' => $data['address'] ?? null,
            'tax_number' => $data['tax_number'] ?? null,
            'credit_limit' => $data['credit_limit'] ?? 0,
            'is_active' => $data['is_active'] ?? 1
        ];

        $this->customerModel->update($id, $customerData);
        $updatedCustomer = $this->customerModel->findById($id);

        Response::success($updatedCustomer, 'Customer updated successfully');
    }

    public function delete($id) {
        $customer = $this->customerModel->findById($id);
        
        if (!$customer) {
            Response::notFound('Customer not found');
        }

        $this->customerModel->delete($id);
        Response::success(null, 'Customer deleted successfully');
    }
}
