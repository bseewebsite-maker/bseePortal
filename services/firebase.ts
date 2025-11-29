

// Access the global firebase object attached to window by the script tags in index.html
const firebase = (window as any).firebase;

if (!firebase) {
  throw new Error("Firebase SDK not loaded. Please check your internet connection.");
}

const firebaseConfig = {
  apiKey: "AIzaSyBjHixVe1JVNBlDMUx7yGrU6oXbCXUao5k",
  authDomain: "bseeportal-edbc0.firebaseapp.com",
  projectId: "bseeportal-edbc0",
  storageBucket: "bseeportal-edbc0.appspot.com",
  messagingSenderId: "822482210699",
  appId: "1:822482210699:web:8c7fce026ee1b6d440298e",
  measurementId: "G-2X0CB9Y06N"
};


// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Assign the global firebase object to a module-scoped constant to make it exportable.
const firebaseSdk = firebase;

export const db = firebaseSdk.firestore();
export const firestore = firebaseSdk.firestore;
export { firebaseSdk as firebase };


/*
================================================================================
COMPLETE FIRESTORE SETUP GUIDE:

This guide contains all the necessary steps to configure your Firestore database
for the BseePortal application. Follow these steps carefully to ensure all
features work correctly.

--------------------------------------------------------------------------------
STEP 1: SET YOUR FIRESTORE SECURITY RULES
--------------------------------------------------------------------------------
Go to the "Rules" tab in your Firestore Database section. Delete your current
rules and paste the entire block below. These rules are specifically designed
for this app's features.

-- [ACTION REQUIRED] REPLACE YOUR CURRENT RULES WITH THIS BLOCK --
*/
/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
  
    // WARNING: The rules below use `if true` because this application uses
    // Supabase for authentication, not Firebase Auth. From Firestore's perspective,
    // all users are unauthenticated. The application's security relies on client-side
    // logic to show/hide data. For a production environment, you MUST secure
    // these endpoints, for example by using Firebase Authentication or routing
    // requests through a secure backend that validates the user's session.

    // Open access for student funds and master collections
    match /student_funds/{studentId}/{document=**} {
      allow read: if true;
    }
    match /collections/{collectionId} {
      allow read: if true;
    }

    // Allows the app to sync Supabase profile data to Firestore
    match /profiles/{userId} {
      allow read, write: if true;
    }
    
    // Rules for outbound emails
    match /mail/{mailId} {
        allow create: if true;
        allow read, update, delete: if false;
    }

    // Allows creating, reading, and deleting calendar events.
    match /events/{eventId} {
      allow read, write: if true;
    }
    
    // Allows creating and managing user-specific notifications.
    match /notifications/{notificationId} {
      allow read, write: if true;
    }
    
    // Allows managing daily attendance records.
    match /attendance/{recordId} {
        allow read, write: if true;
    }

    // Allows friends management
    match /friendships/{friendshipId} {
      allow read, write: if true;
    }

    // Allows real-time chat
    match /conversations/{conversationId}/{document=**} {
      allow read, write: if true;
    }

    // Allows AI conversation history
    match /ai_conversations/{userId} {
      allow read, write: if true;
    }

    // Allows public feed posts
    match /posts/{postId} {
      allow read, write: if true;
    }
    
    // Allows comments on posts
    match /comments/{commentId} {
      allow read, write: if true;
    }
  }
}
*/
/*
--------------------------------------------------------------------------------
STEP 2: CREATE FIRESTORE COLLECTIONS & INDEXES
--------------------------------------------------------------------------------
The app requires several collections to be created manually. After creating them,
you MUST also create the indexes.

**IMPORTANT**: When you run the app without the indexes, your browser's
developer console will show an error message with a direct link to create the
missing index in Firebase. **Clicking this link is the easiest way to do it.**

--- A. For the CALENDAR ('events' collection) ---

1.  **Create Collection**:
    - Go to the Firestore "Data" tab.
    - Create a new collection named `events`. You can add a dummy document.

2.  **Create Indexes (Required for Calendar to work)**:
    - You will get an error in the console with a link to create these.
    - **Index #1 (Public Events):**
      - Fields: `isPublic` (Ascending), `eventDate` (Ascending)
    - **Index #2 (Private Events):**
      - Fields: `isPublic` (Ascending), `userId` (Ascending), `eventDate` (Ascending)

--- B. For NOTIFICATIONS ('notifications' collection) ---

1.  **Create Collection**:
    - Create a new collection named `notifications`.

2.  **Create Index**:
    - **Index:**
      - Fields: `user_id` (Ascending), `created_at` (Descending)

--- C. For USER PROFILES ('profiles' collection) ---

1.  **Create Collection**:
    - Create a new collection named `profiles`.

--- D. For ATTENDANCE ('attendance' collection) ---

1.  **Create Collection**:
    - Create a new collection named `attendance`.

2.  **Create Index (Required for Student Attendance View)**:
    - **Index:**
      - Collection ID: `attendance`
      - Fields: `userId` (Ascending), `date` (Descending)

--- E. For FRIENDSHIPS ('friendships' collection) ---

1.  **Create Collection**:
    - Create a new collection named `friendships`.

--- F. For CHAT ('conversations' collection) ---
1. **Create Collection**:
   - Create a new collection named `conversations`.
   - No specific complex index is usually required for the basic chat, as we sort by timestamp inside a document subcollection.

================================================================================
*/