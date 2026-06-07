import { useState } from 'react'
import './index.css'

// Using Geist font from Google Fonts (loaded via index.html)
const Icons = {
  MessageSquare: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  Users: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Settings: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  Send: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  Plus: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  ChevronLeft: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  ChevronDown: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  Menu: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
}

// Pagination Component
function Pagination({ currentPage, totalPages, onPageChange }) {
  const getVisiblePages = () => {
    const pages = []
    const showEllipsisStart = currentPage > 4
    const showEllipsisEnd = currentPage < totalPages - 3

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (showEllipsisStart) pages.push('...')
      
      const start = showEllipsisStart ? Math.max(2, currentPage - 1) : 2
      const end = showEllipsisEnd ? Math.min(totalPages - 1, currentPage + 1) : totalPages - 1
      
      for (let i = start; i <= end; i++) pages.push(i)
      
      if (showEllipsisEnd) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }

  return (
    <div className="pagination">
      <button
        className="pagination-btn"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Previous page"
      >
        <Icons.ChevronLeft />
      </button>
      
      {getVisiblePages().map((page, index) => (
        page === '...' ? (
          <span key={`ellipsis-${index}`} className="pagination-ellipsis">...</span>
        ) : (
          <button
            key={page}
            className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        )
      ))}
      
      <button
        className="pagination-btn"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Next page"
      >
        <Icons.ChevronRight />
      </button>
    </div>
  )
}

// Chat Bubble Component
function ChatBubble({ message, isUser, timestamp }) {
  const isPointsFormat = Array.isArray(message)
  
  return (
    <div className={`chat-bubble ${isUser ? 'user' : 'assistant'} animate-in`}>
      <div className="sender">{isUser ? 'You' : 'Assistant'}</div>
      
      {isPointsFormat ? (
        <ul className="message-points">
          {message.map((point, index) => (
            <li key={index}>{point}</li>
          ))}
        </ul>
      ) : (
        <div>{message}</div>
      )}
      
      {timestamp && (
        <div className="timestamp">
          {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  )
}

// Chat Input Component
function ChatInput({ onSend, disabled }) {
  const [input, setInput] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (input.trim() && !disabled) {
      onSend(input)
      setInput('')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="chat-input-container">
      <form className="chat-input-wrapper" onSubmit={handleSubmit}>
        <textarea
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          disabled={disabled}
          rows={1}
        />
        <button 
          type="submit" 
          className="btn btn-primary btn-icon"
          disabled={disabled || !input.trim()}
          aria-label="Send message"
        >
          <Icons.Send />
        </button>
      </form>
    </div>
  )
}

// Empty State Component
function EmptyState() {
  return (
    <div className="empty-state">
      <Icons.MessageSquare />
      <h3>Start a conversation</h3>
      <p>Send a message to begin chatting with the assistant</p>
    </div>
  )
}

// Loading Component
function Loading() {
  return (
    <div className="loading">
      <div className="loading-dot"></div>
      <div className="loading-dot"></div>
      <div className="loading-dot"></div>
    </div>
  )
}

// Sidebar Component
function Sidebar({ isOpen, onClose }) {
  const [conversations] = useState([
    { id: 1, title: 'Project setup discussion', preview: 'How do I configure the environment?' },
    { id: 2, title: 'API integration help', preview: 'Need assistance with the endpoints' },
    { id: 3, title: 'Bug in authentication', preview: 'Token refresh not working properly' },
    { id: 4, title: 'Code review request', preview: 'Can you review my pull request?' },
    { id: 5, title: 'Database schema', preview: 'Designing the user table structure' },
  ])
  const [activeNav, setActiveNav] = useState('chats')

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Neural Knights</h2>
            <button className="btn btn-secondary btn-icon" onClick={onClose} aria-label="Close sidebar">
              <Icons.ChevronLeft />
            </button>
          </div>
        </div>
        
        <nav className="sidebar-nav">
          <div 
            className={`nav-item ${activeNav === 'chats' ? 'active' : ''}`}
            onClick={() => setActiveNav('chats')}
          >
            <Icons.MessageSquare />
            <span>Chats</span>
          </div>
          <div 
            className={`nav-item ${activeNav === 'community' ? 'active' : ''}`}
            onClick={() => setActiveNav('community')}
          >
            <Icons.Users />
            <span>Community</span>
          </div>
          <div 
            className={`nav-item ${activeNav === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveNav('settings')}
          >
            <Icons.Settings />
            <span>Settings</span>
          </div>
        </nav>

        {activeNav === 'chats' && (
          <>
            <div className="divider" />
            <div style={{ padding: '0 var(--space-4)' }}>
              <button className="btn btn-primary" style={{ width: '100%' }}>
                <Icons.Plus />
                New Chat
              </button>
            </div>
            <div className="conversation-list">
              {conversations.map((conv) => (
                <div key={conv.id} className="conversation-item">
                  <div className="conversation-title">{conv.title}</div>
                  <div className="conversation-preview">{conv.preview}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </aside>
    </>
  )
}

// Main App Component
function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const messagesPerPage = 10
  
  // Sample conversation data
  const [messages, setMessages] = useState([
    { id: 1, text: ['Authentication module is now working correctly', 'JWT tokens are being validated properly', 'Session management has been implemented'], isUser: false, timestamp: Date.now() - 3600000 },
    { id: 2, text: 'Great! Can you also check the token refresh endpoint?', isUser: true, timestamp: Date.now() - 3000000 },
    { id: 3, text: ['The token refresh endpoint is functional', 'It correctly rotates refresh tokens', 'Old tokens are properly invalidated after use'], isUser: false, timestamp: Date.now() - 2400000 },
    { id: 4, text: 'What about the error handling for expired tokens?', isUser: true, timestamp: Date.now() - 1800000 },
    { id: 5, text: ['Expired tokens now return 401 with clear error messages', 'The client can detect and redirect to login appropriately', 'Logging is in place for security audits'], isUser: false, timestamp: Date.now() - 1200000 },
    { id: 6, text: 'Perfect. Let me review the logs to confirm.', isUser: true, timestamp: Date.now() - 600000 },
  ])

  const [isTyping, setIsTyping] = useState(false)

  // Pagination logic
  const totalPages = Math.ceil(messages.length / messagesPerPage)
  const startIndex = (currentPage - 1) * messagesPerPage
  const endIndex = startIndex + messagesPerPage
  const currentMessages = messages.slice(startIndex, endIndex)

  const handleSendMessage = (text) => {
    const newMessage = {
      id: messages.length + 1,
      text,
      isUser: true,
      timestamp: Date.now()
    }
    setMessages([...messages, newMessage])
    setIsTyping(true)
    
    // Simulate assistant response
    setTimeout(() => {
      const responses = [
        ['Processing your request', 'Analyzing the input', 'Generating response'],
        ['I understand your query', 'Let me provide some guidance', 'Here are the key points'],
        ['That is a good observation', 'I can help with that', 'Consider these suggestions'],
      ]
      const randomResponse = responses[Math.floor(Math.random() * responses.length)]
      
      setMessages(prev => [...prev, {
        id: messages.length + 2,
        text: randomResponse,
        isUser: false,
        timestamp: Date.now()
      }])
      setIsTyping(false)
    }, 2000)
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main className="main-content">
        <header className="header">
          <button 
            className="btn btn-secondary btn-icon" 
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Icons.Menu />
          </button>
          <h1 className="header-title">Chat</h1>
          <div style={{ marginLeft: 'auto' }}>
            <span className="badge badge-accent">Beta</span>
          </div>
        </header>

        <div className="chat-container">
          <div className="chat-messages">
            {messages.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                {currentMessages.map((message) => (
                  <ChatBubble
                    key={message.id}
                    message={message.text}
                    isUser={message.isUser}
                    timestamp={message.timestamp}
                  />
                ))}
                {isTyping && <Loading />}
              </>
            )}
          </div>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}

          <ChatInput 
            onSend={handleSendMessage} 
            disabled={isTyping}
          />
        </div>
      </main>
    </div>
  )
}

export default App
