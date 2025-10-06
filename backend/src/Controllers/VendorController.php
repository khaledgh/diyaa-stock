<?php

namespace App\Controllers;

use App\Models\Vendor;
use App\Utils\Response;
use App\Utils\Validator;

class VendorController {
    private $vendorModel;

    public function __construct() {
        $this->vendorModel = new Vendor();
    }

    public function index() {
        $vendors = $this->vendorModel->getVendorsWithStats();
        Response::success($vendors);
    }

    public function show($id) {
        $vendor = $this->vendorModel->findById($id);
        
        if (!$vendor) {
            Response::notFound('Vendor not found');
        }

        Response::success($vendor);
    }

    public function store() {
        $data = json_decode(file_get_contents('php://input'), true);

        $validator = new Validator($data);
        $validator->required(['name']);

        if ($validator->fails()) {
            Response::validationError($validator->errors());
        }

        $vendorData = [
            'name' => $data['name'],
            'company_name' => $data['company_name'] ?? null,
            'phone' => $data['phone'] ?? null,
            'email' => $data['email'] ?? null,
            'address' => $data['address'] ?? null,
            'tax_number' => $data['tax_number'] ?? null,
            'payment_terms' => $data['payment_terms'] ?? null,
            'credit_limit' => $data['credit_limit'] ?? 0,
            'is_active' => $data['is_active'] ?? 1
        ];

        $vendorId = $this->vendorModel->create($vendorData);
        $vendor = $this->vendorModel->findById($vendorId);

        Response::success($vendor, 'Vendor created successfully', 201);
    }

    public function update($id) {
        $vendor = $this->vendorModel->findById($id);
        
        if (!$vendor) {
            Response::notFound('Vendor not found');
        }

        $data = json_decode(file_get_contents('php://input'), true);

        $validator = new Validator($data);
        $validator->required(['name']);

        if ($validator->fails()) {
            Response::validationError($validator->errors());
        }

        $vendorData = [
            'name' => $data['name'],
            'company_name' => $data['company_name'] ?? null,
            'phone' => $data['phone'] ?? null,
            'email' => $data['email'] ?? null,
            'address' => $data['address'] ?? null,
            'tax_number' => $data['tax_number'] ?? null,
            'payment_terms' => $data['payment_terms'] ?? null,
            'credit_limit' => $data['credit_limit'] ?? 0,
            'is_active' => $data['is_active'] ?? 1
        ];

        $this->vendorModel->update($id, $vendorData);
        $updatedVendor = $this->vendorModel->findById($id);

        Response::success($updatedVendor, 'Vendor updated successfully');
    }

    public function delete($id) {
        $vendor = $this->vendorModel->findById($id);
        
        if (!$vendor) {
            Response::notFound('Vendor not found');
        }

        $this->vendorModel->delete($id);
        Response::success(null, 'Vendor deleted successfully');
    }
}
