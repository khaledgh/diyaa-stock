package services

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
)

type AIChatService struct {
	productService  *ProductServices
	vendorService   *VendorService
	locationService *LocationService
	customerService *CustomerService
}

func NewAIChatService(ps *ProductServices, vs *VendorService, ls *LocationService, cs *CustomerService) *AIChatService {
	return &AIChatService{
		productService:  ps,
		vendorService:   vs,
		locationService: ls,
		customerService: cs,
	}
}

func (s *AIChatService) ProcessInvoice(message string, fileData []byte, mimeType string) (map[string]interface{}, error) {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("GEMINI_API_KEY not found")
	}

	products, _ := s.productService.GetAllSimple()
	productsJSON, _ := json.Marshal(products)

	vendors, _ := s.vendorService.GetAllSimple()
	vendorsJSON, _ := json.Marshal(vendors)

	locations, _ := s.locationService.GetAllSimple()
	locationsJSON, _ := json.Marshal(locations)

	customers, _ := s.customerService.GetAllSimple()
	customersJSON, _ := json.Marshal(customers)

	prompt := fmt.Sprintf(`You are an expert Arabic Inventory specialist. 
Extract data from this invoice (image, voice, or text). 

SYSTEM PRODUCTS LIST (JSON):
%s

SYSTEM VENDORS LIST (JSON):
%s

SYSTEM CUSTOMERS LIST (JSON):
%s

SYSTEM LOCATIONS LIST (JSON):
%s

MATCHING RULES:
1. Determine "invoice_type": "purchase" or "sale" based on context (e.g., "فاتورة بيع" = sale, "مشتريات" = purchase). Default to "purchase" if unclear. IF CONTEXT SPECIFIES A TYPE, YOU MUST USE IT.
2. Match invoice items to the system products list using name_ar or name_en.
3. For Purchase: Match "vendor_id" to system vendors using name or company_name. 
4. For Sale: Match "customer_id" to system customers using name.
5. Match "location_id" to system locations list using name.
6. Detect if user mentions an existing invoice number (e.g., #PI-202602-00004 or #SI-...).
7. Return "system_name" if matched, and "product_id" (integer).
8. IMPORTANT: If no unit_price is specified, use "cost_price" for purchases, or "unit_price" for sales.
9. "is_missing_info": True if location_id is missing, or (if purchase, vendor_id/vendor_name is missing), or (if sale, customer_id/customer_name is missing).
10. The "summary" should be in the same language as the user's message.
11. CRITICAL: If this is a follow-up interaction (Context provided), you MUST preserve and return ALL items from the original list in the "items" array unless explicitly told to remove them.

STRICT JSON OUTPUT ONLY:
{
  "invoice_type": "purchase/sale",
  "is_missing_info": boolean,
  "missing_info_reason": "Arabic text explaining what is missing",
  "summary": "Short summary",
  "vendor_name": "string (purchase only)",
  "vendor_id": number_or_null,
  "customer_name": "string (sale only)",
  "customer_id": number_or_null,
  "location_id": number_or_null,
  "invoice_number_reference": "string_or_null",
  "invoice_number": "string",
  "date": "YYYY-MM-DD",
  "items": [
    {
      "product_id": number_or_null,
      "system_name": "string",
      "name": "original string",
      "quantity": number,
      "unit_price": number,
      "discount_percent": number
    }
  ],
  "notes": "string",
  "paid_amount": number,
  "payment_method": "cash/bank/etc"
}

Task: %s`, string(productsJSON), string(vendorsJSON), string(customersJSON), string(locationsJSON), message)

	geminiReq := map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"parts": []map[string]interface{}{
					{"text": prompt},
				},
			},
		},
		"generationConfig": map[string]interface{}{
			"responseMimeType": "application/json",
		},
	}

	if len(fileData) > 0 {
		parts := geminiReq["contents"].([]map[string]interface{})[0]["parts"].([]map[string]interface{})
		parts = append(parts, map[string]interface{}{
			"inlineData": map[string]string{
				"mimeType": mimeType,
				"data":     base64.StdEncoding.EncodeToString(fileData),
			},
		})
		geminiReq["contents"].([]map[string]interface{})[0]["parts"] = parts
	}

	fmt.Printf("[AIChat] Sending request to Gemini... MimeType: %s, FileDataSize: %d\n", mimeType, len(fileData))
	url := "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey
	jsonBody, _ := json.Marshal(geminiReq)

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonBody))
	if err != nil {
		fmt.Printf("[AIChat] HTTP Error: %v\n", err)
		return nil, err
	}
	defer resp.Body.Close()

	body, _ := ioutil.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		fmt.Printf("[AIChat] Gemini API Error (%d): %s\n", resp.StatusCode, string(body))
		return nil, fmt.Errorf("Gemini API Error: %d", resp.StatusCode)
	}

	var geminiResp map[string]interface{}
	json.Unmarshal(body, &geminiResp)

	// Extract text content from Gemini response
	candidates, ok := geminiResp["candidates"].([]interface{})
	if !ok || len(candidates) == 0 {
		fmt.Printf("[AIChat] No candidates in response: %s\n", string(body))
		return nil, fmt.Errorf("no candidates found in Gemini response")
	}

	part := candidates[0].(map[string]interface{})["content"].(map[string]interface{})["parts"].([]interface{})[0].(map[string]interface{})
	rawJSON := part["text"].(string)
	fmt.Printf("[AIChat] Received Raw JSON: %s\n", rawJSON)

	var result map[string]interface{}
	if err := json.Unmarshal([]byte(rawJSON), &result); err != nil {
		fmt.Printf("[AIChat] JSON Parse Error: %v\n", err)
		return nil, fmt.Errorf("failed to parse AI JSON: %v", err)
	}

	return result, nil
}
