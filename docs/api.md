# VeloHub API Endpoints

This document specifies the REST HTTP endpoints exposed by the API server on port 4000. All requests that modify state must include an `Idempotency-Key` header.

## 1. User Balances

### User Registration
*   **Method:** `POST`
*   **Path:** `/users`
*   **Request Body:**
    ```json
    {
      "email": "client@example.com",
      "airtmAccount": "client_airtm_123"
    }
    ```

### Get Balances
*   **Method:** `GET`
*   **Path:** `/users/:id/balance`
*   **Response:**
    ```json
    {
      "userId": "uuid-string",
      "availableBalance": "1000.0000",
      "reservedBalance": "0.0000"
    }
    ```

### Get Transactions
*   **Method:** `GET`
*   **Path:** `/users/:id/transactions`

---

## 2. Top-ups and Withdrawals

### Deposit via Airtm (Topup)
*   **Method:** `POST`
*   **Path:** `/payments/topup`
*   **Headers:** `Idempotency-Key: <unique-uuid>`
*   **Request Body:**
    ```json
    {
      "userId": "uuid-string",
      "amount": 250.00
    }
    ```

### Withdraw to Airtm
*   **Method:** `POST`
*   **Path:** `/payments/withdraw`
*   **Headers:** `Idempotency-Key: <unique-uuid>`
*   **Request Body:**
    ```json
    {
      "userId": "uuid-string",
      "amount": 100.00
    }
    ```

---

## 3. Escrow (Trustless Work)

### Lock Escrow
*   **Method:** `POST`
*   **Path:** `/escrows/lock`
*   **Headers:** `Idempotency-Key: <unique-uuid>`
*   **Request Body:**
    ```json
    {
      "clientId": "client-uuid",
      "providerId": "provider-uuid",
      "amount": 500.00
    }
    ```

### Release Escrow (Freelancer completed work)
*   **Method:** `POST`
*   **Path:** `/escrows/release`
*   **Headers:** `Idempotency-Key: <unique-uuid>`
*   **Request Body:**
    ```json
    {
      "escrowId": "escrow-uuid"
    }
    ```

### Refund Escrow
*   **Method:** `POST`
*   **Path:** `/escrows/refund`
*   **Headers:** `Idempotency-Key: <unique-uuid>`
*   **Request Body:**
    ```json
    {
      "escrowId": "escrow-uuid"
    }
    ```
