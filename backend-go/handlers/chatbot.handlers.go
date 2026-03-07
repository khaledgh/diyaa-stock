package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"time"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

type ChatbotHandler struct {
	db             *gorm.DB
	productService ProductService
}

func NewChatbotHandler(db *gorm.DB, ps ProductService) *ChatbotHandler {
	return &ChatbotHandler{
		db:             db,
		productService: ps,
	}
}

type GeminiRequest struct {
	Contents []struct {
		Parts []struct {
			Text       string      `json:"text,omitempty"`
			InlineData *InlineData `json:"inlineData,omitempty"`
		} `json:"parts"`
	} `json:"contents"`
}

type InlineData struct {
	MimeType string `json:"mimeType"`
	Data     string `json:"data"`
}

func (h *ChatbotHandler) HandleChat(c echo.Context) error {
	var req struct {
		SessionID uint   `json:"session_id"`
		Message   string `json:"message"`
		Image     string `json:"image"`     // Base64
		MimeType  string `json:"mime_type"` // dynamic mime type
	}

	if err := c.Bind(&req); err != nil {
		return ResponseError(c, err)
	}

	// 1. Manage Session
	var session models.ChatSession
	if req.SessionID != 0 {
		if err := h.db.First(&session, req.SessionID).Error; err != nil {
			req.SessionID = 0
		}
	}

	if req.SessionID == 0 {
		title := req.Message
		if title == "" && req.Image != "" {
			title = "Image Analysis"
		}
		if len(title) > 50 {
			title = title[:47] + "..."
		}
		session = models.ChatSession{
			Title: title,
		}
		h.db.Create(&session)
		req.SessionID = session.ID
	} else {
		h.db.Model(&session).Update("updated_at", time.Now())
	}

	// 2. Save User Message
	userMsg := models.ChatMessage{
		SessionID: req.SessionID,
		Role:      "user",
		Content:   req.Message,
		Image:     req.Image,
		Timestamp: time.Now(),
	}
	h.db.Create(&userMsg)

	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		return c.JSON(http.StatusInternalServerError, map[string]string{"message": "GEMINI_API_KEY not found in server environment"})
	}

	// Fetch product list for context
	products, err := h.productService.GetAllSimple()
	if err != nil {
		return ResponseError(c, err)
	}

	productsJSON, _ := json.Marshal(products)

	mimeType := "image/jpeg"
	if req.MimeType != "" {
		mimeType = req.MimeType
	}

	prompt := fmt.Sprintf(`You are an expert Arabic OCR and Inventory specialist. 
Your task is to extract data from an invoice image (often handwritten in Arabic) and match it to our system's product list.

SYSTEM PRODUCTS LIST (JSON):
%s

--- CRITICAL ARABIC OCR & MATCHING INSTRUCTIONS ---
1. **Handwriting Recognition**: 
   - Pay close attention to connected letters and common Arabic handwriting styles (Riq'ah, Naskh). 
   - Identify words even if the dots (nuqat) are missing or merged, which is common in fast handwriting.
2. **Arabic Normalization**: 
   - When matching, ignore differences between (أ, إ, آ, ا), (ة, ه), and (ى, ي). 
   - For example, if the invoice says "جبنه" and the system has "جبنة", this is a 100%% match.
3. **Semantic/Phonetic Matching**:
   - If the name is abbreviated (e.g., "كوكا" for "كوكا كولا") or misspelled, use the context of the "SYSTEM PRODUCTS LIST" to find the most logical match.
   - Look for keywords. If the invoice says "حليب نيدو ١ كيلو", match it to the system item containing "نيدو" and "حليب".
4. **Product ID Assignment**:
   - Return the EXACT "id" from the system list for matched items.
   - Return "system_name" as the EXACT name (name_ar or name_en) from the matched system item.
5. **New Products**:
   - If a product on the invoice definitely does NOT exist in the system, set "product_id" to null and use the original name from the invoice for "name".

STRICT JSON OUTPUT ONLY:
{
  "summary": "Short summary in Arabic about what was found",
  "vendor_name": "string",
  "invoice_number": "string",
  "date": "YYYY-MM-DD",
  "items": [
    {
      "product_id": number_or_null,
      "system_name": "EXACT name from our system if matched, else null",
      "name": "original handwritten name as read from invoice",
      "quantity": number,
      "unit_price": number,
      "discount_percent": number
    }
  ],
  "notes": "string",
  "paid_amount": number,
  "payment_method": "cash/bank/etc"
}

Task: %s`, string(productsJSON), req.Message)

	geminiReq := struct {
		Contents []struct {
			Parts []interface{} `json:"parts"`
		} `json:"contents"`
		GenerationConfig struct {
			ResponseMimeType string `json:"responseMimeType"`
		} `json:"generationConfig"`
	}{}

	type TextPart struct {
		Text string `json:"text"`
	}
	type ImagePart struct {
		InlineData struct {
			MimeType string `json:"mimeType"`
			Data     string `json:"data"`
		} `json:"inlineData"`
	}

	parts := []interface{}{
		TextPart{Text: prompt},
	}

	if req.Image != "" {
		ip := ImagePart{}
		ip.InlineData.MimeType = mimeType
		ip.InlineData.Data = req.Image
		parts = append(parts, ip)
	}

	geminiReq.Contents = []struct {
		Parts []interface{} `json:"parts"`
	}{{Parts: parts}}
	geminiReq.GenerationConfig.ResponseMimeType = "application/json"

	url := "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=" + apiKey

	jsonBody, _ := json.Marshal(geminiReq)
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonBody))
	if err != nil {
		return ResponseError(c, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := ioutil.ReadAll(resp.Body)
		return c.JSON(resp.StatusCode, map[string]interface{}{
			"message": "Gemini API Error",
			"details": string(body),
		})
	}

	body, _ := ioutil.ReadAll(resp.Body)

	// Parse to extract AI text for saving
	var geminiResult struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}
	json.Unmarshal(body, &geminiResult)

	aiRawText := "{}"
	if len(geminiResult.Candidates) > 0 && len(geminiResult.Candidates[0].Content.Parts) > 0 {
		aiRawText = geminiResult.Candidates[0].Content.Parts[0].Text
	}

	// 3. Save AI Message
	aiMsg := models.ChatMessage{
		SessionID: req.SessionID,
		Role:      "ai",
		Content:   aiRawText,
		Timestamp: time.Now(),
	}
	h.db.Create(&aiMsg)

	var geminiResp interface{}
	json.Unmarshal(body, &geminiResp)

	return c.JSON(http.StatusOK, map[string]interface{}{
		"session_id": req.SessionID,
		"gemini":     geminiResp,
	})
}

func (h *ChatbotHandler) GetSessions(c echo.Context) error {
	var sessions []models.ChatSession
	h.db.Order("updated_at desc").Find(&sessions)
	return c.JSON(http.StatusOK, sessions)
}

func (h *ChatbotHandler) GetSessionHistory(c echo.Context) error {
	sessionID := c.Param("id")
	var messages []models.ChatMessage
	h.db.Where("session_id = ?", sessionID).Order("timestamp asc").Find(&messages)
	return c.JSON(http.StatusOK, messages)
}

func (h *ChatbotHandler) DeleteSession(c echo.Context) error {
	sessionID := c.Param("id")
	h.db.Delete(&models.ChatMessage{}, "session_id = ?", sessionID)
	h.db.Delete(&models.ChatSession{}, "id = ?", sessionID)
	return c.NoContent(http.StatusNoContent)
}
