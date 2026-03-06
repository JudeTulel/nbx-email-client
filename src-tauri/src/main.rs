// src-tauri/src/main.rs

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use lettre::{
    message::{header::ContentType, Message},
    transport::smtp::authentication::Credentials,
    SmtpTransport, Transport,
};
use keyring::Entry;

// ─────────────────────────────────────────────
// Data Structures
// ─────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
struct EmailRecipients {
    to: Vec<String>,
    #[serde(default)]
    cc: Vec<String>,
    #[serde(default)]
    bcc: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SendEmailRequest {
    sender: String,
    sender_name: String,
    recipients: EmailRecipients,
    subject: String,
    body_html: String,
    body_plain_text: String,
}

// ─────────────────────────────────────────────
// Tauri Commands
// ─────────────────────────────────────────────

/// Send an email via Azure Communication Services SMTP
#[tauri::command]
async fn send_email(request: SendEmailRequest) -> Result<String, String> {
    // Get password from keyring using plain email as the key
    let password = get_smtp_password(&request.sender)
        .map_err(|e| format!("Failed to get SMTP password: {}", e))?;

    // Build email message
    let mut email_builder = Message::builder()
        .from(
            format!("{} <{}>", request.sender_name, request.sender)
                .parse()
                .map_err(|e| format!("Invalid sender address: {}", e))?,
        )
        .subject(&request.subject);

    // Add To recipients
    for to in &request.recipients.to {
        email_builder = email_builder
            .to(to.parse().map_err(|e| format!("Invalid TO address '{}': {}", to, e))?);
    }

    // Add CC recipients
    for cc in &request.recipients.cc {
        email_builder = email_builder
            .cc(cc.parse().map_err(|e| format!("Invalid CC address '{}': {}", cc, e))?);
    }

    // Add BCC recipients
    for bcc in &request.recipients.bcc {
        email_builder = email_builder
            .bcc(bcc.parse().map_err(|e| format!("Invalid BCC address '{}': {}", bcc, e))?);
    }

    // Build email with HTML body
    let email = email_builder
        .header(ContentType::TEXT_HTML)
        .body(request.body_html.clone())
        .map_err(|e| format!("Failed to build email: {}", e))?;

    // Azure Communication Services SMTP requires:
    // username format → "acs-resource-name|sender@domain.com"
    let smtp_username = format!("nbx-comm-service|{}", request.sender);
    let creds = Credentials::new(smtp_username, password);

    // Build SMTP transport via STARTTLS on port 587
    let mailer = SmtpTransport::starttls_relay("smtp.azurecomm.net")
        .map_err(|e| format!("Failed to create SMTP transport: {}", e))?
        .port(587)
        .credentials(creds)
        .build();

    // Send the email
    match mailer.send(&email) {
        Ok(_) => {
            println!("✅ Email sent successfully to {:?}", request.recipients.to);
            Ok("Email sent successfully".to_string())
        }
        Err(e) => {
            eprintln!("❌ Failed to send email: {}", e);
            Err(format!("Failed to send email: {}", e))
        }
    }
}

/// Save SMTP credentials securely to the system keychain.
/// The keyring key is the plain sender email address.
#[tauri::command]
fn save_smtp_credentials(username: String, password: String) -> Result<(), String> {
    let entry = Entry::new("nbx-email-client", &username)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

    entry
        .set_password(&password)
        .map_err(|e| format!("Failed to save password: {}", e))?;

    println!("✅ SMTP credentials saved for {}", username);
    Ok(())
}

/// Delete stored SMTP credentials from the system keychain
#[tauri::command]
fn delete_smtp_credentials(username: String) -> Result<(), String> {
    let entry = Entry::new("nbx-email-client", &username)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

    entry
        .delete_password()
        .map_err(|e| format!("Failed to delete password: {}", e))?;

    println!("🗑️ SMTP credentials deleted for {}", username);
    Ok(())
}

/// Test SMTP connection to Azure Communication Services
#[tauri::command]
async fn test_smtp_connection(username: String) -> Result<String, String> {
    // Retrieve password from keyring using plain email
    let password = get_smtp_password(&username)?;

    // Azure ACS SMTP username format
    let smtp_username = format!("nbx-comm-service|{}", username);
    let creds = Credentials::new(smtp_username, password);

    let mailer = SmtpTransport::starttls_relay("smtp.azurecomm.net")
        .map_err(|e| format!("Failed to create SMTP transport: {}", e))?
        .port(587)
        .credentials(creds)
        .build();

    mailer
        .test_connection()
        .map_err(|e| format!("Connection test failed: {}", e))?;

    println!("✅ SMTP connection test passed for {}", username);
    Ok("SMTP connection successful!".to_string())
}

// ─────────────────────────────────────────────
// Internal Helpers
// ─────────────────────────────────────────────

/// Retrieve SMTP password from the system keychain.
/// Uses the plain sender email as the keyring key.
fn get_smtp_password(username: &str) -> Result<String, String> {
    let entry = Entry::new("nbx-email-client", username)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

    entry.get_password().map_err(|e| {
        format!(
            "Failed to get password for '{}': {}. Please configure SMTP settings first.",
            username, e
        )
    })
}

// ─────────────────────────────────────────────
// Main Entry Point
// ─────────────────────────────────────────────

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            send_email,
            save_smtp_credentials,
            test_smtp_connection,
            delete_smtp_credentials,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}