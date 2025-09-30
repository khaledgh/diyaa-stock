<?php

namespace App\Controllers;

use App\Models\Category;
use App\Utils\Response;
use App\Utils\Validator;

class CategoryController {
    private $categoryModel;

    public function __construct() {
        $this->categoryModel = new Category();
    }

    public function index() {
        $categories = $this->categoryModel->findAll(['is_active' => 1], 'name_en ASC');
        Response::success($categories);
    }

    public function store() {
        $data = json_decode(file_get_contents('php://input'), true);

        $validator = new Validator($data);
        $validator->required(['name_en']);

        if ($validator->fails()) {
            Response::validationError($validator->errors());
        }

        $categoryData = [
            'name_en' => $data['name_en'],
            'name_ar' => $data['name_ar'] ?? null,
            'description' => $data['description'] ?? null,
            'is_active' => $data['is_active'] ?? 1
        ];

        $categoryId = $this->categoryModel->create($categoryData);
        $category = $this->categoryModel->findById($categoryId);

        Response::success($category, 'Category created successfully', 201);
    }

    public function update($id) {
        $category = $this->categoryModel->findById($id);
        
        if (!$category) {
            Response::notFound('Category not found');
        }

        $data = json_decode(file_get_contents('php://input'), true);

        $validator = new Validator($data);
        $validator->required(['name_en']);

        if ($validator->fails()) {
            Response::validationError($validator->errors());
        }

        $categoryData = [
            'name_en' => $data['name_en'],
            'name_ar' => $data['name_ar'] ?? null,
            'description' => $data['description'] ?? null,
            'is_active' => $data['is_active'] ?? 1
        ];

        $this->categoryModel->update($id, $categoryData);
        $updatedCategory = $this->categoryModel->findById($id);

        Response::success($updatedCategory, 'Category updated successfully');
    }

    public function delete($id) {
        $category = $this->categoryModel->findById($id);
        
        if (!$category) {
            Response::notFound('Category not found');
        }

        $this->categoryModel->delete($id);
        Response::success(null, 'Category deleted successfully');
    }
}
