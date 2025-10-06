<?php

namespace App\Controllers;

use App\Models\ProductType;
use App\Utils\Response;
use App\Utils\Validator;

class ProductTypeController {
    private $productTypeModel;

    public function __construct() {
        $this->productTypeModel = new ProductType();
    }

    public function index() {
        $productTypes = $this->productTypeModel->findAll(['is_active' => 1], 'name_en ASC');
        Response::success($productTypes);
    }

    public function store() {
        $data = json_decode(file_get_contents('php://input'), true);

        $validator = new Validator($data);
        $validator->required(['name_en']);

        if ($validator->fails()) {
            Response::validationError($validator->errors());
        }

        $productTypeData = [
            'name_en' => $data['name_en'],
            'name_ar' => $data['name_ar'] ?? null,
            'description' => $data['description'] ?? null,
            'is_active' => $data['is_active'] ?? 1
        ];

        $productTypeId = $this->productTypeModel->create($productTypeData);
        $productType = $this->productTypeModel->findById($productTypeId);

        Response::success($productType, 'Product type created successfully', 201);
    }

    public function update($id) {
        $productType = $this->productTypeModel->findById($id);
        
        if (!$productType) {
            Response::notFound('Product type not found');
        }

        $data = json_decode(file_get_contents('php://input'), true);

        $validator = new Validator($data);
        $validator->required(['name_en']);

        if ($validator->fails()) {
            Response::validationError($validator->errors());
        }

        $productTypeData = [
            'name_en' => $data['name_en'],
            'name_ar' => $data['name_ar'] ?? null,
            'description' => $data['description'] ?? null,
            'is_active' => $data['is_active'] ?? 1
        ];

        $this->productTypeModel->update($id, $productTypeData);
        $updatedProductType = $this->productTypeModel->findById($id);

        Response::success($updatedProductType, 'Product type updated successfully');
    }

    public function delete($id) {
        $productType = $this->productTypeModel->findById($id);
        
        if (!$productType) {
            Response::notFound('Product type not found');
        }

        $this->productTypeModel->delete($id);
        Response::success(null, 'Product type deleted successfully');
    }
}
