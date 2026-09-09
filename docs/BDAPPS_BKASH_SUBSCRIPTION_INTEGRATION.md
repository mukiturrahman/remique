# bdApps bKash Subscription SDK Integration Guide

This document provides complete instructions for configuring, testing, and operating the **bdApps bKash Subscription SDK** in Remique.

---

## 1. Overview & Architecture

Remique uses the **bdApps bKash Subscription SDK** for handling recurring subscription payments.

### Why bdApps bKash SDK?
* **Zero Token Expiration Hassles:** Unlike the standard bKash Merchant PGW (which requires manual periodic agreement executions and refresh tokens), bdApps handles recurring subscription billing directly on the carrier/bKash backend.
* **Server-Side Security:** The sensitive `BDAPPS_API_SECRET` never touches the browser. Authorization URLs are signed server-side using SHA-512.
* **Streamlined User Experience:** Users input their WhatsApp phone number, redirect to the hosted bdApps consent screen, authenticate via bKash OTP/PIN, and are returned instantly to Remique with Pro status activated.

---

## 2. Required Credentials & Environment Variables

Add the following environment variables to your `.env` / deployment configuration:

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `BDAPPS_API_KEY` | API Key from bdApps Developer Portal | `c87b9e02...` |
| `BDAPPS_API_SECRET` | API Secret from bdApps Developer Portal | `7f41a8b...` |
| `BDAPPS_APP_ID` | bdApps Application ID | `APP_012345` |
| `BDAPPS_AUTH_URL` | bdApps SDK Authorization URL | `https://user.bdapps.com/sdk/subscription/authorize` |
| `NEXT_PUBLIC_APP_URL` | Fully qualified base URL of Remique | `https://remique.app` |

> 🔒 **Security Notice:** Never commit `BDAPPS_API_SECRET` to Git or expose it in client-side bundles.

---

## 3. How to Obtain Credentials from the bdApps Portal

Follow these steps on the bdApps Developer Portal:

1. **Request SDK Enablement:**
   * Ensure the bdApps administrator has enabled **Charging SDK** and **bKash Subscription** for your application.
2. **Open Application Settings:**
   * Log into [bdapps.com](https://bdapps.com) and navigate to your application.
3. **Switch to Advanced Mode:**
   * Click the **General** tab and select the **ADVANCED** view toggle.
4. **Confirm Capabilities:**
   * Verify that **Enable Charging SDK** is set to **YES**.
5. **Copy Credentials:**
   * Copy the **API Key** and **API Secret** displayed in the Charging SDK credential box.

---

## 4. Request Specification & Signature Formula

To initiate a subscription session, Remique constructs a signed URL:

### Endpoint
```
https://user.bdapps.com/sdk/subscription/authorize
```

### Parameters
* **`apiKey`**: Application API Key.
* **`requestId`**: Exactly **15 numeric digits**. Formatted as `YYMMDDHHmmss` (UTC, 12 digits) + 3-digit incrementing sequence (`100-999`).
* **`requestTime`**: Current UTC timestamp in ISO-8601 format with milliseconds (e.g. `2026-09-08T18:30:00.123Z`). Must not be a future time (valid for ~10 minutes).
* **`signature`**: Lowercase hexadecimal SHA-512 hash of:
  ```
  apiKey + "|" + requestTime + "|" + apiSecret
  ```
* **`redirectUrl`**: URL-encoded destination URL where bdApps sends the user after completion (`https://remique.app/api/billing/bdapps/callback`).

---

## 5. Endpoints in Remique

### 1. Initiate Subscription (`POST` or `GET`)
* **Route:** `/api/billing/bdapps/subscribe`
* **Purpose:** Creates/resolves the user, records a `PENDING` subscription & payment record, generates a unique 15-char `requestId`, and returns the signed `authorizationUrl`.
* **Request Payload (POST):**
  ```json
  {
    "phoneNumber": "01712345678",
    "planPeriod": "monthly" // or "weekly"
  }
  ```
* **Response (POST):**
  ```json
  {
    "success": true,
    "authorizationUrl": "https://user.bdapps.com/sdk/subscription/authorize?apiKey=...",
    "requestId": "260908183000123"
  }
  ```

### 2. Browser Callback (`GET`)
* **Route:** `/api/billing/bdapps/callback`
* **Purpose:** Target of `redirectUrl`. When the user completes authorization on bdApps, bdApps redirects here with query params:
  * On Success: Activates the user's Pro plan, marks `Payment` as `PAID`, sends a WhatsApp welcome message, and redirects to `/billing/success?requestId=...`.
  * On Error / Cancellation: Marks `Payment` as `FAILED`, and redirects to `/billing/cancelled?error=...`.

### 3. IPN / Webhook Notification (`POST`)
* **Route:** `/api/billing/bdapps/webhook`
* **Purpose:** Receives asynchronous subscription notifications from bdApps (e.g. registration, renewal, unregistration).
* **Sample Payload:**
  ```json
  {
    "version": "1.0",
    "applicationId": "APP_012345",
    "subscriberId": "tel:8801712345678",
    "status": "REGISTERED",
    "frequency": "MONTHLY",
    "timeStamp": "2026-09-08 18:30:00",
    "requestId": "260908183000123"
  }
  ```

---

## 6. Portal Configuration Checklist

In the bdApps Developer Portal:
1. **Redirect / Callback URL:** Set to `https://<YOUR_DOMAIN>/api/billing/bdapps/callback`.
2. **Notification / IPN URL:** Set to `https://<YOUR_DOMAIN>/api/billing/bdapps/webhook`.
3. **Plan Pricing Configuration:**
   * Weekly: ৳49 / week
   * Monthly: ৳190 / month

---

## 7. SDK Error Codes Reference

| Error Code | Description | Recommended Action |
| :--- | :--- | :--- |
| **`E1001`** | Error occurred. Please try again. | Inspect request parameters and retry. |
| **`E1002`** | Invalid signature. | Verify signature source order (`apiKey\|requestTime\|apiSecret`) and SHA-512 lowercase hex. |
| **`E1003`** | Invalid time format. | Use valid UTC ISO-8601 string (`YYYY-MM-DDTHH:mm:ss.sssZ`). |
| **`E1004`** | Request timeout. | Generate a fresh `requestTime` and restart the flow. |
| **`E1005`** | Invalid request ID. | Ensure `requestId` is strictly 15 numeric digits. |
| **`E1006`** | Invalid API key. | Verify `BDAPPS_API_KEY` matches application settings. |
| **`E1007`** | Unauthorized. | Confirm application credentials and permissions. |
| **`E1008`** | Service not allowed for the application. | Contact bdApps support to enable the service. |
| **`E1009`** | Invalid request. | Verify all required parameters are supplied. |
| **`E1010`** | Service not allowed for the SP. | Contact bdApps administrator. |
| **`E1011`** | SDK is not enabled for this application. | Request Charging SDK / subscription capability enablement. |
| **`E1012`** | Please start from the beginning. | Expired session. Generate a new request and restart. |

---

## 8. Verification & Automated Tests

Automated tests for bdApps signing, requestId generation, URL building, and error dictionary are located at:
```bash
npm test
```
All 100 test cases verify signature fidelity, collision-resistant 15-char ID generation, and phone normalization.
