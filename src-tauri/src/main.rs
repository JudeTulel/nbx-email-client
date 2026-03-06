// src-tauri/src/main.rs

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use lettre::{
    message::{header::ContentType, Message},
    transport::smtp::authentication::Credentials,
    SmtpTransport, Transport,
};
use keyring::Entry;

// Data structures
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

// Tauri Commands

/// Send an email via Azure Communication Services SMTP
#[tauri::command]
async fn send_email(request: SendEmailRequest) -> Result<String, String> {
    // Get SMTP password from secure keyring storage
    let password = get_smtp_password(&request.sender)
        .map_err(|e| format!("Failed to get SMTP password: {}", e))?;

    // Build email message
    let mut email_builder = Message::builder()
        .from(format!("{} <{}>", request.sender_name, request.sender).parse().unwrap())
        .subject(&request.subject);

    // Add To recipients
    for to in &request.recipients.to {
        email_builder = email_builder.to(to.parse().map_err(|e| format!("Invalid TO address: {}", e))?);
    }

    // Add CC recipients
    for cc in &request.recipients.cc {
        email_builder = email_builder.cc(cc.parse().map_err(|e| format!("Invalid CC address: {}", e))?);
    }

    // Add BCC recipients
    for bcc in &request.recipients.bcc {
        email_builder = email_builder.bcc(bcc.parse().map_err(|e| format!("Invalid BCC address: {}", e))?);
    }

    // Build email with HTML content
    let email = email_builder
        .header(ContentType::TEXT_HTML)
        .body(request.body_html.clone())
        .map_err(|e| format!("Failed to build email: {}", e))?;

    // Create SMTP credentials
    let creds = Credentials::new(request.sender.clone(), password);

    // Create SMTP transport (Azure Communication Services)
    let mailer = SmtpTransport::starttls_relay("smtp.azurecomm.net")
        .map_err(|e| format!("Failed to create SMTP transport: {}", e))?
        .port(587)
        .credentials(creds)
        .build();

    // Send email
    match mailer.send(&email) {
        Ok(_response) => {
            println!("✅ Email sent successfully!");
            Ok("Email sent successfully".to_string())
        }
        Err(e) => {
            eprintln!("❌ Failed to send email: {}", e);
            Err(format!("Failed to send email: {}", e))
        }
    }
}

/// Save SMTP credentials securely to system keychain
#[tauri::command]
fn save_smtp_credentials(username: String, password: String) -> Result<(), String> {
    let entry = Entry::new("nbx-email-client", &username)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
    
    entry.set_password(&password)
        .map_err(|e| format!("Failed to save password: {}", e))?;
    
    Ok(())
}

/// Get SMTP password from system keychain
fn get_smtp_password(username: &str) -> Result<String, String> {
    let entry = Entry::new("nbx-email-client", username)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
    
    entry.get_password()
        .map_err(|e| format!("Failed to get password: {}. Please configure SMTP settings first.", e))
}

/// Test SMTP connection
#[tauri::command]
async fn test_smtp_connection(username: String) -> Result<String, String> {
    let password = get_smtp_password(&username)?;
    
    let creds = Credentials::new(username, password);
    
    let mailer = SmtpTransport::starttls_relay("smtp.azurecomm.net")
        .map_err(|e| format!("Failed to create SMTP transport: {}", e))?
        .port(587)
        .credentials(creds)
        .build();

    mailer.test_connection()
        .map_err(|e| format!("Connection test failed: {}", e))?;

    Ok("SMTP connection successful!".to_string())
}

/// Delete stored SMTP credentials
#[tauri::command]
fn delete_smtp_credentials(username: String) -> Result<(), String> {
    let entry = Entry::new("nbx-email-client", &username)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
    
    entry.delete_password()
        .map_err(|e| format!("Failed to delete password: {}", e))?;
    
    Ok(())
}

// Main entry point
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