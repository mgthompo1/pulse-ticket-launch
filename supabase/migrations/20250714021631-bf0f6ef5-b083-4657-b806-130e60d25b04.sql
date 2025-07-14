-- Set the RESEND_API_KEY secret
SELECT vault.create_secret('Ticket2TestAPIKey', 'RESEND_API_KEY', 'resend api key for sending emails');