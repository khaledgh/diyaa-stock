package handlers

// Arabic reshaping utilities for PDF generation
// This maps Arabic characters to their presentation forms

var arabicForms = map[rune][4]rune{
	// Arabic Letters: [isolated, final, initial, medial]
	'ا': {'\uFE8D', '\uFE8E', '\uFE8D', '\uFE8E'}, // Alef
	'أ': {'\uFE83', '\uFE84', '\uFE83', '\uFE84'}, // Alef with Hamza Above
	'إ': {'\uFE87', '\uFE88', '\uFE87', '\uFE88'}, // Alef with Hamza Below
	'آ': {'\uFE81', '\uFE82', '\uFE81', '\uFE82'}, // Alef with Madda Above
	'ب': {'\uFE8F', '\uFE90', '\uFE91', '\uFE92'}, // Ba
	'ت': {'\uFE95', '\uFE96', '\uFE97', '\uFE98'}, // Ta
	'ث': {'\uFE99', '\uFE9A', '\uFE9B', '\uFE9C'}, // Tha
	'ج': {'\uFE9D', '\uFE9E', '\uFE9F', '\uFEA0'}, // Jeem
	'ح': {'\uFEA1', '\uFEA2', '\uFEA3', '\uFEA4'}, // Hha
	'خ': {'\uFEA5', '\uFEA6', '\uFEA7', '\uFEA8'}, // Kha
	'د': {'\uFEA9', '\uFEAA', '\uFEA9', '\uFEAA'}, // Dal
	'ذ': {'\uFEAB', '\uFEAC', '\uFEAB', '\uFEAC'}, // Thal
	'ر': {'\uFEAD', '\uFEAE', '\uFEAD', '\uFEAE'}, // Ra
	'ز': {'\uFEAF', '\uFEB0', '\uFEAF', '\uFEB0'}, // Zay
	'س': {'\uFEB1', '\uFEB2', '\uFEB3', '\uFEB4'}, // Seen
	'ش': {'\uFEB5', '\uFEB6', '\uFEB7', '\uFEB8'}, // Sheen
	'ص': {'\uFEB9', '\uFEBA', '\uFEBB', '\uFEBC'}, // Sad
	'ض': {'\uFEBD', '\uFEBE', '\uFEBF', '\uFEC0'}, // Dad
	'ط': {'\uFEC1', '\uFEC2', '\uFEC3', '\uFEC4'}, // Tah
	'ظ': {'\uFEC5', '\uFEC6', '\uFEC7', '\uFEC8'}, // Zah
	'ع': {'\uFEC9', '\uFECA', '\uFECB', '\uFECC'}, // Ain
	'غ': {'\uFECD', '\uFECE', '\uFECF', '\uFED0'}, // Ghain
	'ف': {'\uFED1', '\uFED2', '\uFED3', '\uFED4'}, // Fa
	'ق': {'\uFED5', '\uFED6', '\uFED7', '\uFED8'}, // Qaf
	'ك': {'\uFED9', '\uFEDA', '\uFEDB', '\uFEDC'}, // Kaf
	'ل': {'\uFEDD', '\uFEDE', '\uFEDF', '\uFEE0'}, // Lam
	'م': {'\uFEE1', '\uFEE2', '\uFEE3', '\uFEE4'}, // Meem
	'ن': {'\uFEE5', '\uFEE6', '\uFEE7', '\uFEE8'}, // Noon
	'ه': {'\uFEE9', '\uFEEA', '\uFEEB', '\uFEEC'}, // Ha
	'و': {'\uFEED', '\uFEEE', '\uFEED', '\uFEEE'}, // Waw
	'ي': {'\uFEF1', '\uFEF2', '\uFEF3', '\uFEF4'}, // Ya
	'ى': {'\uFEEF', '\uFEF0', '\uFEEF', '\uFEF0'}, // Alef Maksura
	'ة': {'\uFE93', '\uFE94', '\uFE93', '\uFE94'}, // Ta Marbuta
	'ء': {'\uFE80', '\uFE80', '\uFE80', '\uFE80'}, // Hamza
	'ؤ': {'\uFE85', '\uFE86', '\uFE85', '\uFE86'}, // Waw with Hamza
	'ئ': {'\uFE89', '\uFE8A', '\uFE8B', '\uFE8C'}, // Ya with Hamza
}

// Characters that don't connect to the next character
var nonConnecting = map[rune]bool{
	'ا': true, 'أ': true, 'إ': true, 'آ': true,
	'د': true, 'ذ': true, 'ر': true, 'ز': true,
	'و': true, 'ؤ': true, 'ة': true, 'ى': true,
}

// Check if character is Arabic
func isArabicChar(r rune) bool {
	return (r >= 0x0600 && r <= 0x06FF) || // Arabic
		(r >= 0x0750 && r <= 0x077F) || // Arabic Supplement
		(r >= 0xFB50 && r <= 0xFDFF) || // Arabic Presentation Forms-A
		(r >= 0xFE70 && r <= 0xFEFF) // Arabic Presentation Forms-B
}

// ReshapeArabic converts Arabic text to presentation forms for display
func ReshapeArabic(text string) string {
	runes := []rune(text)
	result := make([]rune, 0, len(runes))

	for i := 0; i < len(runes); i++ {
		char := runes[i]

		if !isArabicChar(char) {
			result = append(result, char)
			continue
		}

		forms, hasForm := arabicForms[char]
		if !hasForm {
			result = append(result, char)
			continue
		}

		// Determine position: 0=isolated, 1=final, 2=initial, 3=medial
		prevConnects := false
		nextConnects := false

		// Check if previous character connects
		if i > 0 {
			prev := runes[i-1]
			if isArabicChar(prev) && !nonConnecting[prev] {
				prevConnects = true
			}
		}

		// Check if next character can be connected to
		if i < len(runes)-1 {
			next := runes[i+1]
			if isArabicChar(next) {
				nextConnects = true
			}
		}

		// Current char doesn't connect forward
		if nonConnecting[char] {
			nextConnects = false
		}

		var formIndex int
		if prevConnects && nextConnects {
			formIndex = 3 // medial
		} else if prevConnects {
			formIndex = 1 // final
		} else if nextConnects {
			formIndex = 2 // initial
		} else {
			formIndex = 0 // isolated
		}

		result = append(result, forms[formIndex])
	}

	// Reverse for RTL display in LTR PDF
	reversed := make([]rune, len(result))
	for i, r := range result {
		reversed[len(result)-1-i] = r
	}

	return string(reversed)
}
