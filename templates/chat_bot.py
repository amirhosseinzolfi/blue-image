"""
G4F API Proxy Server using FastAPI

This module provides a FastAPI-based proxy server that interfaces with g4f
to provide OpenAI-compatible API endpoints for the main application.
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import g4f
import uvicorn
import threading
import logging
from typing import List

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("g4f_proxy")

# FastAPI app to proxy g4f via HTTP on port 15206
app = FastAPI(title="G4F Proxy API", version="1.0.0")

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    model: str
    messages: List[Message]
    temperature: float = 0.5

@app.post("/v1/chat/completions")
async def chat_completions(request: ChatRequest):
    """
    Proxy chat completions to g4f with OpenAI-compatible response format
    """
    try:
        logger.info(f"Proxying request to g4f with model: {request.model}")
        
        # Convert messages to g4f format
        g4f_messages = [msg.dict() for msg in request.messages]
        
        # Call g4f
        answer = g4f.ChatCompletion.create(
            model=request.model,
            messages=g4f_messages,
            stream=False,
            temperature=request.temperature
        )
        
        logger.info("Successfully received response from g4f")
        
        # Return OpenAI-compatible response
        return {
            "id": "g4f-generated-response",
            "object": "chat.completion",
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant", 
                    "content": answer
                },
                "finish_reason": "stop"
            }],
            "usage": {
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "total_tokens": 0
            }
        }
        
    except Exception as e:
        logger.error(f"Error proxying to g4f: {str(e)}")
        raise HTTPException(status_code=500, detail=f"G4F Error: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "g4f-proxy"}

def start_g4f_proxy_server():
    """Start the G4F proxy server in a separate thread"""
    try:
        logger.info("Starting G4F Proxy API server on http://localhost:15206")
        uvicorn.run(
            app, 
            host="0.0.0.0", 
            port=15206, 
            log_level="info",
            access_log=False  # Reduce log noise
        )
    except Exception as e:
        logger.error(f"Failed to start G4F proxy server: {e}")

def run_proxy_in_background():
    """Run the proxy server in a background thread"""
    proxy_thread = threading.Thread(
        target=start_g4f_proxy_server,
        daemon=True,
        name="G4F-Proxy-Thread"
    )
    proxy_thread.start()
    logger.info("G4F Proxy server started in background thread")
    return proxy_thread

if __name__ == "__main__":
    # Run directly if executed as main module
    start_g4f_proxy_server()