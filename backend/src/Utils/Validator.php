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

    public static function validate($data, $rules) {
        $errors = [];

        foreach ($rules as $field => $ruleString) {
            $fieldRules = explode('|', $ruleString);

            // Handle array field validation (e.g., items.*.product_id)
            if (strpos($field, '.*.') !== false) {
                $errors = array_merge($errors, self::validateArrayField($data, $field, $fieldRules));
                continue;
            }

            foreach ($fieldRules as $rule) {
                $ruleParts = explode(':', $rule);
                $ruleName = $ruleParts[0];
                $ruleValue = $ruleParts[1] ?? null;

                $fieldValue = isset($data[$field]) ? $data[$field] : null;

                // Required rule
                if ($ruleName === 'required') {
                    if ($fieldValue === null || (is_string($fieldValue) && trim($fieldValue) === '') || (is_array($fieldValue) && empty($fieldValue))) {
                        $errors[$field] = ucfirst($field) . ' is required';
                        break;
                    }
                }

                // Skip other validations if field is empty and not required
                if ($fieldValue === null || (is_string($fieldValue) && trim($fieldValue) === '') || (is_array($fieldValue) && empty($fieldValue))) {
                    continue;
                }

                // Array rule
                if ($ruleName === 'array' && !is_array($fieldValue)) {
                    $errors[$field] = ucfirst($field) . ' must be an array';
                    break;
                }

                // String rule
                if ($ruleName === 'string' && !is_string($fieldValue)) {
                    $errors[$field] = ucfirst($field) . ' must be a string';
                }

                // Numeric rule
                if ($ruleName === 'numeric' && !is_numeric($fieldValue)) {
                    $errors[$field] = ucfirst($field) . ' must be numeric';
                }

                // Email rule
                if ($ruleName === 'email' && !filter_var($fieldValue, FILTER_VALIDATE_EMAIL)) {
                    $errors[$field] = 'Invalid email format';
                }

                // Max length rule
                if ($ruleName === 'max' && strlen($fieldValue) > $ruleValue) {
                    $errors[$field] = ucfirst($field) . " must not exceed $ruleValue characters";
                }

                // Min length rule
                if ($ruleName === 'min' && strlen($fieldValue) < $ruleValue) {
                    $errors[$field] = ucfirst($field) . " must be at least $ruleValue characters";
                }

                // In rule (enum)
                if ($ruleName === 'in') {
                    $allowedValues = explode(',', $ruleValue);
                    if (!in_array($fieldValue, $allowedValues)) {
                        $errors[$field] = ucfirst($field) . ' must be one of: ' . implode(', ', $allowedValues);
                    }
                }
            }
        }

        return $errors;
    }

    private static function validateArrayField($data, $field, $fieldRules) {
        $errors = [];
        $fieldParts = explode('.*.', $field);
        $arrayField = $fieldParts[0];
        $itemField = $fieldParts[1];

        if (!isset($data[$arrayField]) || !is_array($data[$arrayField])) {
            return $errors;
        }

        foreach ($data[$arrayField] as $index => $item) {
            if (!isset($item[$itemField])) {
                continue;
            }

            $fieldValue = $item[$itemField];

            foreach ($fieldRules as $rule) {
                $ruleParts = explode(':', $rule);
                $ruleName = $ruleParts[0];
                $ruleValue = $ruleParts[1] ?? null;

                // Required rule
                if ($ruleName === 'required') {
                    if ($fieldValue === null || (is_string($fieldValue) && trim($fieldValue) === '') || (is_array($fieldValue) && empty($fieldValue))) {
                        $errors["{$arrayField}.{$index}.{$itemField}"] = ucfirst($itemField) . ' is required';
                        break;
                    }
                }

                // Skip other validations if field is empty and not required
                if ($fieldValue === null || (is_string($fieldValue) && trim($fieldValue) === '') || (is_array($fieldValue) && empty($fieldValue))) {
                    continue;
                }

                // Numeric rule
                if ($ruleName === 'numeric' && !is_numeric($fieldValue)) {
                    $errors["{$arrayField}.{$index}.{$itemField}"] = ucfirst($itemField) . ' must be numeric';
                }

                // Min rule for numbers
                if ($ruleName === 'min' && $fieldValue < $ruleValue) {
                    $errors["{$arrayField}.{$index}.{$itemField}"] = ucfirst($itemField) . " must be at least {$ruleValue}";
                }
            }
        }

        return $errors;
    }
}
