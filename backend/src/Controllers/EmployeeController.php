<?php

namespace App\Controllers;

use App\Models\Employee;
use App\Utils\Response;
use App\Utils\Validator;

class EmployeeController {
    private $employee;

    public function __construct() {
        $this->employee = new Employee();
    }

    public function index() {
        try {
            $employees = $this->employee->findAllWithVans();
            Response::success($employees);
        } catch (\Exception $e) {
            Response::error($e->getMessage());
        }
    }

    public function show($id) {
        try {
            $employee = $this->employee->findWithVan($id);
            if (!$employee) {
                Response::notFound('Employee not found');
                return;
            }
            Response::success($employee);
        } catch (\Exception $e) {
            Response::error($e->getMessage());
        }
    }

    public function store() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            $errors = Validator::validate($data, [
                'name' => 'required|string|max:100',
                'email' => 'email|max:100',
                'phone' => 'required|string|max:20',
                'position' => 'required|string|max:50',
                'hire_date' => 'required',
                'salary' => 'numeric'
            ]);

            if (!empty($errors)) {
                Response::error('Validation failed', 400, $errors);
                return;
            }

            $id = $this->employee->create($data);
            $employee = $this->employee->findById($id);
            Response::success($employee, 'Employee created successfully', 201);
        } catch (\Exception $e) {
            Response::error($e->getMessage());
        }
    }

    public function update($id) {
        try {
            $employee = $this->employee->findById($id);
            if (!$employee) {
                Response::notFound('Employee not found');
                return;
            }

            $data = json_decode(file_get_contents('php://input'), true);
            
            $errors = Validator::validate($data, [
                'name' => 'required|string|max:100',
                'email' => 'email|max:100',
                'phone' => 'required|string|max:20',
                'position' => 'required|string|max:50',
                'hire_date' => 'required',
                'salary' => 'numeric'
            ]);

            if (!empty($errors)) {
                Response::error('Validation failed', 400, $errors);
                return;
            }

            $this->employee->update($id, $data);
            $employee = $this->employee->findById($id);
            Response::success($employee, 'Employee updated successfully');
        } catch (\Exception $e) {
            Response::error($e->getMessage());
        }
    }

    public function delete($id) {
        try {
            $employee = $this->employee->findById($id);
            if (!$employee) {
                Response::notFound('Employee not found');
                return;
            }

            $this->employee->delete($id);
            Response::success(null, 'Employee deleted successfully');
        } catch (\Exception $e) {
            Response::error($e->getMessage());
        }
    }
}
