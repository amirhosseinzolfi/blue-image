"""
Chat and Conversation Management Module using LangChain

This module handles all chat-related functionality including:
- Chat prompt generation using LangChain
- Conversation history management with LangChain Memory
- LLM client initialization with ChatOpenAI
- Session management with ConversationChain
"""

import uuid
import logging
from typing import Dict, List, Any, Optional

# LangChain imports
from langchain_openai import ChatOpenAI
from langchain.schema import SystemMessage, HumanMessage, AIMessage
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationChain
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.messages import BaseMessage

# Chat mode system message
CHAT_MODE_SYSTEM_MESSAGE = """**Optimized Prompt**

You are **PixelPrompt**, an elite AI image-prompt engineer. When a user describes an image, silently analyze their request and reply with **one** fully-formed English sentence that can be pasted straight into a text-to-image model (e.g., Midjourney, Stable Diffusion). Your response must:

1. Capture the core subject and setting in vivid language.
2. Embed stylistic details—art movement or medium, mood, lighting, color palette, composition, perspective, and level of detail.
3. Add optional technical specs (camera/lens settings, rendering engine, resolution, aspect ratio) when they sharpen fidelity.
4. Honor any recurring themes or user preferences from earlier turns.
5. Output **only** the final prompt—no explanations, lists, or meta-comments.

If critical details are missing, ask one concise clarifying question before generating the prompt.
"""

class SessionChatMessageHistory(BaseChatMessageHistory):
    """Custom chat message history implementation for session-based storage"""
    
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.messages: List[BaseMessage] = []
    
    def add_message(self, message: BaseMessage) -> None:
        """Add a message to the store"""
        self.messages.append(message)
    
    def clear(self) -> None:
        """Clear all messages from the store"""
        self.messages = []

class ChatManager:
    """Manages chat sessions using LangChain components"""
    
    def __init__(self):
        self.chat_histories: Dict[str, SessionChatMessageHistory] = {}
        self.conversation_chains: Dict[str, ConversationChain] = {}
        self.max_history_length = 10
        
        # Initialize LangChain ChatOpenAI client
        self.llm = ChatOpenAI(
            base_url="http://localhost:15206/v1",
            model="gemini-1.5-pro",
            temperature=0.5,
            api_key="g4f-api-key"  # Dummy API key for local G4F API
        )
        
        # Create chat prompt template
        self.chat_prompt = ChatPromptTemplate.from_messages([
            ("system", CHAT_MODE_SYSTEM_MESSAGE),
            MessagesPlaceholder(variable_name="history"),
            ("human", "Generate an optimized image prompt based on: {input}")
        ])
        
        self.logger = logging.getLogger("chat")
    
    def get_or_create_session(self, session_id: str = None) -> str:
        """Get existing session or create a new one with LangChain components"""
        if not session_id:
            session_id = str(uuid.uuid4())
        
        if session_id not in self.chat_histories:
            # Create session chat history
            self.chat_histories[session_id] = SessionChatMessageHistory(session_id)
            
            # Create conversation memory with the session history
            memory = ConversationBufferMemory(
                chat_memory=self.chat_histories[session_id],
                memory_key="history",
                return_messages=True,
                max_token_limit=2000  # Limit memory size
            )
            
            # Create conversation chain for this session
            self.conversation_chains[session_id] = ConversationChain(
                llm=self.llm,
                memory=memory,
                prompt=self.chat_prompt,
                verbose=True
            )
            
            self.logger.info(f"Created new LangChain chat session: {session_id[:8]}...")
        
        return session_id
    
    def get_conversation_chain(self, session_id: str) -> ConversationChain:
        """Get the LangChain conversation chain for a session"""
        if session_id not in self.conversation_chains:
            self.get_or_create_session(session_id)
        return self.conversation_chains[session_id]
    
    def get_chat_history_messages(self, session_id: str) -> List[BaseMessage]:
        """Get chat history as LangChain messages"""
        if session_id in self.chat_histories:
            return self.chat_histories[session_id].messages
        return []
    
    def clear_session(self, session_id: str):
        """Clear chat history and conversation chain for a session"""
        if session_id in self.chat_histories:
            self.chat_histories[session_id].clear()
            self.logger.info(f"Cleared LangChain chat session: {session_id[:8]}...")
        
        if session_id in self.conversation_chains:
            # Clear the memory in the conversation chain
            self.conversation_chains[session_id].memory.clear()
    
    def generate_chat_prompt(self, user_input: str, session_id: str) -> str:
        """Generate an optimized prompt using LangChain conversation chain"""
        self.logger.info(f"Generating LangChain chat prompt for session: {session_id[:8]}...")
        
        # Ensure session exists
        session_id = self.get_or_create_session(session_id)
        
        # Get the conversation chain for this session
        conversation = self.get_conversation_chain(session_id)
        
        try:
            # Use LangChain conversation chain to generate response
            response = conversation.predict(input=user_input)
            
            self.logger.info(f"Generated optimized prompt: {response[:50]}...")
            return response.strip()
            
        except Exception as e:
            self.logger.error(f"Error generating LangChain chat prompt: {e}")
            return user_input  # Fallback to original input
    
    def get_session_stats(self, session_id: str) -> Dict[str, Any]:
        """Get statistics about a chat session"""
        messages = self.get_chat_history_messages(session_id)
        
        # Count user and assistant messages separately
        user_messages = [msg for msg in messages if isinstance(msg, HumanMessage)]
        assistant_messages = [msg for msg in messages if isinstance(msg, AIMessage)]
        
        return {
            "session_id": session_id,
            "total_messages": len(messages),
            "user_messages": len(user_messages),
            "assistant_messages": len(assistant_messages),
            "last_message": messages[-1].content if messages else None,
            "conversation_turns": len(user_messages)
        }
    
    def list_active_sessions(self) -> List[str]:
        """Get list of all active session IDs"""
        return list(self.chat_histories.keys())
    
    def get_conversation_summary(self, session_id: str, max_messages: int = 5) -> str:
        """Get a summary of recent conversation for context"""
        messages = self.get_chat_history_messages(session_id)
        
        if not messages:
            return "No conversation history"
        
        # Get recent messages
        recent_messages = messages[-max_messages:]
        
        summary_parts = []
        for msg in recent_messages:
            role = "User" if isinstance(msg, HumanMessage) else "Assistant"
            content = msg.content[:100] + "..." if len(msg.content) > 100 else msg.content
            summary_parts.append(f"{role}: {content}")
        
        return "\n".join(summary_parts)
    
    def export_conversation(self, session_id: str) -> Dict[str, Any]:
        """Export conversation history in a structured format"""
        messages = self.get_chat_history_messages(session_id)
        
        exported_messages = []
        for msg in messages:
            exported_messages.append({
                "type": msg.__class__.__name__,
                "content": msg.content,
                "timestamp": getattr(msg, 'timestamp', None)
            })
        
        return {
            "session_id": session_id,
            "message_count": len(messages),
            "messages": exported_messages,
            "stats": self.get_session_stats(session_id)
        }

# Global chat manager instance
chat_manager = ChatManager()

def get_chat_prompt(user_input: str, session_id: str) -> str:
    """
    Public interface for getting chat prompts using LangChain
    
    Args:
        user_input: User's prompt request
        session_id: Session identifier for conversation context
        
    Returns:
        Optimized image generation prompt
    """
    return chat_manager.generate_chat_prompt(user_input, session_id)

def get_or_create_chat_session(session_id: str = None) -> str:
    """
    Public interface for LangChain session management
    
    Args:
        session_id: Optional existing session ID
        
    Returns:
        Session ID (existing or newly created)
    """
    return chat_manager.get_or_create_session(session_id)

def clear_chat_session(session_id: str):
    """
    Public interface for clearing LangChain chat sessions
    
    Args:
        session_id: Session to clear
    """
    chat_manager.clear_session(session_id)

def get_chat_session_stats(session_id: str) -> Dict[str, Any]:
    """
    Get detailed statistics about a chat session
    
    Args:
        session_id: Session to analyze
        
    Returns:
        Dictionary with session statistics
    """
    return chat_manager.get_session_stats(session_id)

def get_conversation_summary(session_id: str, max_messages: int = 5) -> str:
    """
    Get a summary of recent conversation
    
    Args:
        session_id: Session to summarize
        max_messages: Number of recent messages to include
        
    Returns:
        String summary of recent conversation
    """
    return chat_manager.get_conversation_summary(session_id, max_messages)

def export_chat_session(session_id: str) -> Dict[str, Any]:
    """
    Export complete conversation history
    
    Args:
        session_id: Session to export
        
    Returns:
        Complete conversation data
    """
    return chat_manager.export_conversation(session_id)

def list_active_chat_sessions() -> List[str]:
    """
    Get list of all active chat sessions
    
    Returns:
        List of active session IDs
    """
    return chat_manager.list_active_sessions()
