## Arabic PDF Export - Final Solution

The Arabic text in PDF exports is now handled by a custom reshaping engine that:

1. **Loads the Amiri font** from `/public/fonts/Amiri-Regular.ttf`
2. **Reshapes Arabic text** using `src/lib/arabicReshaper.ts` to convert letters to their proper presentation forms (Initial, Medial, Final, Isolated)
3. **Reverses the text** for LTR rendering in jsPDF

### Testing
Export any PDF report with Arabic names to verify the text appears correctly connected and readable.

### Vendor Statement Debit Column
The Debit column in Vendor Statement (`/vendors/:id/statement`) is working correctly:
- **Purchase Invoices** appear in the **Credit** column (what you owe)
- **Payments** appear in the **Debit** column (what you paid)
- This follows standard accounting principles for Accounts Payable

If you need to see Purchase Invoice amounts in a different column, please clarify the desired accounting treatment.
