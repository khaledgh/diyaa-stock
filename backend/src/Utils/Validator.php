<?php

namespace App\Utils;

class Validator {
    private $data;
    private $errors = [];

    public function __construct($data) {
        $this->data = $data;
    }

    public function required($fields) {
        foreach ($fields as $field) {
            if (!isset($this->data[$field]) || trim($this->data[$field]) === '') {
                $this->errors[$field] = ucfirst($field) . ' is required';
            }
        }
        return $this;
    }

    public function email($field) {
        if (isset($this->data[$field]) && !filter_var($this->data[$field], FILTER_VALIDATE_EMAIL)) {
            $this->errors[$field] = 'Invalid email format';
        }
        return $this;
    }

    public function min($field, $min) {
        if (isset($this->data[$field]) && strlen($this->data[$field]) < $min) {
            $this->errors[$field] = ucfirst($field) . " must be at least $min characters";
        }
        return $this;
    }

    public function numeric($field) {
        if (isset($this->data[$field]) && !is_numeric($this->data[$field])) {
            $this->errors[$field] = ucfirst($field) . ' must be numeric';
        }
        return $this;
    }

    public function positive($field) {
        if (isset($this->data[$field]) && $this->data[$field] < 0) {
            $this->errors[$field] = ucfirst($field) . ' must be positive';
        }
        return $this;
    }

    public function fails() {
        return !empty($this->errors);
    }

    public function errors() {
        return $this->errors;
    }

    public static function sanitize($data) {
        if (is_array($data)) {
            return array_map([self::class, 'sanitize'], $data);
        }
        return htmlspecialchars(strip_tags(trim($data)), ENT_QUOTES, 'UTF-8');
    }
}
