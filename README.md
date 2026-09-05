# Reflective Journal — Full-Stack AI Journaling Partner

A secure, user-authenticated reflective journaling application built with **React**, **Express**, **Firebase Authentication**, **Cloud Firestore**, and the **Google GenAI SDK (gemini-2.5-flash)**. Designed to provide empathetic, grounded Socratic self-reflection with zero cross-tenant data leakage.

---

## 1. Architectural Overview & Threat Mitigation

- **Identity & Authentication**: Firebase Authentication with Google Sign-In (`signInWithPopup`).
- **Data Vault**: Google Cloud Firestore with recursive owner-bound isolation (`users/{userId}/{document=**}`).
- **Server Engine**: Full-stack Express backend verifying Bearer ID tokens and streaming Gemini responses via Server-Sent Events (SSE).
- **Resilient AI Layer**: Automated model fallback ladder (`gemini-2.5-flash` → `gemini-3.6-flash` → `gemini-3.1-flash-lite` → `gemini-flash-latest` → `gemini-3.7-flash`).
- **Cognitive Insights**: Automatic structured JSON generation for title synthesis, emotional sentiment analysis, and thematic tagging.
- **Data Sovereignty**: Complete data export to Markdown (`.md`) and JSON (`.json`).

---

## 2. Prerequisites & Cloud Setup

Ensure you have the Google Cloud CLI (`gcloud`) and Firebase CLI installed and authenticated:

```bash
# Authenticate gcloud
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Enable required Google Cloud APIs
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com
```

---

## 3. Secret Management Setup (Google Cloud Secret Manager)

Store sensitive keys in Secret Manager rather than baking them into containers or commits:

```bash
# 1. Create the GEMINI_API_KEY secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# 2. Add your Gemini API key value
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 3. Grant the Cloud Run default service account Secret Accessor permissions
export PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format='value(projectNumber)')

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 4. Firestore Security Rules (Zero-Leakage Configuration)

Deploy owner-bound security rules to ensure users can only ever access their own documents:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Deploy the rules using the Firebase CLI:

```bash
firebase deploy --only firestore:rules
```

---

## 5. Local Development

```bash
# Install dependencies
npm install

# Start development server on port 3000
npm run dev
```

The application runs locally on `http://localhost:3000`.

---

## 6. Cloud Run Deployment

Build and deploy the application container directly to Google Cloud Run:

```bash
# Build and deploy to Cloud Run
gcloud run deploy reflective-journal \
  --source . \
  --region asia-southeast1 \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --set-env-vars="NODE_ENV=production,FIREBASE_PROJECT_ID=YOUR_PROJECT_ID"
```

---

## 7. Challenge Verification Labeling

Apply the mandatory resource label to register the Cloud Run service for automated campaign verification:

```bash
gcloud run services update reflective-journal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=asia-southeast1
```

---

## 8. Functional Walkthrough & Verification Scenarios

| Test Case | Flow & Process | Expected Outcome |
| :--- | :--- | :--- |
| **TC-01: Authentication** | Click "Sign in with Google" or "Explore Demo Vault". | Authenticated session is established; user profile document is synced in `users/{userId}`. |
| **TC-02: New Reflection Creation** | Click "+ New Journal Reflection" in sidebar. | New journal document is created in `users/{userId}/journals/{journalId}` with starter metadata. |
| **TC-03: Real-Time Socratic Reflection** | Type a thought (or click a starter prompt) and press Enter. | Bearer ID token is verified; Gemini 2.5 Flash streams response chunk-by-chunk with markdown rendering. |
| **TC-04: Automated Tagging & Titling** | Complete the first reflection turn. | Background `/api/insights` fires, generating title, sentiment badge, and tags saved to Firestore. |
| **TC-05: Data Export** | Click "Export" (single) or "Export All Data (Backup)". | Formatted Markdown or JSON is generated; copy and download actions function properly. |
| **TC-06: Journal Deletion** | Click trash icon on a journal card and confirm. | Journal document and all child messages in subcollection are permanently removed. |
