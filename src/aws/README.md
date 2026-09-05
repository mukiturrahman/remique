# Remique AWS Webhook & SQS Migration

This directory contains the AWS Lambda handlers for the new WhatsApp webhook ingress architecture.

## Architecture

1. **`remique-webhook`**: An AWS Lambda function triggered by a Function URL (Auth: NONE). This receives the webhook from Meta, verifies the signature using `WHATSAPP_APP_SECRET`, and enqueues the raw payload to an SQS FIFO queue. It then returns HTTP 200 immediately, ensuring Meta receives a response within milliseconds.
2. **`Amazon SQS FIFO`**: Ensures messages from the same WhatsApp sender (`MessageGroupId = senderNumber`) are processed in order, and provides content-based deduplication using Meta's globally unique message ID (`MessageDeduplicationId = whatsappMessageId`).
3. **`remique-worker`**: An AWS Lambda function triggered by the SQS queue. It consumes the messages, claims them in the Neon PostgreSQL database, and executes the `runMessagePipeline` function (which calls OpenAI, handles reminders, and sends WhatsApp replies). If the pipeline encounters a transient failure (e.g. rate limit from OpenAI, API timeout), it throws an error and SQS automatically retries the message.

## Deployment Instructions

Since you are managing the deployment, here is the sequence of steps to configure the AWS resources manually or via your preferred IaC tool (Terraform/CDK/SAM).

### 1. Create SQS Queues
Create these in the **`ap-southeast-1` (Singapore)** region to minimize latency to the Neon database.

1. **Dead-Letter Queue (DLQ)**
   - Type: **FIFO**
   - Name: `remique-inbound-dlq.fifo`
2. **Main Queue**
   - Type: **FIFO**
   - Name: `remique-inbound.fifo`
   - Content-Based Deduplication: **OFF** (we provide the ID manually)
   - Visibility Timeout: **60 seconds**
   - Dead-Letter Queue: Enable and select `remique-inbound-dlq.fifo`
   - Maximum Receives: **5**

### 2. Deploy Webhook Lambda (`remique-webhook`)
1. Run `npm run build:aws` (or `./scripts/build-lambdas.sh`). This will generate `dist/aws/remique-webhook.zip`.
2. Create an AWS Lambda function:
   - Runtime: Node.js 20.x
   - Architecture: ARM64 or x86_64
   - Timeout: 5 seconds (it just enqueues and returns)
3. **Upload**: Select "Upload from -> .zip file" and upload `remique-webhook.zip`.
3. **Trigger**:
   - Add a Function URL.
   - Auth type: **NONE** (Meta will call this publicly).
4. **Permissions**:
   - Give the Lambda execution role `sqs:SendMessage` permissions on `remique-inbound.fifo`.
5. **Environment Variables**:
   - `WHATSAPP_VERIFY_TOKEN`: Your verification token
   - `WHATSAPP_APP_SECRET`: Your Meta App Secret (for HMAC)
   - `SQS_QUEUE_URL`: The URL of `remique-inbound.fifo`
   - `AWS_REGION`: `ap-southeast-1`

### 3. Deploy Worker Lambda (`remique-worker`)
1. The script `./scripts/build-lambdas.sh` also creates `dist/aws/remique-worker.zip` (with the Prisma engine included).
2. Create an AWS Lambda function:
   - Runtime: Node.js 20.x
   - Timeout: 60 seconds
3. **Upload**: Select "Upload from -> .zip file" and upload `remique-worker.zip`.
3. **Trigger**:
   - Add an SQS trigger pointing to `remique-inbound.fifo`.
   - Batch size: 10 (or 1 for strict isolation).
4. **Permissions**:
   - Give the Lambda execution role `sqs:ReceiveMessage`, `sqs:DeleteMessage`, and `sqs:GetQueueAttributes` permissions on `remique-inbound.fifo`.
5. **Environment Variables**:
   - Include **all** production variables currently used by Next.js (e.g., `DATABASE_URL`, `OPENAI_API_KEY`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `QSTASH_TOKEN`).
   - **Crucial**: Ensure `DATABASE_URL` is using your Neon **connection pooling** URL (the one that usually ends in `?sslmode=require` and points to the `pooler` endpoint), not the direct URL, as Lambda can open many concurrent connections.

### 4. Reconfigure Meta Webhook
1. Go to your Meta App Dashboard -> WhatsApp -> Configuration.
2. Click **Edit** next to the Webhook URL.
3. Paste the **Lambda Function URL** of `remique-webhook`.
4. Enter the `WHATSAPP_VERIFY_TOKEN`.
5. Click Verify and Save. (This will trigger the GET handshake on the Lambda).

## Testing the Migration

You can verify the acceptance criteria as follows:

1. **Verify Handshake (TEST 1)**: The Meta dashboard will confirm success when you save the webhook.
2. **Invalid Signature (TEST 2)**: Send a manual POST request using `curl` or Postman without an `x-hub-signature-256` header, or with an invalid one. You should get a `403 Forbidden` response.
3. **End-to-End Flow (TEST 3 & 4)**: Send a WhatsApp message to Remique ("Hello Remique", or "Remind me..."). You should see a reply. Check the CloudWatch logs for `remique-worker` to confirm it processed the message via SQS.
4. **Idempotency (TEST 5)**: The Lambda worker calls `claimInboundMessage` which uses the Prisma unique constraint on `whatsappMessageId`. If Meta sends a duplicate, the worker will gracefully ignore it.
5. **Concurrency & Ordering (TEST 6 & 7)**: The SQS `MessageGroupId` is the sender's phone number, so messages from different users process concurrently, while messages from the same user process strictly in order.
6. **Error Recovery (TEST 8 & 9)**: If OpenAI times out, the `remique-worker` throws an error. SQS will retry the message up to 5 times before moving it to the DLQ.

## Cleanup
Once you have verified the AWS pipeline is working flawlessly in production for a few days, you can safely delete `src/app/api/webhooks/whatsapp/route.ts` from your Next.js application, as Amplify will no longer handle inbound webhooks.
