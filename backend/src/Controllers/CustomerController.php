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
        $search = $_GET['search'] ?? null;
        
        if ($search) {
            $sql = "SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ? OR email LIKE ? ORDER BY name ASC";
            $customers = $this->customerModel->query($sql, ["%$search%", "%$search%", "%$search%"]);
        } else {
            $customers = $this->customerModel->findAll(['is_active' => 1], 'name ASC');
        }

        Response::success($customers);
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
