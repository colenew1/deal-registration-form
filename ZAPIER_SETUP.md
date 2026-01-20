# Zapier Email Intake Setup Guide

This guide explains how to set up Zapier to automatically forward deal registration emails to the application for processing.

## Overview

The email intake system works as follows:
1. Sales team forwards prospect emails to a designated email address
2. Zapier triggers on incoming emails and sends the data to our webhook
3. The application parses the email and extracts deal information
4. A pre-filled form URL is generated for review
5. Optionally, Zapier notifies the team via Slack/email with the form link

## Prerequisites

- Zapier account (Free tier works, but paid recommended for volume)
- Your application deployed with a public URL
- (Optional) Slack workspace for notifications
- (Optional) Environment variable `EMAIL_INTAKE_WEBHOOK_SECRET` for security

## Step 1: Create the Email Trigger

### Option A: Email by Zapier (Recommended)

1. Go to [Zapier](https://zapier.com) and click "Create Zap"
2. Search for "Email by Zapier" as your trigger
3. Choose "New Inbound Email" as the trigger event
4. Zapier will generate a unique email address like: `deals@robot.zapier.com`
5. Test the trigger by sending a test email to this address
6. Share this email address with your sales team for forwarding deals

### Option B: Gmail Trigger

1. Choose "Gmail" as your trigger app
2. Select "New Email Matching Search" as trigger event
3. Connect your Gmail account
4. Set up a search query like: `label:deal-registrations` or `to:deals@yourcompany.com`
5. Test the trigger

### Option C: Outlook Trigger

1. Choose "Microsoft Outlook" as your trigger app
2. Select "New Email" as trigger event
3. Connect your Outlook account
4. Optionally filter by folder or sender

## Step 2: Configure the Webhook Action

1. Click the "+" to add an action
2. Search for "Webhooks by Zapier"
3. Choose "POST" as the action event
4. Configure the webhook:

### Webhook Configuration

**URL:**
```
https://your-domain.com/api/email-intake
```

**Payload Type:** JSON

**Data Fields (map from your email trigger):**

| Field | Zapier Variable | Description |
|-------|-----------------|-------------|
| `from_email` | `{{raw__from__email}}` or `{{from__email}}` | Sender's email address |
| `from_name` | `{{raw__from__name}}` or `{{from__name}}` | Sender's display name |
| `to_email` | `{{raw__to__email}}` or `{{to}}` | Recipient email |
| `subject` | `{{raw__subject}}` or `{{subject}}` | Email subject line |
| `body_plain` | `{{body_plain}}` or `{{stripped_text}}` | Plain text email body |
| `body_html` | `{{body_html}}` | HTML email body (optional) |
| `date` | `{{date}}` | Email received date |
| `message_id` | `{{id}}` or `{{message_id}}` | Unique email ID |

**Example JSON payload:**
```json
{
  "from_email": "partner@shicompany.com",
  "from_name": "John Partner",
  "to_email": "deals@yourcompany.com",
  "subject": "Fwd: New opportunity - Acme Corp",
  "body_plain": "---------- Forwarded message ---------\nFrom: jane@acmecorp.com\n\nHi, we're interested in your contact center solutions...",
  "date": "2024-01-15T10:30:00Z",
  "message_id": "abc123xyz"
}
```

### Security Header (Optional but Recommended)

If you've set the `EMAIL_INTAKE_WEBHOOK_SECRET` environment variable:

1. Click "Show Options" in the Webhooks action
2. Under "Headers", add:
   - Key: `Authorization`
   - Value: `Bearer YOUR_SECRET_TOKEN`

## Step 3: Add Notification Action (Optional)

After the webhook action, you can add notifications:

### Slack Notification

1. Add another action: "Slack"
2. Choose "Send Channel Message"
3. Configure the message:

```
New deal registration received!

Customer: {{data__extracted_data__customer_company}}
Partner: {{data__extracted_data__partner}}
TSD: {{data__extracted_data__tsd}}

Review and complete: {{data__prefill_url}}

Warnings: {{data__warnings}}
```

### Email Notification

1. Add action: "Email by Zapier" or "Gmail"
2. Send to your sales team
3. Include the `prefill_url` from the webhook response

## Step 4: Test Your Zap

1. Click "Test" on each step
2. Send a test email with sample deal information:

```
Subject: Fwd: New opportunity - Test Company

---------- Forwarded message ---------
From: Jane Doe <jane@testcompany.com>
Date: Mon, Jan 15, 2024
Subject: Interest in contact center solutions

Hi,

We're interested in your performance management and coaching solutions
for our contact center of about 150 agents.

Best regards,
Jane Doe
VP of Operations
Test Company
Phone: 555-123-4567

Customer: Test Company
Contact: Jane Doe
Email: jane@testcompany.com
Agents: 150
Timeline: 3-6 months
```

3. Verify the webhook returns a success response with a `prefill_url`
4. Open the `prefill_url` to see the pre-filled form

## Step 5: Turn On Your Zap

1. Review all steps
2. Give your Zap a name (e.g., "Deal Registration Email Intake")
3. Turn on the Zap

## Webhook Response Format

The webhook returns JSON with this structure:

```json
{
  "success": true,
  "message": "Email intake processed successfully",
  "intake_id": "uuid-of-the-intake-record",
  "prefill_url": "https://your-domain.com/register/uuid-here",
  "extracted_data": {
    "customer_company": "Acme Corp",
    "customer_email": "jane@acmecorp.com",
    "partner": "John Partner",
    "tsd": "Avant"
  },
  "warnings": [
    "Could not extract customer phone",
    "Low confidence on TSD name - please verify"
  ],
  "confidence_summary": {
    "high_confidence_fields": ["ta_email", "ta_full_name"],
    "low_confidence_fields": ["customer_company_name", "tsd_name"],
    "missing_fields": ["customer_phone", "implementation_timeline"]
  }
}
```

## Email Formatting Tips for Best Parsing

Advise your sales team to include structured information when forwarding:

```
Customer Company: Acme Corporation
Contact Name: Jane Doe
Contact Email: jane@acmecorp.com
Contact Phone: 555-123-4567
Title: VP of Operations

Agents: 150
Timeline: 3-6 months
Solutions: Performance Management, Coaching

Description:
Customer is looking to improve their contact center performance...

TSD: Avant
Partner Company: SHI
```

The parser will still work with unstructured emails, but structured formats yield higher confidence scores.

## Troubleshooting

### Webhook returns 401 Unauthorized
- Check that your `EMAIL_INTAKE_WEBHOOK_SECRET` matches the Authorization header
- Ensure the header format is `Bearer YOUR_TOKEN` (with space)

### Low confidence scores on extracted data
- Encourage partners to use more structured email formats
- The pre-fill page highlights low-confidence fields for review

### Missing fields
- Some fields may not be present in the email
- Users can fill in missing data on the pre-fill form

### Duplicate submissions
- The `message_id` field helps identify duplicate emails
- Consider adding deduplication logic if needed

## Environment Variables

Add these to your deployment:

```env
# Optional: Secure your webhook endpoint
EMAIL_INTAKE_WEBHOOK_SECRET=your-secret-token-here

# Required for generating correct URLs
NEXT_PUBLIC_BASE_URL=https://your-production-domain.com
```

## Advanced: Re-parsing Emails

If you need to re-parse an email with updated logic:

1. The raw email payload is stored in `raw_payload` column
2. Original email body is in `email_body_plain`
3. You can create an admin endpoint to re-run parsing

## Support

For issues with:
- **Zapier configuration**: Contact Zapier support
- **Email parsing accuracy**: Review the `email-parser.ts` patterns
- **Application errors**: Check server logs and Supabase dashboard
