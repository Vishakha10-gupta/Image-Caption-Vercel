from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import torch
from transformers import BlipProcessor, BlipForConditionalGeneration
from PIL import Image
import io
import base64
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Image Caption API")

# Enhanced CORS middleware for production
# Get allowed origins from environment variable, fallback to localhost and Vercel
allowed_origins = os.environ.get("ALLOWED_ORIGINS", "").split(",")
if not allowed_origins or allowed_origins == [""]:
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
        "https://*.vercel.app",
        "https://*.vercel.com",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Type", "X-Request-ID"],
    max_age=600,
)

# Global variables for model
processor = None
model = None
device = None

class CaptionRequest(BaseModel):
    image: str  # base64 encoded image
    name: str = "upload.jpg"

def load_model():
    global processor, model, device
    if processor is None or model is None:
        logger.info("Loading BLIP model...")
        try:
            # Use cache directory from environment variable
            cache_dir = os.environ.get("TRANSFORMERS_CACHE", "/tmp/cache")
            os.makedirs(cache_dir, exist_ok=True)
            
            device = "cuda" if torch.cuda.is_available() else "cpu"
            logger.info(f"Using device: {device}")
            
            # Load model with optimizations for deployment
            processor = BlipProcessor.from_pretrained(
                "Salesforce/blip-image-captioning-base",
                cache_dir=cache_dir
            )
            model = BlipForConditionalGeneration.from_pretrained(
                "Salesforce/blip-image-captioning-base",
                cache_dir=cache_dir,
                torch_dtype=torch.float16 if device == "cuda" else torch.float32
            )
            model.to(device)
            model.eval()
            
            # Optimize for inference
            if device == "cuda":
                model = torch.compile(model, mode="reduce-overhead")
            
            logger.info("BLIP model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise
    return processor, model, device

@app.get("/health")
async def health_check():
    return {"status": "healthy", "model_loaded": processor is not None}

@app.post("/api/caption")
async def generate_caption(request: CaptionRequest):
    try:
        # Load model if not loaded
        proc, mod, dev = load_model()
        
        # Decode base64 image
        image_data = base64.b64decode(request.image)
        image = Image.open(io.BytesIO(image_data)).convert('RGB')
        
        # Generate caption with error handling
        inputs = proc(image, return_tensors="pt").to(dev)
        with torch.no_grad():
            out = mod.generate(**inputs, max_length=50, num_beams=4, early_stopping=True)
        caption = proc.decode(out[0], skip_special_tokens=True)
        
        logger.info(f"Generated caption: {caption[:50]}...")
        
        return JSONResponse({
            "caption": caption,
            "source": "blip-model",
            "model": "Salesforce/blip-image-captioning-base"
        })
    except Exception as e:
        logger.error(f"Caption generation failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/caption-upload")
async def generate_caption_upload(file: UploadFile = File(...)):
    try:
        # Load model if not loaded
        proc, mod, dev = load_model()
        
        # Read uploaded file
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data)).convert('RGB')
        
        # Generate caption with error handling
        inputs = proc(image, return_tensors="pt").to(dev)
        with torch.no_grad():
            out = mod.generate(**inputs, max_length=50, num_beams=4, early_stopping=True)
        caption = proc.decode(out[0], skip_special_tokens=True)
        
        logger.info(f"Generated caption for {file.filename}: {caption[:50]}...")
        
        return JSONResponse({
            "caption": caption,
            "source": "blip-model",
            "model": "Salesforce/blip-image-captioning-base",
            "filename": file.filename
        })
    except Exception as e:
        logger.error(f"Caption generation failed for {file.filename}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.on_event("startup")
async def startup_event():
    """Load model on startup to avoid cold start issues"""
    logger.info("Starting up and loading model...")
    try:
        load_model()
        logger.info("Model loaded successfully on startup")
    except Exception as e:
        logger.error(f"Failed to load model on startup: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000)
