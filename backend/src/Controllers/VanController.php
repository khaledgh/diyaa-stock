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
        $data = json_decode(file_get_contents('php://input'), true);

        $validator = new Validator($data);
        $validator->required(['name']);

        if ($validator->fails()) {
            Response::validationError($validator->errors());
        }

        $vanData = [
            'name' => $data['name'],
            'plate_number' => $data['plate_number'] ?? null,
            'owner_type' => $data['owner_type'] ?? 'company',
            'sales_rep_id' => $data['sales_rep_id'] ?? null,
            'is_active' => $data['is_active'] ?? 1
        ];

        $vanId = $this->vanModel->create($vanData);
        $van = $this->vanModel->findById($vanId);

        Response::success($van, 'Van created successfully', 201);
    }

    public function update($id) {
        $van = $this->vanModel->findById($id);
        
        if (!$van) {
            Response::notFound('Van not found');
        }

        $data = json_decode(file_get_contents('php://input'), true);

        $validator = new Validator($data);
        $validator->required(['name']);

        if ($validator->fails()) {
            Response::validationError($validator->errors());
        }

        $vanData = [
            'name' => $data['name'],
            'plate_number' => $data['plate_number'] ?? null,
            'owner_type' => $data['owner_type'] ?? 'company',
            'sales_rep_id' => $data['sales_rep_id'] ?? null,
            'is_active' => $data['is_active'] ?? 1
        ];

        $this->vanModel->update($id, $vanData);
        $updatedVan = $this->vanModel->findById($id);

        Response::success($updatedVan, 'Van updated successfully');
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
