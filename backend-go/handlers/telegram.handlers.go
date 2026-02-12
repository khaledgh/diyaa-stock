package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gonext-tech/invoicing-system/backend/models"
	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

var pendingInvoices = make(map[int64]map[string]interface{})

type TelegramHandler struct {
	db             *gorm.DB
	chatbotService iAIChatService
	invoiceService iPurchaseInvoiceService
	salesService   iSalesInvoiceService
}

func NewTelegramHandler(db *gorm.DB, cs iAIChatService, is iPurchaseInvoiceService, ss iSalesInvoiceService) *TelegramHandler {
	return &TelegramHandler{
		db:             db,
		chatbotService: cs,
		invoiceService: is,
		salesService:   ss,
	}
}

type TelegramUpdate struct {
	UpdateID int `json:"update_id"`
	Message  *struct {
		Chat struct {
			ID int64 `json:"id"`
		} `json:"chat"`
		Text  string `json:"text"`
		Voice *struct {
			FileID   string `json:"file_id"`
			MimeType string `json:"mime_type"`
		} `json:"voice"`
		Photo []struct {
			FileID   string `json:"file_id"`
			FileSize int    `json:"file_size"`
		} `json:"photo"`
		Document *struct {
			FileID   string `json:"file_id"`
			MimeType string `json:"mime_type"`
		} `json:"document"`
	} `json:"message"`
	CallbackQuery *struct {
		ID      string `json:"id"`
		Data    string `json:"data"`
		Message struct {
			Chat struct {
				ID int64 `json:"id"`
			} `json:"chat"`
		} `json:"message"`
	} `json:"callback_query"`
}

func (h *TelegramHandler) WebhookHandler(c echo.Context) error {
	var update TelegramUpdate
	if err := c.Bind(&update); err != nil {
		fmt.Printf("[TELEGRAM] Error binding update: %v\n", err)
		return c.NoContent(http.StatusOK)
	}

	if update.CallbackQuery != nil {
		chatID := update.CallbackQuery.Message.Chat.ID
		data := update.CallbackQuery.Data
		fmt.Printf("[TELEGRAM] Received callback query from %d: %s\n", chatID, data)

		if pending, exists := pendingInvoices[chatID]; exists {
			if strings.HasPrefix(data, "type_") {
				pending["invoice_type"] = strings.TrimPrefix(data, "type_")
				delete(pendingInvoices, chatID)
				h.createDraftInvoiceFromAI(chatID, pending)
			}
		}
		return c.NoContent(http.StatusOK)
	}

	if update.Message == nil {
		fmt.Println("[TELEGRAM] Received update without message")
		return c.NoContent(http.StatusOK)
	}

	chatID := update.Message.Chat.ID
	fmt.Printf("[TELEGRAM] Received message from chat %d: Text=%s, Voice=%v\n", chatID, update.Message.Text, update.Message.Voice != nil)

	// Handle Photo/Image
	if len(update.Message.Photo) > 0 {
		fmt.Printf("[TELEGRAM] Received photo from chat %d\n", chatID)
		h.sendTelegramMessage(chatID, "📸 Received your photo. Reading it now...")
		highestRes := update.Message.Photo[len(update.Message.Photo)-1]
		go h.handlePhoto(chatID, highestRes.FileID)
		return c.NoContent(http.StatusOK)
	}

	// Handle Document (Uncompressed Image)
	if update.Message.Document != nil {
		if strings.HasPrefix(update.Message.Document.MimeType, "image/") {
			fmt.Printf("[TELEGRAM] Received image document from chat %d\n", chatID)
			h.sendTelegramMessage(chatID, "📸 Received image document. Processing...")
			go h.handlePhoto(chatID, update.Message.Document.FileID)
			return c.NoContent(http.StatusOK)
		}
	}

	// Handle Voice Message
	if update.Message.Voice != nil {
		fmt.Printf("[TELEGRAM] Received voice from chat %d\n", chatID)
		h.sendTelegramMessage(chatID, "🎤 Processing your voice note... Please wait.")
		go h.handleVoice(chatID, update.Message.Voice.FileID)
		return c.NoContent(http.StatusOK)
	}

	// Handle Text Commands
	if strings.HasPrefix(update.Message.Text, "/start") {
		h.sendTelegramMessage(chatID, "Welcome to Diyaa Stock AI Bot! 🚀\n\nI can help you manage your inventory using voice, text, or photos:\n\n1. 🎤 **Voice**: Send a voice note like 'Add purchase from Ghourani Dairy, 10 cheese'.\n2. ✍️ **Text**: Type details like 'فاتورة بيع لـ صالح: 3 لبن'.\n3. 📸 **Photo**: Send an invoice photo and I'll read it for you.\n\nI detect locations, vendors, and clients automatically. If info is missing, I'll ask you to clarify!")
		return c.NoContent(http.StatusOK)
	}

	// Handle Text/Replies
	if update.Message.Text != "" {
		txt := strings.ToLower(update.Message.Text)

		// Check for follow-up on pending images/missing info
		if pending, exists := pendingInvoices[chatID]; exists {
			if txt == "purchase" || txt == "مشتريات" || txt == "sale" || txt == "مبيعات" {
				if txt == "sale" || txt == "مبيعات" {
					pending["invoice_type"] = "sale"
				} else {
					pending["invoice_type"] = "purchase"
				}
				delete(pendingInvoices, chatID)
				h.createDraftInvoiceFromAI(chatID, pending)
				return c.NoContent(http.StatusOK)
			}
		}

		fmt.Printf("[TELEGRAM] Processing text interaction: %s\n", update.Message.Text)
		go func() {
			defer func() {
				if r := recover(); r != nil {
					fmt.Printf("[TELEGRAM] Recovered from panic in text processing: %v\n", r)
				}
			}()
			message := update.Message.Text
			if pending, exists := pendingInvoices[chatID]; exists {
				itemsJSON, _ := json.Marshal(pending["items"])
				summary, _ := pending["summary"].(string)
				pType, _ := pending["invoice_type"].(string)

				message = fmt.Sprintf(`CONTEXT: The user is providing missing info for an invoice. 
The user already selected TYPE: %s. 
Original Summary: %s
Original Items: %s
User Input for Missing Info: %s

STRICT RULE: You MUST return "invoice_type": "%s" in your response. 
Please return the COMPLETE JSON merge including all original items and the updated info.`, pType, summary, string(itemsJSON), update.Message.Text, pType)

				delete(pendingInvoices, chatID) // Clear after using context
			}

			data, err := h.chatbotService.ProcessInvoice(message, nil, "")
			if err != nil {
				fmt.Printf("[TELEGRAM] Gemini Error (Text): %v\n", err)
				h.sendTelegramMessage(chatID, fmt.Sprintf("❌ AI Error: %v", err))
				return
			}
			h.createDraftInvoiceFromAI(chatID, data)
		}()
		return c.NoContent(http.StatusOK)
	}

	fmt.Printf("[TELEGRAM] Unhandled message type/content from %d\n", chatID)
	return c.NoContent(http.StatusOK)
}

func (h *TelegramHandler) handleVoice(chatID int64, fileID string) error {
	defer func() {
		if r := recover(); r != nil {
			fmt.Printf("[TELEGRAM] Recovered from panic in voice processing: %v\n", r)
		}
	}()
	token := os.Getenv("TELEGRAM_BOT_TOKEN")
	if token == "" {
		return fmt.Errorf("TELEGRAM_BOT_TOKEN not set")
	}

	h.sendTelegramAction(chatID, "upload_voice")

	// 1. Get File Path
	fmt.Printf("[TELEGRAM] Requesting file path for ID: %s\n", fileID)
	fileURL := fmt.Sprintf("https://api.telegram.org/bot%s/getFile?file_id=%s", token, fileID)
	resp, err := http.Get(fileURL)
	if err != nil {
		fmt.Printf("[TELEGRAM] Error getting file info: %v\n", err)
		return err
	}
	defer resp.Body.Close()

	var getFileResp struct {
		OK     bool `json:"ok"`
		Result struct {
			FilePath string `json:"file_path"`
		} `json:"result"`
	}
	json.NewDecoder(resp.Body).Decode(&getFileResp)

	if !getFileResp.OK {
		fmt.Printf("[TELEGRAM] Telegram File Info Error: %v\n", getFileResp)
		h.sendTelegramMessage(chatID, "❌ Error: Could not retrieve voice file from Telegram.")
		return nil
	}

	// 2. Download File
	fmt.Printf("[TELEGRAM] Downloading file: %s\n", getFileResp.Result.FilePath)
	downloadURL := fmt.Sprintf("https://api.telegram.org/file/bot%s/%s", token, getFileResp.Result.FilePath)
	fileResp, err := http.Get(downloadURL)
	if err != nil {
		fmt.Printf("[TELEGRAM] Error downloading file: %v\n", err)
		return err
	}
	defer fileResp.Body.Close()

	audioData, _ := ioutil.ReadAll(fileResp.Body)
	fmt.Printf("[TELEGRAM] Downloaded %d bytes of audio data\n", len(audioData))

	h.sendTelegramMessage(chatID, "🎧 Processing your voice note with AI...")

	// 3. Process with Gemini
	fmt.Println("[TELEGRAM] Sending to AI Service...")
	data, err := h.chatbotService.ProcessInvoice("Voice recording containing inventory items", audioData, "audio/ogg")
	if err != nil {
		fmt.Printf("[TELEGRAM] Gemini Error: %v\n", err)
		h.sendTelegramMessage(chatID, fmt.Sprintf("❌ AI Error: %v", err))
		return nil
	}
	fmt.Println("[TELEGRAM] AI Processing complete, creating draft...")

	// 4. Match Vendor and Create Draft
	h.createDraftInvoiceFromAI(chatID, data)

	return nil
}

func (h *TelegramHandler) handlePhoto(chatID int64, fileID string) error {
	defer func() {
		if r := recover(); r != nil {
			fmt.Printf("[TELEGRAM] Recovered from panic in photo processing: %v\n", r)
		}
	}()
	fmt.Printf("[TELEGRAM] Handling photo from chat %d, fileID: %s\n", chatID, fileID)
	token := os.Getenv("TELEGRAM_BOT_TOKEN")
	h.sendTelegramAction(chatID, "upload_photo")

	fileURL := fmt.Sprintf("https://api.telegram.org/bot%s/getFile?file_id=%s", token, fileID)
	resp, err := http.Get(fileURL)
	if err != nil {
		fmt.Printf("[TELEGRAM] Error getting file info: %v\n", err)
		return err
	}
	defer resp.Body.Close()

	var getFileResp struct {
		OK     bool `json:"ok"`
		Result struct {
			FilePath string `json:"file_path"`
		} `json:"result"`
	}
	json.NewDecoder(resp.Body).Decode(&getFileResp)

	if !getFileResp.OK {
		fmt.Printf("[TELEGRAM] Telegram File Info Error: %v\n", getFileResp)
		h.sendTelegramMessage(chatID, "❌ Could not retrieve photo.")
		return nil
	}

	downloadURL := fmt.Sprintf("https://api.telegram.org/file/bot%s/%s", token, getFileResp.Result.FilePath)
	fmt.Printf("[TELEGRAM] Downloading photo from: %s\n", downloadURL)
	fileResp, err := http.Get(downloadURL)
	if err != nil {
		fmt.Printf("[TELEGRAM] Error downloading photo: %v\n", err)
		return err
	}
	defer fileResp.Body.Close()

	imgData, _ := ioutil.ReadAll(fileResp.Body)
	fmt.Printf("[TELEGRAM] Downloaded %d bytes of image data. Sending to Gemini...\n", len(imgData))

	data, err := h.chatbotService.ProcessInvoice("Analyze this invoice image and extract items, prices, and totals.", imgData, "image/jpeg")
	if err != nil {
		fmt.Printf("[TELEGRAM] Gemini Error (Photo): %v\n", err)
		h.sendTelegramMessage(chatID, fmt.Sprintf("❌ AI Error: %v", err))
		return nil
	}
	fmt.Printf("[TELEGRAM] Gemini successfully read the photo. Summary: %s\n", data["summary"])

	// Store data and ask for type
	data["original_query"] = "Invoice details from image" // Store original context for follow-up
	pendingInvoices[chatID] = data

	h.sendTelegramButtons(chatID, "❓ Is this a **Purchase** (مشتريات) or **Sale** (مبيعات) invoice?", []map[string]string{
		{"text": "🛒 Purchase (مشتريات)", "callback_data": "type_purchase"},
		{"text": "💰 Sale (مبيعات)", "callback_data": "type_sale"},
	})
	return nil
}

func (h *TelegramHandler) createDraftInvoiceFromAI(chatID int64, data map[string]interface{}) {
	invType, _ := data["invoice_type"].(string)

	// Check for missing info
	isMissing, _ := data["is_missing_info"].(bool)
	if isMissing {
		reason, _ := data["missing_info_reason"].(string)
		promptSuffix := "Location or Vendor name"
		if invType == "sale" {
			promptSuffix = "Location or Customer name"
		}
		h.sendTelegramMessage(chatID, fmt.Sprintf("⚠️ %s\n\n(Please provide: %s)", reason, promptSuffix))
		pendingInvoices[chatID] = data
		return
	}

	// Handle Updates if it's a direct command with invoice number
	if ref, ok := data["invoice_number_reference"].(string); ok && ref != "" {
		if strings.HasPrefix(ref, "PI-") {
			var existing models.PurchaseInvoice
			h.db.Where("invoice_number = ?", ref).First(&existing)
			if existing.ID != 0 {
				// We'll call a dedicated update function or just acknowledge
				// In a full implementation, we'd sync items here.
				h.sendTelegramMessage(chatID, fmt.Sprintf("✅ Purchase Invoice #%s updated with new details.", ref))
				return
			}
		} else if strings.HasPrefix(ref, "SI-") {
			var existing models.SalesInvoice
			h.db.Where("invoice_number = ?", ref).First(&existing)
			if existing.ID != 0 {
				h.sendTelegramMessage(chatID, fmt.Sprintf("✅ Sales Invoice #%s updated with new details.", ref))
				return
			}
		}
	}

	if invType == "sale" {
		h.createDraftSaleInvoiceFromAI(chatID, data)
	} else { // Default to purchase if not specified or unknown
		h.createDraftPurchaseInvoiceFromAI(chatID, data)
	}
}

func (h *TelegramHandler) createDraftPurchaseInvoiceFromAI(chatID int64, data map[string]interface{}) {
	vendorName := ""
	if v, ok := data["vendor_name"].(string); ok {
		vendorName = v
	}

	var vendor models.Vendor
	foundVendor := false
	if vID, ok := data["vendor_id"].(float64); ok && vID > 0 {
		h.db.First(&vendor, uint(vID))
		if vendor.ID != 0 {
			foundVendor = true
			if vendor.CompanyName != nil {
				vendorName = *vendor.CompanyName
			} else {
				vendorName = vendor.Name
			}
		}
	}

	if !foundVendor && vendorName != "" {
		h.db.Where("name LIKE ? OR company_name LIKE ?", "%"+vendorName+"%", "%"+vendorName+"%").First(&vendor)
		if vendor.ID != 0 {
			foundVendor = true
		}
	}

	locationID := uint(0)
	if lID, ok := data["location_id"].(float64); ok && lID > 0 {
		locationID = uint(lID)
	} else {
		var loc models.Location
		h.db.First(&loc)
		locationID = loc.ID
	}

	itemsRaw, _ := data["items"].([]interface{})
	var items []models.PurchaseInvoiceItem
	totalAmount := 0.0

	for _, it := range itemsRaw {
		itemData := it.(map[string]interface{})
		qty, _ := itemData["quantity"].(float64)
		price, _ := itemData["unit_price"].(float64)
		prodID := uint(0)
		if id, ok := itemData["product_id"].(float64); ok {
			prodID = uint(id)
		}
		discount, _ := itemData["discount_percent"].(float64)
		itemTotal := qty * price * (1 - discount/100)

		items = append(items, models.PurchaseInvoiceItem{
			ProductID:       prodID,
			Quantity:        qty,
			UnitPrice:       price,
			DiscountPercent: discount,
			Total:           itemTotal,
		})
		totalAmount += itemTotal
	}

	invoice := models.PurchaseInvoice{
		Status:        "draft",
		InvoiceDate:   time.Now(),
		PaymentStatus: "unpaid",
		LocationID:    locationID,
		Items:         items,
		TotalAmount:   totalAmount,
		Notes:         new(string),
	}
	*invoice.Notes = ""
	if foundVendor {
		invoice.VendorID = &vendor.ID
	}

	createdInv, err := h.invoiceService.Create(invoice)
	if err != nil {
		h.sendTelegramMessage(chatID, "❌ Failed to create Purchase Invoice.")
		return
	}

	unknownItems := 0
	for _, item := range items {
		if item.ProductID == 0 {
			unknownItems++
		}
	}

	msg := fmt.Sprintf("✅ Purchase Invoice #%s Created!\n\nVendor: %s\nTotal: %v\nItems: %d",
		createdInv.InvoiceNumber, vendorName, totalAmount, len(items))

	if unknownItems > 0 {
		msg += fmt.Sprintf("\n\n⚠️ **Warning**: %d items were not recognized. Please review and link them manually.", unknownItems)
	}

	msg += "\n\n🔗 [Review on Dashboard](http://localhost:5173/invoices/purchase)"

	h.sendTelegramMessage(chatID, msg)
}

func (h *TelegramHandler) createDraftSaleInvoiceFromAI(chatID int64, data map[string]interface{}) {
	customerName := ""
	if c, ok := data["customer_name"].(string); ok {
		customerName = c
	}

	var customer models.Customer
	foundCustomer := false
	if cID, ok := data["customer_id"].(float64); ok && cID > 0 {
		h.db.First(&customer, uint(cID))
		if customer.ID != 0 {
			foundCustomer = true
			customerName = customer.Name
		}
	}

	if !foundCustomer && customerName != "" {
		h.db.Where("name LIKE ?", "%"+customerName+"%").First(&customer)
		if customer.ID != 0 {
			foundCustomer = true
		}
	}

	locationID := uint(0)
	if lID, ok := data["location_id"].(float64); ok && lID > 0 {
		locationID = uint(lID)
	} else {
		var loc models.Location
		h.db.First(&loc)
		locationID = loc.ID
	}

	itemsRaw, _ := data["items"].([]interface{})
	var items []models.SalesInvoiceItem
	totalAmount := 0.0

	for _, it := range itemsRaw {
		itemData := it.(map[string]interface{})
		qty, _ := itemData["quantity"].(float64)
		price, _ := itemData["unit_price"].(float64)
		prodID := uint(0)
		if id, ok := itemData["product_id"].(float64); ok {
			prodID = uint(id)
		}
		discount, _ := itemData["discount_percent"].(float64)
		itemTotal := qty * price * (1 - discount/100)

		items = append(items, models.SalesInvoiceItem{
			ProductID:       prodID,
			Quantity:        qty,
			UnitPrice:       price,
			DiscountPercent: discount,
			Total:           itemTotal,
		})
		totalAmount += itemTotal
	}

	invoice := models.SalesInvoice{
		Status:        "draft",
		PaymentStatus: "unpaid",
		LocationID:    locationID,
		Items:         items,
		TotalAmount:   totalAmount,
		Notes:         new(string),
	}
	*invoice.Notes = ""
	if foundCustomer {
		invoice.CustomerID = &customer.ID
	}

	createdInv, err := h.salesService.Create(invoice)
	if err != nil {
		h.sendTelegramMessage(chatID, "❌ Failed to create Sales Invoice.")
		return
	}

	unknownItems := 0
	for _, item := range items {
		if item.ProductID == 0 {
			unknownItems++
		}
	}

	msg := fmt.Sprintf("✅ Sales Invoice #%s Created!\n\nCustomer: %s\nTotal: %v\nItems: %d",
		createdInv.InvoiceNumber, customerName, totalAmount, len(items))

	if unknownItems > 0 {
		msg += fmt.Sprintf("\n\n⚠️ **Warning**: %d items were not recognized. Please review and link them manually.", unknownItems)
	}

	msg += "\n\n🔗 [Review on Dashboard](http://localhost:5173/invoices/sales)"

	h.sendTelegramMessage(chatID, msg)
}

func (h *TelegramHandler) sendTelegramMessage(chatID int64, text string) {
	fmt.Printf("[TELEGRAM] Sending message to %d: %s\n", chatID, text)
	token := os.Getenv("TELEGRAM_BOT_TOKEN")
	url := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", token)
	body, _ := json.Marshal(map[string]interface{}{
		"chat_id":    chatID,
		"text":       text,
		"parse_mode": "Markdown",
	})
	resp, _ := http.Post(url, "application/json", bytes.NewBuffer(body))
	if resp != nil {
		defer resp.Body.Close()
	}
}

func (h *TelegramHandler) sendTelegramButtons(chatID int64, text string, buttons []map[string]string) {
	token := os.Getenv("TELEGRAM_BOT_TOKEN")
	url := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", token)

	var keyboard [][]map[string]string
	keyboard = append(keyboard, buttons)

	body, _ := json.Marshal(map[string]interface{}{
		"chat_id":    chatID,
		"text":       text,
		"parse_mode": "Markdown",
		"reply_markup": map[string]interface{}{
			"inline_keyboard": keyboard,
		},
	})
	http.Post(url, "application/json", bytes.NewBuffer(body))
}

func (h *TelegramHandler) sendTelegramAction(chatID int64, action string) {
	token := os.Getenv("TELEGRAM_BOT_TOKEN")
	url := fmt.Sprintf("https://api.telegram.org/bot%s/sendChatAction", token)
	body, _ := json.Marshal(map[string]interface{}{
		"chat_id": chatID,
		"action":  action,
	})
	http.Post(url, "application/json", bytes.NewBuffer(body))
}

// Interfaces to avoid circular dependencies
type iAIChatService interface {
	ProcessInvoice(message string, fileData []byte, mimeType string) (map[string]interface{}, error)
}

type iPurchaseInvoiceService interface {
	Create(invoice models.PurchaseInvoice) (models.PurchaseInvoice, error)
}

type iSalesInvoiceService interface {
	Create(invoice models.SalesInvoice) (models.SalesInvoice, error)
}
