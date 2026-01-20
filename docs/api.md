# API Documentation

## Base URL
- Production: `https://your-backend-domain.com`
- Development: `http://127.0.0.1:8000`

## Authentication
All API endpoints require authentication via session cookies. To authenticate:

1. Call `POST /auth/login` with username/password to establish a session
2. Include the returned session cookie in subsequent requests
3. Include `X-CSRF-Token` header for state-changing operations

## Endpoints

### Conversations

#### Create Conversation
- **Method**: `POST /conversations`
- **Auth**: Required (session cookie + CSRF token)
- **Purpose**: Create a new conversation

**Request Body**:
```json
{
  "title": "My First Conversation"
}
```

**Response**:
```json
{
  "id": 123,
  "title": "My First Conversation",
  "created_at": "2024-01-15T10:30:00",
  "updated_at": "2024-01-15T10:30:00"
}
```

#### List Conversations
- **Method**: `GET /conversations`
- **Auth**: Required
- **Purpose**: List user's conversations, optionally filtered by search

**Query Parameters**:
- `q` (optional): Search query to filter conversations by title

**Response**:
```json
[
  {
    "id": 123,
    "title": "My First Conversation",
    "created_at": "2024-01-15T10:30:00",
    "updated_at": "2024-01-15T10:30:00"
  }
]
```

#### Get Conversation
- **Method**: `GET /conversations/{conversation_id}`
- **Auth**: Required
- **Purpose**: Get details of a specific conversation

**Response**:
```json
{
  "id": 123,
  "title": "My First Conversation",
  "created_at": "2024-01-15T10:30:00",
  "updated_at": "2024-01-15T10:30:00"
}
```

#### Rename Conversation
- **Method**: `PATCH /conversations/{conversation_id}`
- **Auth**: Required (session cookie + CSRF token)
- **Purpose**: Update conversation title

**Request Body**:
```json
{
  "title": "Updated Conversation Title"
}
```

**Response**:
```json
{
  "message": "Conversation renamed"
}
```

#### Delete Conversation
- **Method**: `DELETE /conversations/{conversation_id}`
- **Auth**: Required (session cookie + CSRF token)
- **Purpose**: Delete a conversation and all its messages

**Response**:
```json
{
  "message": "Conversation deleted"
}
```

### Messages

#### List Messages
- **Method**: `GET /conversations/{conversation_id}/messages`
- **Auth**: Required
- **Purpose**: Get all messages in a conversation

**Response**:
```json
[
  {
    "id": 456,
    "role": "user",
    "content": "Hello, how can you help me?",
    "created_at": "2024-01-15T10:30:00"
  },
  {
    "id": 457,
    "role": "assistant",
    "content": "I can help you with various tasks...",
    "token_usage": {"total_tokens": 150},
    "created_at": "2024-01-15T10:30:05"
  }
]
```

#### Append Message
- **Method**: `POST /conversations/{conversation_id}/messages`
- **Auth**: Required (session cookie + CSRF token)
- **Purpose**: Add a user message to a conversation

**Request Body**:
```json
{
  "content": "Hello, how can you help me today?"
}
```

**Response**:
```json
{
  "message_id": 456,
  "conversation_id": 123
}
```

### Chat

#### Stream Chat
- **Method**: `POST /conversations/{conversation_id}/stream`
- **Auth**: Required
- **Purpose**: Start streaming AI response for a conversation

**Request Body**:
```json
{
  "provider_id": "lmstudio",
  "model": "llama-3.2-3b-instruct",
  "temperature": 0.7,
  "max_tokens": 1000
}
```

**Response**: Server-Sent Events (SSE) stream with events:
- `ping`: Connection heartbeat
- `delta`: Incremental text chunks
- `usage`: Token usage information
- `done`: Stream completion
- `error`: Error information

**SSE Event Format**:
```
event: delta
data: {"generation_id": "uuid", "delta": "Hello"}

event: usage
data: {"generation_id": "uuid", "usage": {"total_tokens": 150}}

event: done
data: {"generation_id": "uuid", "status": "ok"}
```

#### Cancel Generation
- **Method**: `POST /chat/cancel/{generation_id}`
- **Auth**: Required (session cookie + CSRF token)
- **Purpose**: Cancel an active streaming generation

**Response**:
```json
{
  "message": "Generation canceled"
}
```

#### Retry Chat
- **Method**: `POST /chat/retry`
- **Auth**: Required (session cookie + CSRF token)
- **Purpose**: Retry the last user message in a conversation

**Request Body**:
```json
{
  "conversation_id": 123,
  "provider_id": "lmstudio",
  "model": "llama-3.2-3b-instruct",
  "temperature": 0.7,
  "max_tokens": 1000
}
```

**Response**:
```json
{
  "message_id": 458,
  "conversation_id": 123
}
```

### Authentication

#### Login
- **Method**: `POST /auth/login`
- **Auth**: None required
- **Purpose**: Authenticate user and establish session

**Request Body**:
```json
{
  "username": "myusername",
  "password": "mypassword"
}
```

**Response**:
```json
{
  "user": {
    "id": 1,
    "username": "myusername",
    "role": "user"
  },
  "csrf_token": "abc123..."
}
```

#### Logout
- **Method**: `POST /auth/logout`
- **Auth**: Required (session cookie + CSRF token)
- **Purpose**: End user session

**Response**:
```json
{
  "message": "Logged out successfully"
}
```

#### Get Current User
- **Method**: `GET /auth/me`
- **Auth**: Required
- **Purpose**: Get current user information

**Response**:
```json
{
  "user": {
    "id": 1,
    "username": "myusername",
    "role": "user"
  }
}
```

### Admin (Admin role required)

#### Bootstrap Admin
- **Method**: `POST /admin/bootstrap`
- **Auth**: None (requires bootstrap token)
- **Purpose**: Create initial admin user

#### List Users
- **Method**: `GET /admin/users`
- **Auth**: Admin required

#### Create Invite
- **Method**: `POST /admin/invites`
- **Auth**: Admin required (session cookie + CSRF token)

### Providers

#### List Providers
- **Method**: `GET /providers`
- **Auth**: Required
- **Purpose**: Get available LLM providers and their models

### Health

#### Health Check
- **Method**: `GET /health`
- **Auth**: None
- **Purpose**: Check service health

**Response**:
```json
{
  "status": "healthy"
}
```

#### Version
- **Method**: `GET /version`
- **Auth**: None
- **Purpose**: Get service version

**Response**:
```json
{
  "version": "0.1.0"
}