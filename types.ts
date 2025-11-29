
export interface Profile {
  id: string; // Corresponds to user.id
  student_id: string;
  full_name: string;
  email?: string;
  role: string;
  updated_at?: string | FirestoreTimestamp;
  avatar_url?: string;
  cover_photo_url?: string;
  bio?: string;
  calendar_theme?: string;
  is_online?: boolean;
  last_seen?: FirestoreTimestamp | null;
  last_password_change?: FirestoreTimestamp | null;
  special_password_token?: string | null; // Admin bypass token
  
  // Privacy Settings
  privacy_email?: 'public' | 'friends' | 'only_me';
  privacy_student_id?: 'public' | 'friends' | 'only_me';
  privacy_last_seen?: 'public' | 'friends' | 'only_me';
  calendar_colors?: { [key: string]: any }; // Store custom calendar colors

  // Consent Flags
  terms_accepted_app?: boolean;
  terms_accepted_ai?: boolean;
}

export interface Notification {
  id: string;
  created_at: FirestoreTimestamp;
  user_id: string;
  title: string;
  message?: string;
  is_read: boolean;
  event_id?: string | null;
  notification_type?: string;
}

export interface SearchHistoryItem {
    id: string;
    targetId: string;
    full_name: string;
    avatar_url?: string;
    student_id: string;
    timestamp: FirestoreTimestamp;
}

export interface Event {
  id: string;
  createdAt: FirestoreTimestamp;
  userId: string | null; // null for general/academic events
  title: string;
  description?: string | null;
  eventDate: string; // YYYY-MM-DD string for simple querying
  eventTime?: string | null; // HH:mm
  eventType: string;
  tags?: string[] | null;
  isPublic: boolean;
}

export interface StudentPin {
    pin: string;
    role: string;
    is_registered: boolean;
}

export interface FirestoreTimestamp {
  toDate: () => Date;
}

// Represents a student's specific payment record from the student_funds subcollection
export interface FundCollection {
  id: string;
  collectionName: string;
  amountDue: number;
  paidAmount: number;
  status: 'Paid' | 'Unpaid' | 'Partial';
  deadline: string | null; // YYYY-MM-DD
  lastUpdated: FirestoreTimestamp;
}

// --- Types for UserProfileModal ---

// A simplified user object for the modal
export interface User {
  id: string;
  name: string;
  avatarUrl: string;
}

// Represents a master collection item from the top-level 'collections' collection
export interface Collection {
  id: string;
  name: string;
  amountPerUser: number;
  deadline?: string;
}

// Represents a payment record from the student_funds subcollection, for use in the modal
export interface UserPayment {
  id: string; // The collection ID
  paidAmount: number;
  status: 'Paid' | 'Unpaid' | 'Partial';
  lastUpdated: FirestoreTimestamp; // Firestore Timestamp
}

export interface AttendanceRecord {
    id: string;
    userId: string;
    date: string; // YYYY-MM-DD
    status: 'Present' | 'Absent' | 'Late' | 'Excused';
    markedBy: string; // userId of the monitor
    timestamp: FirestoreTimestamp;
}

export interface Friendship {
    id: string;
    requesterId: string;
    recipientId: string;
    status: 'pending' | 'accepted';
    createdAt: FirestoreTimestamp;
}

export interface ChatMessage {
    id: string;
    text: string;
    senderId: string;
    createdAt: FirestoreTimestamp | null; // Null for optimistic updates
    read?: boolean;
    
    // Reply Context
    replyTo?: {
        id: string;
        text: string;
        senderName: string;
    } | null;
    
    // Reactions: { '👍': ['userId1', 'userId2'], ... }
    reactions?: {
        [emoji: string]: string[];
    };
    
    isEdited?: boolean;
    isDeleted?: boolean;
    originalText?: string; // Stores the very first version of the text before any edits
    isForwarded?: boolean;
}

export interface Post {
    id: string;
    userId: string;
    content: string;
    createdAt: FirestoreTimestamp | null;
    likes: string[]; // Array of user IDs who liked the post (Legacy)
    reactions?: { [emoji: string]: string[] }; // New scalable reactions
    replyCount: number;
    imageUrl?: string; // Optional image attachment for posts
    privacy?: 'public' | 'friends' | 'only_me'; // Default to 'public' if undefined
    allowShare?: boolean; // Controls if the post can be downloaded/shared as an image
}

export interface PostComment {
    id: string;
    postId: string;
    userId: string;
    content: string;
    createdAt: FirestoreTimestamp | null;
    reactions?: { [emoji: string]: string[] };
    parentId?: string | null; // For nested replies
    isDeleted?: boolean;
    isEdited?: boolean;
}
