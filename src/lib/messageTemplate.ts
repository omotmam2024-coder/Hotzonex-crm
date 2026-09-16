/** Fills `{{placeholder}}` tokens in a template body. Unknown placeholders are left as-is. */
export function renderTemplate(body: string, values: Record<string, string>) {
  return body.replace(/\{\{(\w+)\}\}/g, (match, key: string) => values[key] ?? match)
}

export const SAMPLE_TEMPLATE_VALUES: Record<string, string> = {
  customer_name: 'Jane Doe',
  plan: 'Home Internet Plus',
  expiry_date: '20 Sep 2026',
  amount_due: 'SSP 45,000.00',
  amount_paid: 'SSP 45,000.00',
  voucher_code: 'HZX-AB12CD',
  payment_number: 'HZX-PAY-00042',
  invoice_number: 'HZX-INV-00042',
  ticket_number: 'HZX-T-00042',
  due_date: '30 Sep 2026',
}
