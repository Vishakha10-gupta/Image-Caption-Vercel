# AI Image Caption Studio

A modern web application for generating descriptive image captions using advanced AI models. The application consists of a React-like frontend and a FastAPI backend powered by the BLIP image captioning model from Salesforce.

## Features

- **AI-Powered Captioning**: Uses state-of-the-art BLIP model for accurate image descriptions
- **Modern UI**: Beautiful glassmorphism design with responsive layout
- **Easy Upload**: Drag-and-drop or browse image upload
- **Multiple Export Options**: Copy caption to clipboard or download as text file
- **Production-Ready**: Configured for deployment on Vercel (frontend) and Railway/Render (backend)

## Architecture

The application is split into two main parts:

- **Frontend**: Static HTML/CSS/JS files deployed on Vercel
- **Backend**: FastAPI server with BLIP ML model deployed on Railway or Render

```
├── frontend/           # Frontend application (Vercel)
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   ├── vercel.json
│   └── .env.example
├── backend/           # Backend API (Railway/Render)
│   ├── app.py
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── railway.toml
│   ├── render.yaml
│   └── .env.example
└── README.md
```

## Local Development

### Prerequisites

- Python 3.11+
- Node.js (optional, for frontend development)
- Git

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the backend server:
```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

The backend will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Update `.env` with your backend URL:
```
VITE_BACKEND_API_URL=http://localhost:8000
```

4. Serve the frontend using any static server:
```bash
# Using Python
python -m http.server 3000

# Using Node.js (if you have http-server installed)
npx http-server -p 3000
```

The frontend will be available at `http://localhost:3000`

## Deployment

### Backend Deployment (Recommended: Railway)

Railway is recommended for the backend as it provides good support for ML workloads with GPU access.

1. **Create a Railway account** at [railway.app](https://railway.app)

2. **Deploy from GitHub**:
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway will automatically detect the Python project

3. **Configure deployment**:
   - Set root directory to `backend`
   - Railway will use the `railway.toml` configuration
   - The app will be deployed automatically

4. **Get your backend URL** from Railway dashboard

### Alternative Backend Deployment (Render)

1. **Create a Render account** at [render.com](https://render.com)

2. **Create a new Web Service**:
   - Connect your GitHub repository
   - Set root directory to `backend`
   - Render will use the `render.yaml` configuration
   - Deploy the service

3. **Get your backend URL** from Render dashboard

### Frontend Deployment (Vercel)

1. **Create a Vercel account** at [vercel.com](https://vercel.com)

2. **Deploy from GitHub**:
   - Click "Add New Project" → "Continue with GitHub"
   - Select your repository
   - Set root directory to `frontend`
   - Vercel will use the `vercel.json` configuration

3. **Configure environment variables**:
   - Add `VITE_BACKEND_API_URL` with your deployed backend URL
   - Example: `https://your-backend.railway.app`

4. **Deploy** - Vercel will build and deploy your frontend

## API Endpoints

### Backend API

- `GET /health` - Health check endpoint
- `POST /api/caption` - Generate caption from base64 image
  ```json
  {
    "image": "base64_encoded_image_string",
    "name": "image.jpg"
  }
  ```
- `POST /api/caption-upload` - Generate caption from file upload

## Technology Stack

### Frontend
- HTML5, CSS3, JavaScript (ES6+)
- Glassmorphism UI design
- Responsive layout

### Backend
- FastAPI - Modern Python web framework
- PyTorch - Deep learning framework
- Transformers - Hugging Face library
- BLIP Model - Salesforce's image captioning model

## Model Information

The backend uses the **BLIP (Bootstrapping Language-Image Pre-training)** model from Salesforce:
- Model: `Salesforce/blip-image-captioning-base`
- Capabilities: Image-to-text generation
- Performance: State-of-the-art image captioning

## Troubleshooting

### Backend Issues

- **Model loading slow**: First load downloads the model (~1GB), subsequent loads are faster
- **Memory errors**: Ensure your deployment has sufficient RAM (Railway offers 512MB-8GB)
- **CORS errors**: The backend has CORS enabled for all origins in development

### Frontend Issues

- **Backend connection failed**: Check that `VITE_BACKEND_API_URL` is correctly set
- **CORS errors**: Ensure your backend allows requests from your frontend domain

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.
