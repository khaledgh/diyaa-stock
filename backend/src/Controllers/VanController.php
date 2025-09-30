<?php

namespace App\Controllers;

use App\Models\Van;
use App\Utils\Response;
use App\Utils\Validator;

class VanController {
    private $vanModel;

    public function __construct() {
        $this->vanModel = new Van();
    }

    public function index() {
        $vans = $this->vanModel->getVansWithSalesRep();
        Response::success($vans);
    }

    public function show($id) {
        $van = $this->vanModel->findById($id);
        
        if (!$van) {
            Response::notFound('Van not found');
        }

        Response::success($van);
    }

    public function store() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);

            $errors = Validator::validate($data, [
                'name' => 'required|string|max:100',
                'plate_number' => 'string|max:50',
                'owner_type' => 'required|in:company,rental',
                'employee_id' => 'numeric'
            ]);

            if (!empty($errors)) {
                Response::error('Validation failed', 400, $errors);
                return;
            }

            $vanData = [
                'name' => $data['name'],
                'plate_number' => $data['plate_number'] ?? null,
                'owner_type' => $data['owner_type'],
                'employee_id' => $data['employee_id'] ?? null,
                'is_active' => $data['is_active'] ?? 1
            ];

            $vanId = $this->vanModel->create($vanData);
            $van = $this->vanModel->findById($vanId);

            Response::success($van, 'Van created successfully', 201);
        } catch (\Exception $e) {
            Response::error($e->getMessage());
        }
    }

    public function update($id) {
        try {
            $van = $this->vanModel->findById($id);

            if (!$van) {
                Response::notFound('Van not found');
                return;
            }

            $data = json_decode(file_get_contents('php://input'), true);

            $errors = Validator::validate($data, [
                'name' => 'required|string|max:100',
                'plate_number' => 'string|max:50',
                'owner_type' => 'required|in:company,rental',
                'employee_id' => 'numeric'
            ]);

            if (!empty($errors)) {
                Response::error('Validation failed', 400, $errors);
                return;
            }

            $vanData = [
                'name' => $data['name'],
                'plate_number' => $data['plate_number'] ?? null,
                'owner_type' => $data['owner_type'],
                'employee_id' => $data['employee_id'] ?? null,
                'is_active' => $data['is_active'] ?? 1
            ];

            $this->vanModel->update($id, $vanData);
            $updatedVan = $this->vanModel->findById($id);

            Response::success($updatedVan, 'Van updated successfully');
        } catch (\Exception $e) {
            Response::error($e->getMessage());
        }
    }

    public function delete($id) {
        $van = $this->vanModel->findById($id);
        
        if (!$van) {
            Response::notFound('Van not found');
        }

        $this->vanModel->delete($id);
        Response::success(null, 'Van deleted successfully');
    }
}
