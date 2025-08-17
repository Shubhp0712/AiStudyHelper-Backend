# AI Study Assistant - Backend Server

A powerful backend server for the AI Study Assistant application, providing intelligent tutoring, flashcard generation, quiz creation, and progress tracking capabilities.

## 🚀 Features

### Core Functionality
- **AI-Powered Chat**: Intelligent tutoring using Google's Gemini AI
- **Flashcard Generation**: Automatic flashcard creation from study content
- **Quiz System**: Dynamic quiz generation and management
- **Progress Tracking**: Comprehensive learning analytics and progress monitoring
- **User Authentication**: Secure Firebase-based authentication system
- **Chat History**: Persistent conversation storage and retrieval

### AI Integration
- **Google Gemini AI**: Advanced natural language processing for educational content
- **OpenAI Integration**: Alternative AI model support
- **Intelligent Content Processing**: Smart extraction and organization of study materials

## 🛠️ Technology Stack

- **Runtime**: Node.js with ES6 modules
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Firebase Admin SDK
- **AI Models**: 
  - Google Gemini AI
  - OpenAI GPT
- **Email Service**: Nodemailer
- **HTTP Client**: Axios

## 📁 Project Structure

```
server/
├── config/                 # Configuration files
│   ├── firebase.js        # Firebase admin configuration
│   └── serviceAccountKey.json  # Firebase service account (gitignored)
├── controllers/           # Business logic controllers
│   ├── chatController.js  # Chat and AI interaction logic
│   ├── flashCardController.js  # Flashcard management
│   ├── progressController.js   # Learning progress tracking
│   └── quizController.js  # Quiz generation and management
├── middleware/            # Express middleware
│   ├── authMiddleware.js  # Authentication middleware
│   └── verifyToken.js     # Token verification
├── models/               # Database models
│   ├── Flashcard.js      # Flashcard data model
│   ├── User.js           # User data model
│   └── Quiz.js           # Quiz data model
├── routes/               # API route definitions
│   ├── authRoutes.js     # Authentication routes
│   ├── flashcards.js     # Flashcard CRUD operations
│   ├── chats.js          # Chat and conversation routes
│   ├── otpRoutes.js      # OTP verification routes
│   └── quizzes.js        # Quiz management routes
├── services/             # External service integrations
├── .env                  # Environment variables (gitignored)
├── .gitignore           # Git ignore rules
├── package.json         # Project dependencies
└── server.js            # Main application entry point
```

## 🔧 Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or cloud instance)
- Firebase project with Admin SDK
- Google AI API key
- OpenAI API key (optional)

### Environment Variables
Create a `.env` file in the server root with the following variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/ai-study-assistant
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ai-study-assistant

# AI Services
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-firebase-client-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key\n-----END PRIVATE KEY-----\n"

# Email Configuration (for OTP)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Security
JWT_SECRET=your-jwt-secret-key
CORS_ORIGIN=http://localhost:3000
```

### Firebase Setup
1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Authentication and Firestore
3. Generate a service account key
4. Download `serviceAccountKey.json` and place it in the `config/` directory

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-study-assistant/server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the server**
   ```bash
   # Development
   npm start
   
   # With auto-restart (if nodemon is installed globally)
   npm run dev
   ```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/verify-token` - Token verification

### AI Chat
- `POST /api/ask` - Send question to AI assistant
- `GET /api/chats` - Get user's chat history
- `POST /api/chats` - Save new chat
- `PUT /api/chats/:id` - Update existing chat
- `DELETE /api/chats/:id` - Delete chat

### Flashcards
- `GET /api/flashcards` - Get user's flashcards
- `POST /api/flashcards` - Create new flashcard set
- `PUT /api/flashcards/:id` - Update flashcard
- `DELETE /api/flashcards/:id` - Delete flashcard

### Quizzes
- `GET /api/quizzes` - Get available quizzes
- `POST /api/quizzes` - Create new quiz
- `POST /api/quizzes/generate` - Generate AI-powered quiz
- `GET /api/quizzes/:id` - Get specific quiz
- `POST /api/quizzes/:id/submit` - Submit quiz answers

### Progress Tracking
- `GET /api/progress` - Get user progress analytics
- `POST /api/progress/session` - Log study session
- `GET /api/progress/analytics` - Get detailed analytics

### OTP Services
- `POST /api/otp/send` - Send OTP via email
- `POST /api/otp/verify` - Verify OTP code

## 🔐 Security Features

- **Firebase Authentication**: Secure user authentication and authorization
- **JWT Tokens**: Stateless authentication for API access
- **Input Validation**: Comprehensive request validation and sanitization
- **CORS Protection**: Configured CORS policies for frontend integration
- **Rate Limiting**: API rate limiting to prevent abuse
- **Environment Isolation**: Sensitive data stored in environment variables

## 📊 Database Schema

### User Model
```javascript
{
  uid: String,           // Firebase UID
  email: String,         // User email
  displayName: String,   // User display name
  createdAt: Date,       // Account creation date
  lastLogin: Date,       // Last login timestamp
  preferences: Object    // User preferences
}
```

### Flashcard Model
```javascript
{
  userId: String,        // User ID
  title: String,         // Flashcard set title
  description: String,   // Set description
  flashcards: [{
    question: String,    // Question text
    answer: String,      // Answer text
    difficulty: String   // Easy/Medium/Hard
  }],
  createdAt: Date,       // Creation timestamp
  updatedAt: Date        // Last update timestamp
}
```

### Chat Model
```javascript
{
  userId: String,        // User ID
  title: String,         // Chat title
  messages: [{
    sender: String,      // 'user' or 'ai'
    text: String,        // Message content
    timestamp: Date      // Message timestamp
  }],
  createdAt: Date,       // Chat creation date
  updatedAt: Date        // Last message date
}
```

## 🚦 Development

### Available Scripts
```bash
npm start          # Start the production server
npm test           # Run test suite (to be implemented)
npm run lint       # Code linting (to be implemented)
npm run dev        # Development mode with auto-restart
```

### Development Guidelines
1. Follow ES6+ module syntax
2. Use async/await for asynchronous operations
3. Implement proper error handling
4. Add comprehensive logging
5. Write unit tests for controllers
6. Document API endpoints with JSDoc

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- --grep "flashcard"

# Run tests with coverage
npm run test:coverage
```

## 📈 Performance & Monitoring

- **Database Indexing**: Optimized MongoDB indexes for query performance
- **Caching**: Redis integration for session and query caching
- **Logging**: Comprehensive logging with Winston
- **Monitoring**: Health check endpoints for uptime monitoring

## 🔄 Deployment

### Production Deployment
1. Set `NODE_ENV=production` in environment variables
2. Use PM2 for process management
3. Configure reverse proxy (Nginx)
4. Set up SSL certificates
5. Configure database connection pooling

### Docker Deployment
```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Create a Pull Request

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation wiki

## 🔮 Future Enhancements

- [ ] Real-time collaboration features
- [ ] Advanced analytics dashboard
- [ ] Mobile API optimization
- [ ] Multi-language support
- [ ] Voice interaction capabilities
- [ ] Integration with external learning platforms
- [ ] Advanced quiz types (drag-drop, matching, etc.)
- [ ] Social learning features
- [ ] Offline synchronization

---

Made with ❤️ for enhanced learning experiences
