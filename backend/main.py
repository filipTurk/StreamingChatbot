# backend/main.py
import os
import asyncio
import uvicorn
import datetime
import getpass

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

from langchain.chat_models import init_chat_model
from langchain_google_genai import GoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langchain.callbacks import AsyncIteratorCallbackHandler
from langchain.schema import HumanMessage

from pydantic import BaseModel
from typing import AsyncIterable, Awaitable

from google import genai
from google.genai import types
from dotenv import load_dotenv
load_dotenv()

if not os.environ.get("GOOGLE_API_KEY"):
  os.environ["GOOGLE_API_KEY"] = getpass.getpass("Enter API key for Google Gemini: ")

# if not os.environ.get("OPENAI_API_KEY"):
#   os.environ["OPENAI_API_KEY"] = getpass.getpass("Enter API key for OpenAI: ")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

class StreamRequest(BaseModel):
    message: str
    
#-------------------------GENAI version -------------------------
client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
async def stream_gemini_response(prompt: str):
    """
    An async generator function that yields chunks of text from the Gemini API.
    """
    try:
        response_stream = client.models.generate_content_stream(model="gemini-2.5-flash", config=types.GenerateContentConfig(
            system_instruction="You are a cat. Your name is Neko."), contents=[prompt])

        for chunk in response_stream:
            if chunk.text:
                print(datetime.datetime.now(), chunk.text, end="")
                yield chunk.text
                await asyncio.sleep(0.01)
                
    except Exception as e:
        print(f"An error occurred: {e}")
        yield f"Error: Could not get response from Gemini. Details: {e}"

@app.post("/stream-chat-genai/")
async def stream_chat_endpoint(request: StreamRequest):
    """
    FastAPI endpoint that uses the async generator to stream the response.
    """
    return StreamingResponse(
        stream_gemini_response(request.message), 
        media_type="text/plain"
    )

#OpenAI version
async def send_message(message: str) -> AsyncIterable[str]:
    callback = AsyncIteratorCallbackHandler()

    model = ChatOpenAI(
        model="gpt-3.5-turbo",  
        streaming=True,
        verbose=True,
        callbacks=[callback],
        temperature=0.7,
    )

    async def wrap_done(fn: Awaitable, event: asyncio.Event):
        try:
            await fn
        except Exception as e:
            print(f"Caught exception: {e}")
        finally:
            event.set()

    task = asyncio.create_task(wrap_done(
        model.ainvoke([HumanMessage(content=message)]),
        callback.done
    ))

    async for token in callback.aiter():
        yield f"data: {token}\n\n"

    await task

@app.post("/stream-chat-langachain-01")
def stream(request: StreamRequest):
    return StreamingResponse(send_message(request.message), media_type="text/event-stream")

# LANGCHAIN gemini-2.5-flash version
async def send_message_plain_text(content: str) -> AsyncIterable[str]:

    model = GoogleGenerativeAI(
        model="gemini-2.5-flash",
    )

    try:
        async for chunk in model.astream([HumanMessage(content=content)]):
            yield chunk
            
    except Exception as e:
        print(f"Caught exception: {e}")
        yield f"An error occurred on the server: {e}"

@app.post("/stream-chat-langchain-02")
async def stream_chat(request: StreamRequest):
    
    generator = send_message_plain_text(request.message)
    return StreamingResponse(generator, media_type="text/plain")

@app.get("/")
def read_root():
    return {"status": "Backend is running"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
