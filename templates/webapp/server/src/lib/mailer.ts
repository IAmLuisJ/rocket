export interface MailOptions {
  to: string
  subject: string
  html: string
}

export async function sendMail(options: MailOptions): Promise<void> {
  // TODO: Configure email transport (e.g., nodemailer, Resend, SendGrid)
  console.log(`[mailer] Would send email to ${options.to}: ${options.subject}`)
}
