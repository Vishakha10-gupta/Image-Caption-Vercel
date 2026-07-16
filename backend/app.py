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

app = FastAPI(title="Image Caption API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
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
        print("Loading BLIP model...")
        device = "cuda" if torch.cuda.is_available() else "cpu"
        processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
        model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")
        model.to(device)
        model.eval()
        print("BLIP model loaded successfully")
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
        
        # Generate caption
        inputs = proc(image, return_tensors="pt").to(dev)
        with torch.no_grad():
            out = mod.generate(**inputs, max_length=50)
        caption = proc.decode(out[0], skip_special_tokens=True)
        
        return JSONResponse({
            "caption": caption,
            "source": "blip-model",
            "model": "Salesforce/blip-image-captioning-base"
        })
    except Exception as e:
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
        
        # Generate caption
        inputs = proc(image, return_tensors="pt").to(dev)
        with torch.no_grad():
            out = mod.generate(**inputs, max_length=50)
        caption = proc.decode(out[0], skip_special_tokens=True)
        
        return JSONResponse({
            "caption": caption,
            "source": "blip-model",
            "model": "Salesforce/blip-image-captioning-base",
            "filename": file.filename
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000)
