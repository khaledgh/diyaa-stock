<?php

namespace App\Controllers;

use App\Models\Location;
use App\Utils\Response;
use App\Utils\Validator;

class LocationController {
    private $location;

    public function __construct() {
        $this->location = new Location();
    }

    public function index() {
        try {
            $locations = $this->location->findAll([], 'name ASC');
            Response::success($locations);
        } catch (\Exception $e) {
            Response::error($e->getMessage());
        }
    }

    public function show($id) {
        try {
            $location = $this->location->findById($id);
            if (!$location) {
                Response::notFound('Location not found');
                return;
            }
            Response::success($location);
        } catch (\Exception $e) {
            Response::error($e->getMessage());
        }
    }

    public function store() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            $errors = Validator::validate($data, [
                'name' => 'required|string|max:100',
                'address' => 'string|max:255',
                'phone' => 'string|max:20',
                'type' => 'required|in:warehouse,branch,van'
            ]);

            if (!empty($errors)) {
                Response::error('Validation failed', 400, $errors);
                return;
            }

            $id = $this->location->create($data);
            $location = $this->location->findById($id);
            Response::success($location, 'Location created successfully', 201);
        } catch (\Exception $e) {
            Response::error($e->getMessage());
        }
    }

    public function update($id) {
        try {
            $location = $this->location->findById($id);
            if (!$location) {
                Response::notFound('Location not found');
                return;
            }

            $data = json_decode(file_get_contents('php://input'), true);
            
            $errors = Validator::validate($data, [
                'name' => 'required|string|max:100',
                'address' => 'string|max:255',
                'phone' => 'string|max:20',
                'type' => 'required|in:warehouse,branch,van'
            ]);

            if (!empty($errors)) {
                Response::error('Validation failed', 400, $errors);
                return;
            }

            $this->location->update($id, $data);
            $location = $this->location->findById($id);
            Response::success($location, 'Location updated successfully');
        } catch (\Exception $e) {
            Response::error($e->getMessage());
        }
    }

    public function delete($id) {
        try {
            $location = $this->location->findById($id);
            if (!$location) {
                Response::notFound('Location not found');
                return;
            }

            $this->location->delete($id);
            Response::success(null, 'Location deleted successfully');
        } catch (\Exception $e) {
            Response::error($e->getMessage());
        }
    }
}
