export interface PdfOptions {
  title: string
  content: string
}

export async function generatePdf(_options: PdfOptions): Promise<Buffer> {
  // TODO: Implement PDF generation (e.g., puppeteer, pdfkit, @react-pdf/renderer)
  throw new Error('PDF generation not yet implemented')
}
