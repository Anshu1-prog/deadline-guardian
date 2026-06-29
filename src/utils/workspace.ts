import { initializeApp, getApp, getApps } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User 
} from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

// Safely initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request workspace scopes for Calendar, Gmail, Google Classroom, Docs, Sheets, and Drive
provider.addScope("https://www.googleapis.com/auth/calendar");
provider.addScope("https://www.googleapis.com/auth/gmail.send");
provider.addScope("https://www.googleapis.com/auth/classroom.courses.readonly");
provider.addScope("https://www.googleapis.com/auth/classroom.coursework.me.readonly");
provider.addScope("https://www.googleapis.com/auth/documents");
provider.addScope("https://www.googleapis.com/auth/spreadsheets");
provider.addScope("https://www.googleapis.com/auth/drive.file");
provider.addScope("https://www.googleapis.com/auth/drive.readonly");

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      // In a real refresh setting, if we have firebase user but lost accessToken in-memory, 
      // we check if we can retrieve it or show needsAuth.
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // If user is logged in but we didn't capture token (e.g. page reload),
        // we can prompt them to sign in again to capture the token in memory, 
        // which conforms to secure in-memory caching instructions.
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in handler
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to capture access token from Google sign in");
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (err) {
    console.error("Workspace googleSignIn failed:", err);
    throw err;
  } finally {
    isSigningIn = false;
  }
};

// Log out handler
export const logout = async (): Promise<void> => {
  await auth.signOut();
  cachedAccessToken = null;
};

// Get current token safely
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Creates an event on the user's primary Google Calendar 
 */
export const createCalendarEvent = async (
  token: string, 
  title: string, 
  description: string, 
  dueDateStr: string
) => {
  if (!token) throw new Error("No Google authorization token cached in memory.");

  // For a clear timeline, align default time to 9:00 AM UTC on due date of the task
  const formattedDate = dueDateStr.trim();
  const startDateTime = `${formattedDate}T09:00:00Z`;
  const endDateTime = `${formattedDate}T10:00:00Z`;

  const eventPayload = {
    summary: `⏰ Deadline: ${title}`,
    description: description || `Automatically scheduled reminder via Deadline Guardian. Achieve your milestones!`,
    start: {
      dateTime: startDateTime,
      timeZone: "UTC"
    },
    end: {
      dateTime: endDateTime,
      timeZone: "UTC"
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 30 },
        { method: "email", minutes: 120 }
      ]
    }
  };

  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(eventPayload)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Calendar sync failed with status ${res.status}`);
  }

  return await res.json();
};

/**
 * Dispatches a reminder email through Gmail REST API
 */
export const sendGmailReminder = async (
  token: string, 
  toEmail: string, 
  subject: string, 
  htmlBody: string
) => {
  if (!token) throw new Error("No Google authorization token cached in memory.");

  const formattedSubject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const messageLines = [
    `To: ${toEmail}`,
    "Content-Type: text/html; charset=utf-8",
    "MIME-Version: 1.0",
    `Subject: ${formattedSubject}`,
    "",
    htmlBody
  ];

  const rawMessage = messageLines.join("\r\n");
  const base64UrlMessage = btoa(unescape(encodeURIComponent(rawMessage)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const res = await fetch("https://www.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      raw: base64UrlMessage
    })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Gmail delivery failed with status ${res.status}`);
  }

  return await res.json();
};

/**
 * Creates a new Google Doc and writes initial content to it.
 */
export const createGoogleDoc = async (token: string, title: string, content: string): Promise<{ id: string; webViewLink: string; name: string }> => {
  if (!token) throw new Error("No Google authorization token cached in memory.");

  // 1. Create a blank document
  const createRes = await fetch("https://docs.googleapis.com/v1/documents", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ title })
  });

  if (!createRes.ok) {
    const errObj = await createRes.json().catch(() => ({}));
    throw new Error(errObj?.error?.message || `Failed to create Google Doc: ${createRes.status}`);
  }

  const doc = await createRes.json();
  const documentId = doc.documentId;

  // 2. Insert the notes content into the document if provided
  if (content.trim()) {
    const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              text: content,
              location: { index: 1 }
            }
          }
        ]
      })
    });
    if (!updateRes.ok) {
      console.warn("Failed to write initial content to Doc, proceeding anyway", await updateRes.text().catch(() => ""));
    }
  }

  return {
    id: documentId,
    name: title,
    webViewLink: `https://docs.google.com/document/d/${documentId}/edit`
  };
};

/**
 * Creates a new Google Sheet and appends initial row data if provided.
 */
export const createGoogleSheet = async (token: string, title: string, initialRows?: string[][]): Promise<{ id: string; webViewLink: string; name: string }> => {
  if (!token) throw new Error("No Google authorization token cached in memory.");

  // 1. Create a blank spreadsheet
  const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      properties: { title }
    })
  });

  if (!createRes.ok) {
    const errObj = await createRes.json().catch(() => ({}));
    throw new Error(errObj?.error?.message || `Failed to create Google Sheet: ${createRes.status}`);
  }

  const sheet = await createRes.json();
  const spreadsheetId = sheet.spreadsheetId;

  // 2. Append initial rows if provided
  if (initialRows && initialRows.length > 0) {
    const appendRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        values: initialRows
      })
    });
    if (!appendRes.ok) {
      console.warn("Failed to write initial rows to Sheet, proceeding anyway", await appendRes.text().catch(() => ""));
    }
  }

  return {
    id: spreadsheetId,
    name: title,
    webViewLink: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
  };
};

/**
 * Fetches recent Google Docs and Google Sheets from Google Drive
 */
export const listGoogleDocsAndSheets = async (token: string): Promise<any[]> => {
  if (!token) throw new Error("No Google authorization token cached in memory.");

  const q = "mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/vnd.google-apps.spreadsheet'";
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&orderBy=modifiedTime+desc&pageSize=15&fields=files(id,name,mimeType,webViewLink,modifiedTime)`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const errObj = await res.json().catch(() => ({}));
    throw new Error(errObj?.error?.message || `Failed to list Drive files: ${res.status}`);
  }

  const data = await res.json();
  return data.files || [];
};
